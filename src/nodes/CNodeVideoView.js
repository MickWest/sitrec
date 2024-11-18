// loading and storing video frames
import {CNodeViewCanvas2D} from "./CNodeViewCanvas";
import {par} from "../par";
import {quickToggle} from "../KeyBoardHandler";
import {CNodeGUIValue} from "./CNodeGUIValue";
import {Globals, guiTweaks} from "../Globals";
import {versionString} from "../utils";


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


        this.tinyName = v.tinyName;
        this.fullName = v.fullName;

        this.flushEntireCache()

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


export class CFramesVideoData extends CVideoData {
    constructor(v) {
        super(v)
    }

    update() {
        super.update()

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

}

// The basic functionality of a mouse handler attached to a view
// stores last mouse position, delta, etc
// TODO: touch functionality
class CMouseHandler {
    constructor(view, handlers) {
        this.view = view
        this.handlers = handlers;
        this.x = 0;
        this.y = 0;
        this.dx = 0;
        this.dy = 0;
        this.dragging = false;

        this.view.canvas.addEventListener( 'wheel', e => this.handleMouseWheel(e) );
        this.view.canvas.addEventListener( 'pointermove', e => this.handleMouseMove(e) );
        this.view.canvas.addEventListener( 'pointerdown', e => this.handleMouseDown(e) );
        this.view.canvas.addEventListener( 'pointerup', e => this.handleMouseUp(e) );
        this.view.canvas.addEventListener( 'dblclick', e => this.handleMouseDblClick(e) );
        this.view.canvas.addEventListener( 'contextmenu', e => this.handleContextMenu(e) );
        this.view.canvas.addEventListener( 'mouseLeave', e => this.handleMouseLeave(e) );
    }

    newPosition(e,anchor) {
        const x = e.clientX - this.view.leftPx;
        const y = e.clientY - this.view.topPx;
        this.dx = x - this.x;
        this.dy = y - this.y;
        this.x = x;
        this.y = y;
        if (anchor) {
            this.anchorX = x;
            this.anchorY = y
        }
        // console.log("Mouse: "+this.x+","+this.y+","+" Delta: "+this.dx+","+this.dy)
    }

    handleMouseLeave(e) {
        if (Globals.disableInput) return;
    // does not seem like it makes a diference
        //       e.preventDefault();

    }

    handleMouseWheel(e) {
        if (Globals.disableInput) return;
        e.preventDefault();
        this.newPosition(e,true)
        if (this.handlers.wheel) this.handlers.wheel(e)
    }

    handleMouseMove(e) {
        if (Globals.disableInput) return;
//        console.log("Move, dragging = "+this.dragging)
//        e.preventDefault();
        this.newPosition(e)

        if ( this.dragging) {
            if (e.buttons === 1) {
                if (this.handlers.drag) {
                    this.handlers.drag(e)
                }
            }
            if (e.buttons === 2) {
                if (this.handlers.rightDrag) {
                    this.handlers.rightDrag(e)
                }
            }
            if (e.buttons === 4) {
                if (this.handlers.centerDrag) {
                    this.handlers.centerDrag(e)
                }
            }


        } else {
            if (this.handlers.move) this.handlers.move(e)
        }
    }

    handleMouseDown(e) {
        if (Globals.disableInput) return;
//        e.preventDefault();
        this.view.canvas.setPointerCapture(e.pointerId)


        this.newPosition(e,true)
        this.dragging = true;
        if (this.handlers.down) this.handlers.down(e)

    }

    handleMouseUp(e) {
        if (Globals.disableInput) return;
//        e.preventDefault();
        this.view.canvas.releasePointerCapture(e.pointerId)


        this.newPosition(e)
        this.dragging = false;
        if (this.handlers.up) this.handlers.up(e)

    }

    handleMouseDblClick(e) {
        if (Globals.disableInput) return;
        e.preventDefault();
        this.newPosition(e)
        if (this.handlers.dblClick) this.handlers.dblClick(e)
    }

    handleContextMenu( event ) {
        if (Globals.disableInput) return;

//		console.log("onConrxt")

        if ( this.enabled === false ) return;

        event.preventDefault();

    }



}


export class CNodeVideoView extends CNodeViewCanvas2D {
    constructor(v) {
        super(v);
        // this.canvas.addEventListener( 'wheel', e => this.handleMouseWheel(e) );

        this.optionalInputs(["brightness", "contrast", "blur", "greyscale"])

        if (this.overlayView !== undefined)
            addFiltersToVideoNode(this)

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

// a view on the above data
export class CNodeFramesVideoView extends CNodeVideoView {
    constructor(v) {
        super(v);
        this.checkInputs(["zoom"])
        this.Video = new CFramesVideoData(v)
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