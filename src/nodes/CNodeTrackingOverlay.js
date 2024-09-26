// A tracking view will overlay the video and show the tracking data

import {CNodeViewUI} from "./CNodeViewUI";


export class CDraggableItem {
    constructor(x,) {
    }
}

export class CDraggableCircle {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    render(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.stroke();
    }

}


// An active overlay is a view that contains draggable and clickable items

export class CNodeActiveOverlay extends CNodeViewUI {
    constructor(v) {
        super(v);

        this.draggable  = []


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