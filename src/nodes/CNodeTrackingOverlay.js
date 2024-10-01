// A tracking view will overlay the video and show the tracking data
// testing XX
//

import {CNodeViewUI} from "./CNodeViewUI";
import {mouseToCanvas} from "./CNodeView";


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
        this.radius = v.radius;
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

        this.add(new CDraggableCircle({view:this, x:100, y:100, radius:10}))

    }

    add(draggable) {
        this.draggable.push(draggable)
    }


    renderCanvas(frame) {
        super.renderCanvas(frame)
        const ctx = this.ctx
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5
        this.draggable.forEach(d => d.render(ctx))

    }


    onMouseDown(e, mouseX, mouseY) {
        const [x, y] = mouseToCanvas(this, mouseX, mouseY)
        this.lastMouseX = x
        this.lastMouseY = y
        this.draggable.forEach(d => {
            if (d.isWithin(x, y)) {
                console.log("Clicked on draggable item")
                d.startDrag(x, y)
            }
        })
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


export class CNodeTrackingOverlay extends CNodeActiveOverlay {
    constructor(v) {
        super(v);


        this.addText("tracking", "TRACKING VIEW OVERLAY", 14.8, 3.1)


    }

    renderCanvas(frame) {
        super.renderCanvas(frame) // will be CNodeViewCanvas2D
    }

}