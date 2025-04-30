// loading and storing video frames
import {CNodeViewCanvas2D} from "./CNodeViewCanvas";
import {par} from "../par";
import {quickToggle} from "../KeyBoardHandler";
import {CNodeGUIValue} from "./CNodeGUIValue";
import {guiTweaks} from "../Globals";
import {versionString} from "../utils";
import {CMouseHandler} from "../CMouseHandler";
import {assert} from "../assert";

// TODO: make a better base class for video data, probably can remove the tiny stuff?
//     we want to have a CVideoImageData class that loads images and pretends to be a video
// and then the same generic View class should work for both
// why is there a special view class for the Codec, Should more of that be in the data class?
//     maybe ask AI to do this with a working set of files.

export class CVideoData {
    constructor(v) {
        this.percentLoaded = 0;

        this.frames = v.frames

        this.videoSpeed = v.videoSpeed ?? 1 // what speed the original video was

        // increase the number of frames
        // to account for original speed
        // e.g. if video was 10x timelapse, then we need 10x the virtual frames
        // to play back in real time
        this.frames *= this.videoSpeed;

        // just give some defaults. actual images will override
        this.width = 100
        this.height = 100

        this.flushEntireCache();

    }

    // virtual functions
    getImage(frame) {
        assert(0, "CVideoData: getImage: not implemented")
        return null;
    }

    update() {
        // nothing to do here
    }

    flushEntireCache() {
        this.startedLoadingTiny = false;
        this.startedLoadingFull = false;

        this.imageCacheTiny = [] // optional small versions
        this.imageCache = [] // full sized images
        this.imageDataCache=[]
        this.frameCache=[]

        for (let i = 0; i < this.frames; i++) {
            this.imageCacheTiny.push(new Image())
            this.imageCache.push(new Image())
            this.imageDataCache.push(null)
        }

    }

}


export class CFramesVideoData extends CVideoData {
    constructor(v) {
        super(v)

        this.tinyName = v.tinyName;
        this.fullName = v.fullName;
    }

    update() {
        // calculate the loaded percentage
        let count = 0;
        for (let f=0; f<this.frames; f++) {
            if (this.imageCache[f] !== undefined && this.imageCache[f] !== null && this.imageCache[f].width > 0) {
                count++;

                this.width = this.imageCache[f].width
                this.height = this.imageCache[f].height
            }
        }
        this.videoPercentLoaded = Math.floor(100*count/this.frames);


        if (!this.startedLoadingTiny && this.tinyName !== undefined) {
            this.startedLoadingTiny = true

            for (let i = 0; i < this.frames; i++) {
                this.imageCacheTiny[i].src = this.tinyName(i) + "?v=1" + versionString
            }
        }

        if (!this.startedLoadingFull) {

            // see if waiting for tiny
            if (this.tinyName !== undefined) {
                let count = 0;
                for (let f = 0; f < this.frames; f++) {
                    if (this.imageCacheTiny[f].width > 0) {
                        count++;
                    }
                }
                if (count === this.frames) {
                    this.startedLoadingFull = true;
                }
            } else {
                this.startedLoadingFull = true;
            }

            if (this.startedLoadingFull) {
                for (let i = 0; i < this.frames; i++) {
                    this.imageCache[i].src = this.fullName(i) + "?v=1" + versionString
                }
            }
        }
    }

    getImage(frame) {
        let image = this.imageCache[frame];

        if ((image == undefined || image.width == 0) && this.tinyName !== undefined )
            image = this.imageCacheTiny[frame];
        if (image === undefined || image.width === 0)
            image = null;
        return image;
    }

}


export class CNodeVideoView extends CNodeViewCanvas2D {
    constructor(v) {
        super(v);
        // this.canvas.addEventListener( 'wheel', e => this.handleMouseWheel(e) );

        // these no longer work with the new rendering pipeline
        // TODO: reimplement them as effects?
        // this.optionalInputs(["brightness", "contrast", "blur", "greyscale"])
        //
        // if (this.overlayView !== undefined)
        //     addFiltersToVideoNode(this)

        this.positioned = false;
        this.autoFill = v.autoFill ?? true; // default to autofill
        this.shiftDrag = true;

        this.imageWidth = 0;
        this.imageHeight = 0;
        this.scrubFrame = 0; // storing fractiona accumulation of frames while scrubbing

        this.autoClear = (v.autoClear !== undefined)? v.autoClear : false;

        this.mouse = new CMouseHandler(this, {

            wheel: (e) => {

//                console.log(e.deltaY)
                var scale = 0.90;
                if (e.deltaY > 0) {
//                    this.in.zoom.value *= 0.6666
                } else {
//                    this.in.zoom.value *= 1 / 0.6666
                    scale = 1 / scale
                }

                this.zoomView(scale)

            },

            drag: (e) => {
                const moveX = this.mouse.dx / this.widthPx; // px = mouse move as a fraction of the screen width
                const moveY = this.mouse.dy / this.widthPx
                this.posLeft += moveX
                this.posRight += moveX
                this.posTop += moveY
                this.posBot += moveY

            },


            rightDrag: (e) => {
                this.scrubFrame += this.mouse.dx / 4
                if (this.scrubFrame >= 1.0 || this.scrubFrame <= -1.0) {
                    const whole = Math.floor(this.scrubFrame)
                    par.frame += whole
                    this.scrubFrame -= whole;
                }

                par.renderOne = true;
            },


            centerDrag: (e) => {
                this.zoomView(100/(100-this.mouse.dx))
            },

            dblClick: (e) => {
                this.defaultPosition();
            }

        })
    }

    toSerializeCNodeVideoView = ["posLeft", "posRight", "posTop", "posBot"]

    modSerialize() {
            return {
                ...super.modSerialize(),
                ...this.simpleSerialize(this.toSerializeCNodeVideoView)

            }
    }

    modDeserialize(v) {
        super.modDeserialize(v)
        this.simpleDeserialize(v, this.toSerializeCNodeVideoView)
        this.positioned = true;
    }

    renderCanvas(frame = 0) {
        super.renderCanvas(frame); // needed for setting window size

        if (!this.visible) return;

        // if no video file, this is just a drop target for now
        if (!this.Video) return;
        this.Video.update()
        const image = this.Video.getImage(frame);
        if (image) {

            const ctx = this.canvas.getContext("2d");

           //  ctx.fillstyle = "#FF00FFFF"
           //  ctx.fillRect(0, 0, this.canvas.width/3, this.canvas.height);

            // image width might change, for example, with the tiny images used by the old Gimbal video
            if (this.imageWidth !== image.width) {
                console.log("Image width changed from " + this.imageWidth + " to " + image.width)
                this.imageWidth = image.width;
                this.imageHeight = image.height;
            }

            if (!this.positioned) {
                this.defaultPosition()
            }
            // positions are a PERCENTAGE OF THE WIDTH

            if (quickToggle("Smooth", false, guiTweaks) === false)
                ctx.imageSmoothingEnabled = false;

                var filter = ''
                if (this.in.contrast){
                    filter += "contrast("+this.in.contrast.v0+") "
                }
                if (this.in.brightness){
                    filter += "brightness("+this.in.brightness.v0+") "
                }
                if (this.in.blur && this.in.blur.v0 !== 0){
                 filter += "blur("+this.in.blur.v0+"px) "
                }

            if (filter != "") ctx.filter = filter;

            const sourceW = this.imageWidth;
            const sourceH = this.imageHeight
            // rendering fill the view in at least one direction
            const aspectSource = sourceW / sourceH
            const aspectView = this.widthPx / this.heightPx


            // TODO - combine this zoom input with the mouse zoom
            if (this.in.zoom != undefined) {
                const zoom = this.in.zoom.v0 / 100;
                const offsetW = (sourceW - sourceW / zoom) / 2;
                const offsetH = (sourceH - sourceH / zoom) / 2;


                if (aspectSource > aspectView) {
                    // Source is WIDER than the view, so we scale to fit width
                    // and adjust from top

                    ctx.drawImage(image,
                        offsetW, offsetH, sourceW / zoom, sourceH / zoom,
                        0, (this.heightPx - this.widthPx / aspectSource) / 2, this.widthPx, this.widthPx / aspectSource)

                } else {
                    // Source is TALLER than the view, so we scale to fit height
                    // and adjust from left

                    ctx.drawImage(image,
                        offsetW, offsetH, sourceW / zoom, sourceH / zoom,
                        (this.widthPx - this.heightPx * aspectSource) / 2, 0, this.heightPx * aspectSource, this.heightPx)

                }
            } else {
                // Here the zoom is being controlled by zoomView
                // which zooming in and out around the mouse
                ctx.drawImage(image,
                    0, 0, this.imageWidth, this.imageHeight,
                    this.widthPx*(0.5+this.posLeft), this.heightPx*0.5+this.widthPx*this.posTop,
                    this.widthPx*(this.posRight-this.posLeft), this.widthPx*(this.posBot-this.posTop))
                ctx.imageSmoothingEnabled = true;

            }


            ctx.filter = '';


        }
    }


    // so we need to account for the mouse position, in this fractional system
    zoomView(scale) {
        var offX = (this.mouse.anchorX - this.widthPx / 2) / this.widthPx;
        var offY = (this.mouse.anchorY - this.heightPx / 2) / this.widthPx;

        this.posLeft -= offX;
        this.posRight -= offX;
        this.posTop -= offY;
        this.posBot -= offY;

        this.posLeft *= scale;
        this.posRight *= scale;
        this.posTop *= scale;
        this.posBot *= scale;

        this.posLeft += offX;
        this.posRight += offX;
        this.posTop += offY;
        this.posBot += offY;

        par.renderOne = true;
    }

    defaultPosition() {
        const sourceW = this.imageWidth;
        const sourceH = this.imageHeight
        // rendering fill the view in at least one direction
        const aspectSource = sourceW / sourceH
        const aspectView = this.widthPx / this.heightPx

        if (aspectSource > aspectView) {
            // fill for width
            this.posLeft = -0.5;
            this.posTop = this.posLeft / aspectSource;
        } else {
            // fill to height
            //this.posTop = -0.5;
            //this.posLeft = -0.5*sourceW/sourceH;

            // we want to distance to the top as a percentage of the width
            this.posTop = -0.5 / aspectView

            this.posLeft = this.posTop * aspectSource;

        }
        this.posRight = -this.posLeft;
        this.posBot = -this.posTop;
        this.positioned = true;
        par.renderOne = true;
    }

}

export class CNodeMirrorVideoView extends CNodeVideoView {
    constructor(v) {
        super(v);
        this.input("mirror")

        // a mirror video just shows the same frames as another video view
        // so we are just reusing the data, and should not have to recalculate anything.

        this.Video = this.in.mirror.Video;
    }

    // update just checks to see if the video has changed
    // use the new video if it has
    update() {
        if (this.in.mirror.Video !== this.Video) {
            this.Video = this.in.mirror.Video;
        }
    }
}


export function addFiltersToVideoNode(videoNode) {
    videoNode.addMoreInputs({
        brightness: new CNodeGUIValue({id: videoNode.id+"videoBrightness", value: 1, start: 0, end: 5, step: 0.01, desc: "Brightness"}, guiTweaks),
        contrast: new CNodeGUIValue({id: videoNode.id+"videoContrast", value: 1, start: 0, end: 5, step: 0.01, desc: "Contrast"}, guiTweaks),
        blur: new CNodeGUIValue({id: videoNode.id+"videoBlur", value: 0, start: 0, end: 20, step: 1, desc: "Blur Px"}, guiTweaks),
    });

    const reset = {
        resetFilters: () => {
            videoNode.inputs.brightness.value = 1;
            videoNode.inputs.contrast.value = 1;
            videoNode.inputs.blur.value = 0;
            par.renderOne = true;
        }
    }

    guiTweaks.add(reset, "resetFilters").name("Reset Filters")
}