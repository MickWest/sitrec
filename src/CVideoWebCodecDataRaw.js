import {FileManager, GlobalDateTimeNode, Globals, infoDiv, Sit} from "./Globals";
import {assert} from "./assert";
import {loadImage, versionString} from "./utils";
import {MP4Demuxer, MP4Source} from "./js/mp4-decode/mp4_demuxer";
import {par} from "./par";
import {isLocal} from "./configUtils";
import {CVideoData} from "./CVideoData";
import {updateSitFrames} from "./UpdateSitFrames";

// New raw version with filtering removed
// and threaded for performance
export class CVideoWebCodecDataRaw extends CVideoData {


    constructor(v, loadedCallback, errorCallback) {
        super(v);


        this.format = ""
        this.error = false;
        this.loaded = false;

        this.incompatible = true;
        try {
            if (VideoDecoder !== undefined) {
                this.incompatible = false;
            }
        } catch (e) {
        }

        if (this.incompatible) {
            console.log("Video Playback Requires up-to-date WebCodec Browser (Chrome/Edge/Safari")
            this.errorImage = null;
            loadImage('./data/images/errorImage.png').then(result => {
                this.errorImage = result;
            })
            return;
        }

        let source = new MP4Source()

        // here v.file, if defined is a file name
        // either a URL or a local file
        // check for local file (i.e. file on the user's computer loaded with a file picker)
        // if it's got no forward slashes, then it's a local file


        // QUESTION: why do we need to use the file manager here?
        // why not load the file directly?
        // ANSWER The file manager does some parsing of the path???

        if (v.file !== undefined ) {
            FileManager.loadAsset(v.file, "video").then(result => {
                // the file.appendBuffer expects an ArrayBuffer with a fileStart value (a byte offset) and
                // and byteLength (total byte length)
                result.parsed.fileStart = 0;        // patch in the fileStart of 0, as this is the whole thing
                this.videoDroppedData = result.parsed;
                source.file.appendBuffer(result.parsed)
                source.file.flush();

                // Remove it from the file manager
                // as we only need it for the initial load
                FileManager.disposeRemove("video");

                loadedCallback();

            })
        } else {

            // Handle drag and drop files
            // v.dropFile is a File object, which comes from DragDropHandler
            if (v.dropFile !== undefined) {
                let reader = new FileReader()
                reader.readAsArrayBuffer(v.dropFile)
                // could maybe do partial loads, but this is local, so it's loading fast
                // however would be a faster start.
                reader.onloadend = () => {
                    // reader.result will be an ArrayBuffer
                    // the file.appendBuffer expects an ArrayBuffer with a fileStart value (a byte offset) and
                    // and byteLength (total byte length)
                    this.videoDroppedData = reader.result;
                    this.videoDroppedURL = null;
                    reader.result.fileStart = 0;        // patch in the fileStart of 0, as this is the whole thing
                    source.file.appendBuffer(reader.result)
                    source.file.flush();
                    loadedCallback();
                }

            }
        }

        let demuxer = new MP4Demuxer(source);
        this.startWithDemuxer(demuxer)

    }

    startWithDemuxer(demuxer) {

        //        let demuxer = new MP4Demuxer(v.file);
        this.frames = 0;

        this.lastGetImageFrame = 0


        this.chunks = [] // per frame chunks
        this.groups = [] // groups for frames+delta

        // if a group is pending, then we don't accept any more requests
        // until that group has finished loading
        // at that point we just request the very last frame that was requestes
        this.groupsPending = 0;
        this.nextRequest = -1


        this.incomingFrame = 0;
        this.lastTimeStamp = -1;


        this.decoder = new VideoDecoder({
            output: videoFrame => {

                this.format = videoFrame.format;


                this.lastDecodeInfo = "last frame.timestamp = " + videoFrame.timestamp + "<br>";
                // first chunk does not always have a 0 timestamp
                //               const frameNumber1 = (frame.timestamp - this.chunks[0].timestamp) / this.chunks[0].duration   // TODO: This ASSUMES that the first chunk duration is the same for all except the last frame
                //var frameNumber = this.incomingFrame++; //NO - as won't work when seeking

                var groupNumber = 0;
                // find the group this frame is in
                // will be the group before the first group that starts after this frame
                // OR the last group (no next group to check)
                while (groupNumber + 1 < this.groups.length && videoFrame.timestamp >= this.groups[groupNumber + 1].timestamp)
                    groupNumber++;
                var group = this.groups[groupNumber]

                // calculate the frame number we are decoding from how many are left
                const frameNumber = group.frame + group.length - group.pending;
//                console.log(frameNumber+ " Timestamp: "+frame.timestamp)
                createImageBitmap(videoFrame).then(image => {
                    this.imageCache[frameNumber] = image
                    this.width = image.width;
                    this.height = image.height;
                    if (this.c_tmp === undefined) {
                        this.c_tmp = document.createElement("canvas")
                        this.c_tmp.setAttribute("width", this.width)
                        this.c_tmp.setAttribute("height", this.height)
                        this.ctx_tmp = this.c_tmp.getContext("2d")
                    }


                    // if it's the last one we wanted, then tell the system to render a frame
                    // so we update the video display
                    if (frameNumber === this.lastGetImageFrame) {
                        par.renderOne = true;
                    }

                    const group = this.getGroup(frameNumber);

                    assert(group.decodeOrder !== undefined, "Missing decode order, maybe different group for frame: " + frameNumber
                        + " timestamp =" + videoFrame.timestamp + " group.frame = " + group.frame + " group.length = " + group.length)

                    if (group.decodeOrder !== undefined)
                        group.decodeOrder.push(frameNumber)


                    assert(group.pending > 0, "Decoding more frames than were listed as pending at frame " + frameNumber
                        + " timestamp =" + videoFrame.timestamp + " group.frame = " + group.frame + " group.length = " + group.length)


                    if (group.pending <= 0) {
                        let framesDecoded = "";
                        for (let i in group.decodeOrder) {
                            framesDecoded += group.decodeOrder[i] + ", "
                        }
                        //                       console.log(framesDecoded)
                    }

                    group.pending--;
                    if (group.pending == 0) {
                        // this one group has finished loading
                        //                  console.log("finished loading group at frame "+ group.frame)
                        group.loaded = true;
                        this.groupsPending--; // count one less group pending
                        if (this.groupsPending === 0 && this.nextRequest >= 0) {
                            console.log("FULFILLING deferred request as no groups pending , frame = " + this.nextRequest)
                            this.requestGroup(this.nextRequest)
                            this.nextRequest = -1
                        }

//                        console.log("Done group " + frameNumber
//                            + " timestamp =" + frame.timestamp + " group.frame = " + group.frame
//                            + " group.length = " + group.length + " this.groupsPending =  " + this.groupsPending)

                    }

//                     if (this.decoder.decodeQueueSize === 0) {
//                         if (this.nextRequest >= 0) {
// //                            console.log("FULFILLING deferred request asthis.decoder.decodeQueueSize === 0, frame = " + this.nextRequest)
//                             this.requestFrame(this.nextRequest)
//                             this.nextRequest = -1
//                         }
//                     }

                    videoFrame.close();

                })

            },
            error: e => console.error(e),
        });

        this.demuxFrame = 0;

        demuxer.getConfig().then((config) => {
//            offscreen.height = config.codedHeight;
//            offscreen.width = config.codedWidth;

            this.config = config;

            this.decoder.configure(config);
            demuxer.start((chunk) => {
                // The demuxer will call this for each chunk it demuxes
                // essentiall it's iterating through the frames
                // each chunk is either a key frame or a delta frame
                chunk.frameNumber = this.demuxFrame++
                this.chunks.push(chunk)

                if (chunk.type === "key") {
                    this.groups.push({
                            frame: this.chunks.length - 1,  // first frame of this group
                            length: 1,                      // for now, increase with each delta demuxed
                            pending: 0,                     // how many frames requested and pending
                            loaded: false,                  // set when all the frames in the group are loaded
                            timestamp: chunk.timestamp,
                        }
                    )
                } else {
                    const lastGroup = this.groups[this.groups.length - 1]
                    assert(chunk.timestamp >= lastGroup.timestamp, "out of group chunk timestamp")
                    lastGroup.length++;
                }

                // console.log(this.chunks.length - 1 + ": Demuxer got a " + chunk.type + " chunk, timestamp=" + chunk.timestamp +
                //      ", duration = " + chunk.duration + ", byteLength = " + chunk.byteLength)

                this.frames++;
                Sit.videoFrames = this.frames * this.videoSpeed;
                // Sit.aFrame = 0;
                // Sit.bFrame = Sit.videoFrames-1;

                // decoding is now deferred
                //            decoder.decode(chunk);
            })
            // at this point demuxing should be done, so we should have an accurate frame count
            // note, that's only true if we are not loading the video async
            // (i.e. the entire video is loaded before we start decoding)
            console.log("Demuxing done (assuming not async loading), frames = " + this.frames + ", Sit.videoFrames = " + Sit.videoFrames)
            console.log("Demuxer calculated frames as " + demuxer.source.totalFrames)
            //assert(this.frames === demuxer.source.totalFrames, "Frames mismatch between demuxer and decoder"+this.frames+"!="+demuxer.source.totalFrames)

            // use the demuxer frame count, as it's more accurate
            Sit.videoFrames = demuxer.source.totalFrames * this.videoSpeed;

            // also update the fps
            Sit.fps = demuxer.source.fps;

            updateSitFrames()
        });

    }


    // find the group object for a given frame
    getGroup(frame) {
        for (let g = 0; g < this.groups.length; g++) {
            const group = this.groups[g]
            if (frame >= group.frame && frame < (group.frame + group.length)) {
                return group;
            }
        }
        const last = this.groups[this.groups.length - 1];
        assert(last != undefined, "last groups is undefined, I've loaded " + this.groups.length)
        console.warn("Last frame = " + last.frame + ", length = " + last.length + ", i.e. up to " + (last.frame + last.length - 1))
        //assert(0,"group not found for frame "+frame)
        return null;
    }

    getGroupsBetween(start, end) {
        // find the group object for a given frame
        const groups = []
        for (let g = 0; g < this.groups.length; g++) {
            const group = this.groups[g]
            if (group.frame + group.length >= start && group.frame < end) {
                groups.push(group);
            }
        }
        return groups;
    }


    // request that a frame be loaded
    // which currently means finding what group the frame is in, and then loading that
    requestFrame(frame) {

        if (frame > Sit.videoFrames - 1) frame = Sit.videoFrames - 1;
        if (frame < 0) frame = 0

        // if it's already loading, then we are good, don't need to do anything with this request
        const group = this.getGroup(frame);
        assert(group !== null, "group not found for frame " + frame)
        this.requestGroup(group);
    }

    requestGroup(group) {
        // make sure it's an object
        assert(typeof group === "object", "requestGroup: group is not an object, but a " + typeof group)

        if (group.loaded || group.pending > 0)
            return;

//        console.log("requestFrame " + frame +" group.loaded = " + group.loaded + " group.pending = " + group.pending)


        // if some OTHER group is currently pending, then we just store the request for when it has finished
        // note this does not queue the requests, so only the most recent one will be honored
//        if (this.groupsPending > 0) {
        if (this.decoder.decodeQueueSize > 0) {
            //assert(this.nextRequest === -1 || this.nextRequest === group, "nextRequest should be -1 or same as group , but is " + this.nextRequest)
            this.nextRequest = group;
            return;
        }

        group.pending = group.length;
        group.loaded = false;
        group.decodeOrder = []
        this.groupsPending++;
        const decodeQueueSizeBefore = this.decoder.decodeQueueSize;
        for (let i = group.frame; i < group.frame + group.length; i++) {
            this.decoder.decode(this.chunks[i])
        }
        const addedToDecodeQueue = this.decoder.decodeQueueSize - decodeQueueSizeBefore

        // Kick the reorder buffer so the tail frames are delivered.
        this.decoder.flush().catch(()=>{ /* ignore mid-seek aborts */ });

//        console.log ("decodeQueuesize = "+this.decoder.decodeQueueSize+" added "+addedToDecodeQueue)
    }

    purgeGroupsExcept(keep) {
        let numPending = 0;
        for (let g in this.groups) {
            const group = this.groups[g]
            if (group.pending > 0)
                numPending++;
            if (keep.find(keeper => keeper === group) === undefined && group.loaded) {
//                console.log("Purging group at frame "+group.frame+" group pending = "+group.pending)
                for (let i = group.frame + 1; i < group.frame + group.length; i++) {
                    // release all the frames in this group
                    this.imageCache[i] = new Image()    // TODO, maybe better as null, but other code expect an empty Image when not loaded
                    this.imageDataCache[i] = undefined;      // the imageData versions used for filtering
                    this.frameCache[i] = undefined;          // the imageData versions used for filtering
                }
                group.loaded = false;
            }
        }
        if (numPending > 0) {
//            console.log("numPending = " + numPending + " this.groupsPending = " + this.groupsPending)
        }
    }

    debugVideo() {
        let d = "";

        if (this.config !== undefined) {


            d += "Config: Codec: " + this.config.codec + "  format:" + this.format + " " + this.config.codedWidth + "x" + this.config.codedHeight + "<br>"
            d += "CVideoView: " + this.width + "x" + this.height + "<br>"
            d += "par.frame = " + par.frame + ", Sit.frames = " + Sit.frames + ", chunks = " + this.chunks.length + "<br>"
            d += this.lastDecodeInfo;
            d += "Decode Queue Size = " + this.decoder.decodeQueueSize + " State = " + this.decoder.state + "<br>";


            for (let _g in this.groups) {
                const g = this.groups[_g];


                // count how many images and imageDatas we have
                var images = 0;
                var imageDatas = 0
                var framesCaches = 0
                for (var i = g.frame; i < g.frame + g.length; i++) {
                    if (this.imageCache[i] != undefined && this.imageCache[i].width != 0)
                        images++
                    if (this.imageDataCache[i] != undefined && this.imageDataCache[i].width != 0)
                        imageDatas++
                    if (this.frameCache[i] != undefined)
                        framesCaches++
                }

                const currentGroup = this.getGroup(par.frame)


                d += "Group " + _g + " f = " + g.frame + " l = " + g.length + " ts = " + g.timestamp
                    + " i = " + images + " id = " + imageDatas + " fc = "
                    + framesCaches
                    + (g.loaded ? " Loaded " : "")
                    + (currentGroup === g ? "*" : " ")
                    + (g.pending ? "pending = " + g.pending : "")
                    + "<br>"


            }


        }

        infoDiv.style.display = 'block';
        infoDiv.style.fontSize = "13px"
        infoDiv.style.zIndex = '1001';
        infoDiv.innerHTML = d
    }

    getImage(frame) {

        frame = Math.floor(frame / this.videoSpeed); // videoSpeed will normally be 1, but for timelapse will be


        if (this.incompatible) {
            // incompatible browser (i.e. does not support WebCodec)
            return this.errorImage
        } else {

            // if not loaded any groups yet, then don't try to render anything
            if (this.groups.length === 0)
                return null;

            let cacheWindow = 30; // how much we seek ahead (and keep behind)
            const mem = navigator.deviceMemory
            if (mem !== undefined && mem >= 8) {
                // 8GB or more, then we can afford to cache more
                cacheWindow = 100;

                // PATCH - if we are local, or Mick, then then we can afford to cache even more
                // TODO - allow the user to select this window size in some per-user setting
                if (isLocal || Globals.userID === 1) {
                    cacheWindow = 300;
                }
            }


            this.requestFrame(frame) // request this frame, of course, probable already have it though.

             // if (frame >= this.lastGetImageFrame) {
             //     // going forward
             //    if (frame + cacheWindow < this.chunks.length)
             //         this.requestFrame(frame + cacheWindow)
             // } else {
             //     // going backward
             //     if (frame > cacheWindow)
             //         this.requestFrame(frame - cacheWindow)
             // }



            this.lastGetImageFrame = frame

            // we purge everything except the three proximate groups and any groups that are being decoded
            // in theory this should be no more that four
            // purge before a new request
            const groupsToKeep = [];

            // iteratere through the groups
            // and keep the ones that overlap the range
            // frame to frame + cacheWindow (So we get the next group if we are going forward)
            for (let g in this.groups) {
                const group = this.groups[g]
                if (group.frame + group.length > frame && group.frame < frame + cacheWindow) {
                    groupsToKeep.push(group);
                }
            }

            // then frame - cacheWindow to frame, and iterate g backwards so we get the closest first
            for (let g = this.groups.length - 1; g >= 0; g--) {
                const group = this.groups[g]
                if (group.frame + group.length > frame - cacheWindow && group.frame < frame) {
                    groupsToKeep.push(group);
                }
            }

            // request them all, will ignore if already loaded or pending
            for (let g in groupsToKeep) {
                this.requestGroup(groupsToKeep[g])
            }

            // purge all the other groups
            this.purgeGroupsExcept(groupsToKeep)

            // return the closest frame that has been loaded
            // usually this just mean it returns the one indicated by "frame"
            // but if we've rapidly scrubbed then we might not have this frame
            // Note when purging we currently don't removed the key frames
            // so we'll have a sparsely populated set of frames for scrubbing
            let A = frame;
            let B = frame;
            let bestFrame = frame;
            while (A >= 0 && B < this.chunks.length) {
                if (A >= 0) {
                    if (this.imageCache[A] !== undefined && this.imageCache[A].width !== 0) {
                        bestFrame = A;
                        break;
                        //return this.imageCache[A];
                    }
                    A--
                }
                if (B < this.chunks.length) {
                    if (this.imageCache[B] !== undefined && this.imageCache[B].width !== 0) {
                        bestFrame = B;
                        break;
                        //    return this.imageCache[B];
                    }
                    B++
                }
            }

            let image = this.imageCache[bestFrame]
            return image;


            // return super.getImage(frame)
        }

    }



    update() {
        super.update()
        if (this.incompatible) return;

        // TODO - seems like this should be simpler
        // note this just ensure ONE MORE group will be loaded
        // as update is not called when not rendering
        // but it seems to work
        for (let g in this.groups) {
            const group = this.groups[g]
            if (group.pending > 0)
                par.renderOne = true;
        }

        // if we've decoded all the frames, then make sure they get to where they are going
        // if (this.decoder.decodeQueueSize === 0 && this.decoder.state !== "unconfigured")
        //     this.decoder.flush()

        if (isLocal) {
            // this.debugVideo()
        }
    }

    dispose() {
        if (this.decoder) {
            // flush is asynchronous, so we need to wait for it to finish
            // before we close the decoder
            // we create a local variable to avoid the "this" context changing
            const decoder = this.decoder;
            decoder.flush()
                .catch(() => {})   // swallow any flush errors we don't care about
                .finally(() => decoder.close());
        }
        super.dispose();

        delete Sit.videoFile;
        delete Sit.videoFrames;
    }

    stopStreaming() {
        super.stopStreaming()
    }

}
