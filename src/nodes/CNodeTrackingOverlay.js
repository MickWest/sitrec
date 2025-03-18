// A tracking view will overlay the video and show the tracking data
// testing XX
//

import {CNodeViewUI} from "./CNodeViewUI";
import {assert} from "../assert";
import {NodeMan, Sit} from "../Globals";
import {radians} from "../utils";
import {extractFOV} from "./CNodeControllerVarious";
import {mouseToCanvas} from "../ViewUtils";


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
// such as the object tracking spline editor
export class CNodeActiveOverlay extends CNodeViewUI {
    constructor(v) {
        super(v);

        // disable double clicking to full-screen or resize, as it does not
        // work well with the active overlay
        this.doubleClickResizes = false;
        this.doubleClickFullScreen = false


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
                console.log("Clicked on draggable item, starting drag")
                d.startDrag(x, y)
                return true;
            }
        }
        return false;
    }

    onMouseUp(e, mouseX, mouseY) {
        console.log("Mouse up, stopping drag")
        this.draggable.forEach(d => {
            d.dragging = false
        })
    }

    onMouseDrag(e, mouseX, mouseY) {
        const [x, y] = mouseToCanvas(this, mouseX, mouseY)

        // delta x and y in canvas pixels
        const dx = x - this.lastMouseX
        const dy = y - this.lastMouseY


        this.draggable.forEach(d => {
            if (d.dragging) {
                console.log("Dragging item to ", x, y)
                // convert canvas to percentages of the height
                const px = d.c2p(d.cX+dx)
                const py = d.c2p(d.cY+dy)

                d.x = px;
                d.y = py;
                this.recalculateCascade();

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

    startDrag(x, y) {

        par.frame = this.frame;
        par.paused = true;
        super.startDrag(x,y);
    }
}


export class CNodeTrackingOverlay extends CNodeActiveOverlay {
    constructor(v) {
        super(v);

        this.input("cameraLOSNode")
        this.input("fovNode")

        this.setGUI(v,"traverse");

        this.limitAB = true;
        this.gui.add(this, "limitAB").name("Limit AB to Video Tracking").listen().onChange(() => {

            if (this.limitAB && this.keyframes.length > 0) {
                this.applyLimitAB();
            } else {
                Sit.aFrame = 0;
                Sit.bFrame = Sit.frames - 1;
            }

            NodeMan.recalculateAllRootFirst();

        })



        this.seperateVisibilty = true; // don't propagate visibility to the overlaid view

        document.addEventListener('contextmenu', function (event) {
            if (event.ctrlKey) {
                event.preventDefault();
            }
        });

        this.keyframes = [];

   //     this.keyframes.push(this.add(new CNodeVideoTrackKeyframe({view:this, x:50, y:50, frame:0})))
   //     this.keyframes.push(this.add(new CNodeVideoTrackKeyframe({view:this, x:60, y:55, frame:1000})))
   //     this.keyframes.push(this.add(new CNodeVideoTrackKeyframe({view:this, x:80, y:52, frame:2000})))


        this.updateCurve();


    }

    applyLimitAB() {
        // get the frame of the first keyframe
        const A = this.keyframes[0].frame;
        // get the frame of the last keyframe
        const B = this.keyframes[this.keyframes.length - 1].frame;
        // 10% of that span
        const tenPercent = (B - A) / 10;
        // set the A frame to 10% before
        Sit.aFrame = Math.floor(A - tenPercent);
        // set the B frame to 10% after
        Sit.bFrame = Math.floor(B + tenPercent);
        // check for limits
        if (Sit.aFrame < 0) Sit.aFrame = 0;
        if (Sit.bFrame >= Sit.frames) Sit.bFrame = Sit.frames - 1;
    }

    getValueFrame(f) {
        const cameraLOSNode = this.in.cameraLOSNode
        const fovNode = this.in.fovNode
        const los = cameraLOSNode.getValueFrame(f)
        const vFOV = extractFOV(fovNode.getValueFrame(f));

        // the los is a position (of the camera) and heading (centerline of the camera)
        // we will take the XY position of the camera and the heading
        // and the vertical FOV, and the width and height of the video
        // and modify the heading to pass through the XY position

        // x and y are percentages of the height
        const [x, y] = this.pointsXY[f];

        // get aspect ratio of the video
        // so width = height * aspect
        // (hence aspect will be > 1 for landscape, < 1 for portrait, and = 1 for square)
        const aspect = this.widthPx / this.heightPx;

        // make it relative to the center of the screen
        // adjusting X for the aspect ratio
        const yoff = y - 50;
        const xoff = x - 50*aspect;

        // get focal length in pixel, given that the Y nominally spans 100.
        const fpx = 100 / (2 * Math.tan(radians(vFOV) / 2));

        // get the Y angle from the centerline
        const yangle = -Math.atan(yoff / fpx);
        // same for X
        const xangle = -Math.atan(xoff / fpx);


        const up = los.up;
        const right = los.right;
        const heading = los.heading;

        // rotate the heading and right vector by xangle about the up vector
        // and then the new headin by yangle about the new right vector
        const newHeading = heading.clone().applyAxisAngle(up, xangle)
        const newRight = right.clone().applyAxisAngle(up, xangle)
        newHeading.applyAxisAngle(newRight, yangle)

        los.heading = newHeading;

        // up and right are no longer valid
        // could update them, but they are not used.
        los.up = undefined;
        los.right = undefined;


        return los;

    }

    recalculate() {
        this.updateCurve();
    }

    updateCurve() {
        // Get the total number of frames
        this.frames = Sit.frames;

        // Sort keyframes by frame
        this.keyframes.sort((a, b) => a.frame - b.frame);

        // Create a new curve as an empty array of points
        this.pointsXY = new Array(this.frames).fill(0).map(() => [0, 0]);

        // Handle special cases first
        if (this.keyframes.length === 0) {
            // No keyframes, set all points to middle (50, 50)
            for (let i = 0; i < this.frames; i++) {
                this.pointsXY[i] = [50, 50];
            }
            return;
        } else if (this.keyframes.length === 1) {
            // One keyframe, set all points to that keyframe
            const point = [this.keyframes[0].x, this.keyframes[0].y];
            for (let i = 0; i < this.frames; i++) {
                this.pointsXY[i] = [...point];
            }
            return;
        } else if (this.keyframes.length === 2) {
            // Two keyframes, use linear interpolation
            const k1 = this.keyframes[0];
            const k2 = this.keyframes[1];

            for (let i = 0; i < this.frames; i++) {
                if (i <= k1.frame) {
                    // Before first keyframe, extrapolate linearly
                    const t = (i - k1.frame) / (k2.frame - k1.frame);
                    this.pointsXY[i] = [
                        k1.x + t * (k2.x - k1.x),
                        k1.y + t * (k2.y - k1.y)
                    ];
                } else if (i >= k2.frame) {
                    // After last keyframe, extrapolate linearly
                    const t = (i - k2.frame) / (k2.frame - k1.frame);
                    this.pointsXY[i] = [
                        k2.x + t * (k2.x - k1.x),
                        k2.y + t * (k2.y - k1.y)
                    ];
                } else {
                    // Between keyframes, interpolate linearly
                    const t = (i - k1.frame) / (k2.frame - k1.frame);
                    this.pointsXY[i] = [
                        k1.x + t * (k2.x - k1.x),
                        k1.y + t * (k2.y - k1.y)
                    ];
                }
            }
            return;
        }

        // Three or more keyframes, use cubic spline interpolation

        // Extract arrays for x and y coordinates and frames
        const frames = this.keyframes.map(k => k.frame);
        const xCoords = this.keyframes.map(k => k.x);
        const yCoords = this.keyframes.map(k => k.y);

        // Calculate cubic spline coefficients
        const xSpline = this.calculateCubicSpline(frames, xCoords);
        const ySpline = this.calculateCubicSpline(frames, yCoords);

        // Fill in the points array
        for (let i = 0; i < this.frames; i++) {
            if (i < frames[0]) {
                // Before first keyframe - linear extrapolation
                const slope = this.getInitialSlope(xSpline, ySpline);
                const t = i - frames[0];
                this.pointsXY[i] = [
                    xCoords[0] + t * slope.x,
                    yCoords[0] + t * slope.y
                ];
            } else if (i > frames[frames.length - 1]) {
                // After last keyframe - linear extrapolation
                const slope = this.getFinalSlope(xSpline, ySpline);
                const t = i - frames[frames.length - 1];
                this.pointsXY[i] = [
                    xCoords[xCoords.length - 1] + t * slope.x,
                    yCoords[yCoords.length - 1] + t * slope.y
                ];
            } else {
                // Within keyframe range - cubic spline interpolation
                this.pointsXY[i] = [
                    this.evaluateCubicSpline(i, frames, xSpline),
                    this.evaluateCubicSpline(i, frames, ySpline)
                ];
            }
        }
    }

// Calculate cubic spline coefficients
    calculateCubicSpline(x, y) {
        const n = x.length;
        const splines = new Array(n - 1);

        if (n < 2) return splines;

        if (n === 2) {
            // Special case for two points - linear interpolation
            splines[0] = {
                a: y[0],
                b: (y[1] - y[0]) / (x[1] - x[0]),
                c: 0,
                d: 0
            };
            return splines;
        }

        // Step 1: Calculate second derivatives
        const h = new Array(n - 1);
        const alpha = new Array(n - 1);
        const l = new Array(n);
        const mu = new Array(n - 1);
        const z = new Array(n);

        for (let i = 0; i < n - 1; i++) {
            h[i] = x[i + 1] - x[i];
        }

        for (let i = 1; i < n - 1; i++) {
            alpha[i] = (3 / h[i]) * (y[i + 1] - y[i]) - (3 / h[i - 1]) * (y[i] - y[i - 1]);
        }

        l[0] = 1;
        mu[0] = 0;
        z[0] = 0;

        for (let i = 1; i < n - 1; i++) {
            l[i] = 2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1];
            mu[i] = h[i] / l[i];
            z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
        }

        l[n - 1] = 1;
        z[n - 1] = 0;

        // Step 2: Back-substitution
        const c = new Array(n);
        c[n - 1] = 0;

        for (let j = n - 2; j >= 0; j--) {
            c[j] = z[j] - mu[j] * c[j + 1];
        }

        // Step 3: Calculate the remaining coefficients
        for (let i = 0; i < n - 1; i++) {
            splines[i] = {
                a: y[i],
                b: (y[i + 1] - y[i]) / h[i] - h[i] * (c[i + 1] + 2 * c[i]) / 3,
                c: c[i],
                d: (c[i + 1] - c[i]) / (3 * h[i])
            };
        }

        return splines;
    }

// Evaluate cubic spline at a given x
    evaluateCubicSpline(x, xValues, splines) {
        const n = xValues.length;

        // Find the appropriate interval
        let i = 0;
        while (i < n - 1 && x > xValues[i + 1]) {
            i++;
        }

        // Ensure we're within bounds
        if (i >= splines.length) i = splines.length - 1;

        // Calculate the value
        const dx = x - xValues[i];
        const spline = splines[i];

        return spline.a + spline.b * dx + spline.c * dx * dx + spline.d * dx * dx * dx;
    }

// Get the initial slope for extrapolation
    getInitialSlope(xSpline, ySpline) {
        // Use the first spline segment's first derivative at the start point
        return {
            x: xSpline[0].b,
            y: ySpline[0].b
        };
    }

// Get the final slope for extrapolation
    getFinalSlope(xSpline, ySpline) {
        const lastX = xSpline[xSpline.length - 1];
        const lastY = ySpline[ySpline.length - 1];

        // Calculate the derivative at the end of the last segment
        // For a cubic spline a + b*x + c*x^2 + d*x^3, the derivative is b + 2c*x + 3d*x^2
        return {
            x: lastX.b,
            y: lastY.b
        };
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

                this.recalculateCascade();

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
                    this.recalculateCascade();


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
                this.recalculateCascade();
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
        const [x0, y0] = this.pointsXY[0]
        ctx.moveTo(this.sy(x0), this.sy(y0));
        for (let i = 0; i < this.frames; i++) {
            const [x, y] = this.pointsXY[i]
            ctx.lineTo(this.sy(x), this.sy(y))
        }
        ctx.stroke();

        assert (this.pointsXY[frame] !== undefined, "CNodeTrackingOverlay:renderCanvas: pointsXY[frame] is undefined, this.frames = "+this.frames+", frame = "+frame, "Sit.frames = "+Sit.frames)

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