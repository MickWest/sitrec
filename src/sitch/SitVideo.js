import {GlobalURLParams, gui, Sit} from "../Globals";
import {setURLParameters} from "../utils";
import {CNodeVideoWebCodecView} from "../nodes/CNodeVideoWebCodecView";

export const SitVideo = {
    name: "video",
    menuName: "Video Viewer",
    isTextable: false,


    fps: 30,
    frames: 0,
    aFrame: 0,
    bFrame: 0,

    setup: function() {

        this.selectableVideos = {
            "Aguadilla": "../sitrec-videos/public/Aquadilla High Quality Original.mp4",
            "FLIR1": "../sitrec-videos/public/f4-aspect-corrected-242x242-was-242x216.mp4",
            "Gimbal": "../sitrec-videos/public/2 - Gimbal-WMV2PRORES-CROP-428x428.mp4",
            "GofFast": "../sitrec-videos/public/3 - GOFAST CROP HQ - 01.mp4",
            "Chilean": "../sitrec-videos/public/Chilean Navy 13-51-55 from HD 1080p.mp4",
            "Jellyfish": "../sitrec-videos/private/Jellyfish 720p High.mov",
        }

        // the first one to load
        this.file ="Aguadilla"

        let maybeVideo =  GlobalURLParams.get("video")
        if (maybeVideo) {
            maybeVideo = maybeVideo.toLowerCase()
            for (const vid in this.selectableVideos) {
                if (vid.toLowerCase() === maybeVideo) {
                    this.file = vid
                    break;
                }
            }
        } else {
            setURLParameters("&video="+this.file)
        }


        this.VideoNode = new CNodeVideoWebCodecView({id:"video",
                // inputs: {
                //     zoom: new CNodeGUIValue({
                //         value: 100, start: 100, end: 1000, step: 1,
                //         desc: "Video Zoom x"
                //     }, gui)
                // },

                visible: true,
                left: 0, top: 0, width: 1, height: 1,
                draggable: false, resizable: true,
                frames: Sit.frames,
                file: this.selectableVideos[this.file],
                background: "black",
                autoFill: true,
            }
        )




//        addFiltersToVideoNode(this.VideoNode)



        this.loadFile = function() {
            this.VideoNode.requestAndLoadFile()
        }
        gui.add(this, "loadFile").name("Load Video")



        gui.add(this, "file", this.selectableVideos).onChange(file => {
            this.VideoNode.newVideo(file)

            this.file = "error"
            for (const vid in this.selectableVideos) {
                if (this.selectableVideos[vid] === file) {
                    this.file = vid
                    break;
                }
            }

            setURLParameters("&video="+this.file)

        }).name("Preset Video")

    }

}


