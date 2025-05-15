// loading and storing video frames
import {CNodeViewCanvas2D} from "./CNodeViewCanvas";
import {par} from "../par";
import {quickToggle} from "../KeyBoardHandler";
import {CNodeGUIValue} from "./CNodeGUIValue";
import {guiTweaks, Sit} from "../Globals";
import {CMouseHandler} from "../CMouseHandler";
import {CNodeViewUI} from "./CNodeViewUI";
import {CVideoWebCodecDataRaw} from "../CVideoWebCodecDataRaw";
import {CVideoImageData} from "../CVideoImageData";


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

        this.input("zoom", true); // zoom input is optional


        this.setupMouseHandler();

        // if it's an overlay view then we don't need to add the overlay UI view
        if (!v.overlayView) {
            // Add an overlay view to show status (mostly errors)
            this.overlay = new CNodeViewUI({id: this.id+"_videoOverlay", overlayView: this})
            this.overlay.ignoreMouseEvents();
        }

        v.id = v.id + "_data"

        if (v.file !== undefined) {
            this.newVideo(v.file, false); // don't clear Sit.frames as legacy code sets it when passing in a video filename this way
        }


    }

    newVideo(fileName, clearFrames = true) {
        if (clearFrames) {
            Sit.frames = undefined; // need to recalculate this
        }
        this.fileName = fileName;
        this.disposeVideoData()
        this.videoData = new CVideoWebCodecDataRaw({id: this.id + "_data", file: fileName},
            this.loadedCallback.bind(this), this.errorCallback.bind(this))
        this.positioned = false;
        par.frame = 0;
        par.paused = false; // unpause, otherwise we see nothing.
        this.addLoadingMessage()
        this.addDownloadButton()


    }

    addLoadingMessage() {
        if (this.overlay)
            this.overlay.addText("videoLoading", "LOADING", 50, 50, 5, "#f0f000")
    }


    removeText() {
        if (this.overlay) {
            this.overlay.removeText("videoLoading")
            this.overlay.removeText("videoError")
            this.overlay.removeText("videoErrorName")
            this.overlay.removeText("videoNo")
        }
    }


    stopStreaming() {
        this.removeText()
        par.frame = 0
        par.paused = false;
        if (this.videoData) {
            this.videoData.stopStreaming()
        }
        this.positioned = false;
    }



    loadedCallback() {
        this.removeText();
        // if we loaded from a mod or custom
        // then we might want to set the frame nubmer

        if (Sit.pars !== undefined && Sit.pars.frame !== undefined) {
            par.frame = Sit.pars.frame;
        }


    }

    errorCallback() {
        this.videoData.error = false;
        if (this.overlay) {
            this.overlay.removeText("videoLoading")
            this.overlay.addText("videoError", "Error Loading", 50, 45, 5, "#f0f000", "center")
            this.overlay.addText("videoErrorName", this.fileName, 50, 55, 1.5, "#f0f000", "center")
        }
    }


    setupMouseHandler() {
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

    disposeVideoData() {
        if (this.videoData) {
            this.videoData.stopStreaming()
            this.videoData.dispose();
            this.videoData = null;
        }
    }


    makeImageVideo(filename, img, deleteAfterUsing = false) {

        this.disposeVideoData()
        this.videoData = new CVideoImageData({
                id: this.id + "_data",
                filename:filename,
                img: img,
                deleteAfterUsing: deleteAfterUsing
            },
            this.loadedCallback.bind(this), this.errorCallback.bind(this))
        this.positioned = false;
        par.frame = 0;
        par.paused = false; // unpause, otherwise we see nothing.
        // this.addLoadingMessage()
        // this.addDownloadButton()
    }

    renderCanvas(frame = 0) {
        super.renderCanvas(frame); // needed for setting window size

        if (!this.visible) return;

        // if no video file, this is just a drop target for now
        if (!this.videoData) return;
        this.videoData.update()
        const image = this.videoData.getImage(frame);
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