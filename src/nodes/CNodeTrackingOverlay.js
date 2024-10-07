// A tracking view will overlay the video and show the tracking data
// testing XX
//

import {CNodeViewUI} from "./CNodeViewUI";
import {mouseToCanvas} from "./CNodeView";
import {assert} from "../assert";
import {Sit} from "../Globals";


export class CDraggableItem {
    constructor(v) {
        this.view = v.view;
        this.x = v.x;
        this.y = v.y;
        this.dragging = false;
    }

    // canvas to percentage
    c2p(x) {
        return x * 100 / this.view.heightPx
    }

    // note using sy for x and y, as we want square pixels
    // canvas X
    get cX() {
        return this.view.sy(this.x)
    }

    // canvas Y
    get cY() {
        return this.view.sy(this.y)
    }

    // canvas radius
    get cR() {
        return this.view.sy(this.radius)
    }

    startDrag(x, y) {
        this.dragging = true;
    }
}

export class CDraggableCircle extends CDraggableItem {
     constructor(v) {
        super(v);
        this.radius = v.radius ?? 5;
    }


    isWithin(x, y) {
        const dx = x - this.cX
        const dy = y - this.cY

        const inside = ( dx * dx + dy * dy) < (this.cR * this.cR);

  //      console.log("isWithin", x, y, this.cX, this.cY, this.cR, inside)

        return inside
    }

    render(ctx) {
        const v = this.view
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5
        if (par.frame === this.frame) {
            ctx.strokeStyle = '#FF0000'
            ctx.lineWidth = 2.5
        }
        ctx.beginPath();
        ctx.arc(this.cX, this.cY, this.cR, 0, 2 * Math.PI);
        ctx.stroke();
    }

}


// An active overlay is a view that contains draggable and clickable items

export class CNodeActiveOverlay extends CNodeViewUI {
    constructor(v) {
        super(v);

        this.draggable  = []


    }


    c2p(x) {
        return x * 100 / this.heightPx
    }

    add(draggable) {
        this.draggable.push(draggable)
        return draggable;
    }


    renderCanvas(frame) {
        super.renderCanvas(frame)
        const ctx = this.ctx
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5
        this.draggable.forEach(
                  d => {
                        d.render(ctx)
                  }

        )

    }


    onMouseDown(e, mouseX, mouseY) {
        const [x, y] = mouseToCanvas(this, mouseX, mouseY)
        this.lastMouseX = x
        this.lastMouseY = y
        for (const d of this.draggable) {
            if (d.isWithin(x, y)) {
                console.log("Clicked on draggable item")
                d.startDrag(x, y)
                return true;
            }
        }
        return false;
    }

    onMouseUp(e, mouseX, mouseY) {
        this.draggable.forEach(d => {
            d.dragging = false
        })
    }

    onMouseMove(e, mouseX, mouseY) {
        const [x, y] = mouseToCanvas(this, mouseX, mouseY)

        // delta x and y in canvas pixels
        const dx = x - this.lastMouseX
        const dy = y - this.lastMouseY


        this.draggable.forEach(d => {
            if (d.dragging) {
                // convert canvas to percentages of the height
                const px = d.c2p(d.cX+dx)
                const py = d.c2p(d.cY+dy)

                d.x = px;
                d.y = py;

            }
        })

        this.lastMouseX = x
        this.lastMouseY = y
    }

}


class CNodeVideoTrackKeyframe extends CDraggableCircle{
    constructor(v) {
        super(v);
        this.frame = v.frame;
        this.view = v.view
    }

    startDrag() {

        par.frame = this.frame;
        par.paused = true;
        super.startDrag();
    }
}


export class CNodeTrackingOverlay extends CNodeActiveOverlay {
    constructor(v) {
        super(v);

        this.input("cameraLOSNode")
        this.input("fovNode")

        this.seperateVisibilty = true; // don't propagate visibility to the overlaid view

        document.addEventListener('contextmenu', function (event) {
            if (event.ctrlKey) {
                event.preventDefault();
            }
        });

        this.keyframes = [];

        this.keyframes.push(this.add(new CNodeVideoTrackKeyframe({view:this, x:50, y:50, frame:0})))
   //     this.keyframes.push(this.add(new CNodeVideoTrackKeyframe({view:this, x:60, y:55, frame:1000})))
   //     this.keyframes.push(this.add(new CNodeVideoTrackKeyframe({view:this, x:80, y:52, frame:2000})))


        this.updateCurve();

    }

    getValueFrame(f) {
        const cameraLOSNode = this.in.cameraLOSNode
        const fovNode = this.in.fovNode
        const los = cameraLOSNode.getValueFrame(f)
        const vFOV = fovNode.getValueFrame(f)

        // the los is a position (of the camera) and heading (centerline of the camera)
        // we will take the XY position of the camera and the heading
        // and the vertical FOV, and the width and height of the video
        // and modify the heading to pass through the XY position



        return los;

    }

    updateCurve() {

        // the track will overlay a video, so we can get the number of frames from that
        //this.frames = this.overlayView.frames;

        this.frames = Sit.videoFrames;

        // console.log ("Setting up a CNodeTrackingOverlay with Frames = ", this.frames)

        // sort keyframes by frame
        this.keyframes.sort((a, b) => a.frame - b.frame)

        // create a new curve, first as an empty array of points
        this.pointsXY = new Array(this.frames).fill(0).map(() => [0, 0])

        // we have a spline based on the keyframes
        // if just one keyframe, then it's all the same point
        // two keyframes, then it's a straight line
        // more than two, then it's a spline
        // so fill the XY points with the keyframes
        // we iterate over the POINTS, not the keyframes
        // and find the point on the curve for that frame
        // and set the XY point to that

// Helper function for Catmull-Rom spline interpolation
        function catmullRom(t, p0, p1, p2, p3) {
            const t2 = t * t;
            const t3 = t2 * t;
            return (
                0.5 *
                ((2 * p1) +
                    (-p0 + p2) * t +
                    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                    (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
            );
        }

        for (let i = 0; i < this.frames; i++) {
            // if no keyframes, then just set to 50,50
            // the middle of the screen (vertically), and the same distance in the horizontal
            if (this.keyframes.length === 0) {
                this.pointsXY[i] = [50, 50];
            }
            // if one keyframe, then set to that
            else if (this.keyframes.length === 1) {
                this.pointsXY[i] = [this.keyframes[0].x, this.keyframes[0].y];
            } else if (this.keyframes.length === 2) {
                // Handle two keyframes with simple linear interpolation
                const k1 = this.keyframes[0];
                const k2 = this.keyframes[1];
                const t = (i - k1.frame) / (k2.frame - k1.frame);
                this.pointsXY[i] = [
                    k1.x + t * (k2.x - k1.x),
                    k1.y + t * (k2.y - k1.y)
                ];
            } else {
                let k0, k1, k2, k3;
                let t = 0;

                if (i < this.keyframes[0].frame) {
                    // Extrapolate before the first keyframe using the first two keyframes (linear extension)
                    k1 = this.keyframes[0];
                    k2 = this.keyframes[1];
                    const slopeX = k2.x - k1.x;
                    const slopeY = k2.y - k1.y;
                    t = (i - k1.frame) / (k2.frame - k1.frame);

                    this.pointsXY[i] = [
                        k1.x + t * slopeX,  // Linear extrapolation for X
                        k1.y + t * slopeY   // Linear extrapolation for Y
                    ];
                } else if (i > this.keyframes[this.keyframes.length - 1].frame) {
                    // Extrapolate after the last keyframe using the last two keyframes (linear extension)
                    k1 = this.keyframes[this.keyframes.length - 2];
                    k2 = this.keyframes[this.keyframes.length - 1];
                    const slopeX = k2.x - k1.x;
                    const slopeY = k2.y - k1.y;
                    t = (i - k2.frame) / (k2.frame - k1.frame);

                    this.pointsXY[i] = [
                        k2.x + t * slopeX,  // Linear extrapolation for X
                        k2.y + t * slopeY   // Linear extrapolation for Y
                    ];
                } else {
                    // Interpolation within the range of keyframes
                    for (let j = 1; j < this.keyframes.length; j++) {
                        if (this.keyframes[j].frame >= i) {
                            k2 = this.keyframes[j];
                            k1 = this.keyframes[j - 1];

                            k0 = this.keyframes[j - 2] ?? k1;
                            k3 = this.keyframes[j + 1] ?? k2;

                            t = (i - k1.frame) / (k2.frame - k1.frame);
                            break;
                        }
                    }

                    // Apply Catmull-Rom spline interpolation for frames within the keyframes
                    this.pointsXY[i] = [
                        catmullRom(t, k0.x, k1.x, k2.x, k3.x),
                        catmullRom(t, k0.y, k1.y, k2.y, k3.y)
                    ];
                }
            }
        }

    }

    onMouseDown(e, mouseX, mouseY) {

        // if we clicked on a draggable item, then we return true
        // we don't need to check this
        if (!e.ctrlKey && super.onMouseDown(e, mouseX, mouseY)) {
            // this means we clicked on a draggable item
            // check to see if the alt key is down
            // if so, we remove the item from the lists
            if (e.altKey) {
                this.draggable = this.draggable.filter(d => !d.dragging)

                // remove the keyframe from the keyframes array
                this.keyframes = this.keyframes.filter(k => !k.dragging)

                // no dispose is needed
            }


           // if (!e.ctrlKey)
           //     return true;
        }

        const [x, y] = mouseToCanvas(this, mouseX, mouseY)


         if (e.ctrlKey) {
            // control key means we add a new one at this frame
             // we disable the default action
                e.preventDefault();

            // interate over keyframes and find if there is one at this frame
            let found = false;
            for (const k of this.keyframes) {
                if (k.frame === par.frame) {
                    found = true;

                    // move it to the new position
                    k.x = this.c2p(x);
                    k.y = this.c2p(y);


                    break;
                }
            }

            if (!found) {
                console.log("Adding a new keyframe at frame ", par.frame)
                this.keyframes.push(this.add(new CNodeVideoTrackKeyframe({
                    view: this,
                    x: this.c2p(x),
                    y: this.c2p(y),
                    frame: par.frame
                })))
            }

         }


    }

    renderCanvas(frame) {
        super.renderCanvas(frame) // will be CNodeViewCanvas2D

        this.updateCurve();

        // iterate over keyframes and render lines between them
        const ctx = this.ctx
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5
        // for (let i = 0; i < this.keyframes.length - 1; i++) {
        //     const k1 = this.keyframes[i]
        //     const k2 = this.keyframes[i + 1]
        //
        //     ctx.beginPath();
        //     ctx.moveTo(k1.cX, k1.cY);
        //     ctx.lineTo(k2.cX, k2.cY);
        //     ctx.stroke();
        // }

        // iterate over points and render the curve
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2.5
        ctx.beginPath();
        ctx.moveTo(this.keyframes[0].cX, this.keyframes[0].cY);
        for (let i = 0; i < this.frames; i++) {
            const [x, y] = this.pointsXY[i]
            ctx.lineTo(this.sy(x), this.sy(y))
        }
        ctx.stroke();

        // find the XY position for the current frame
        // and render a circle there
        const [x, y] = this.pointsXY[frame];
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5
        ctx.beginPath();
        ctx.arc(this.sy(x), this.sy(y), 5, 0, 2 * Math.PI);

        ctx.stroke();

    }

    modSerialize() {
        return {
            ...super.modSerialize(),
            keyframes: this.keyframes.map(k => {
                return {
                    x: k.x,
                    y: k.y,
                    frame: k.frame
                }
            })
        }
    }

    modDeserialize(v) {
        this.draggable = [];
       // super.modDeserialize(v);
        this.keyframes = v.keyframes.map(k => {
            return this.add(new CNodeVideoTrackKeyframe({
                view: this,
                x: k.x,
                y: k.y,
                frame: k.frame
            }))
        })
    }

}