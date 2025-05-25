// sitrec/src/nodes/CNodeGraphLine.js
// This is the vertical line that shows the current frame in the graph view
// as well as the current value of the compareNode at that frame
// It's a lightweight overlay for the graph view, so we can add the line and number
// without needing to fully redraw the graph view itself

import {CNodeViewUI} from "./CNodeViewUI";
import {par} from "../par";

export class CNodeGraphLine extends CNodeViewUI {
    constructor(v) {
        super(v);
        this.overlayView = v.overlayView
        this.color = v.color ?? "#08ff80"
        this.lineWidth = v.lineWidth ?? 1

        this.ignoreMouse = true;
        this.canvas.style.pointerEvents = 'none' // to pass through mouse events

    }

    update() {
        this.visible = this.overlayView.visible
    }

    renderCanvas(f) {
        super.renderCanvas(f)
        var e = this.overlayView.editor
        var c = this.ctx

        c.beginPath();
        c.lineWidth = this.lineWidth
        c.strokeStyle = this.color;
        c.moveTo(e.D2CX(par.frame), e.D2CY(e.min.y));
        c.lineTo(e.D2CX(par.frame), e.D2CY(e.max.y));
        c.stroke();


        // draw the current value at the current frame position on the curve
        // we do this for each compareNode
        // drawing them all lke this can give nasty overlaps
        // maybe options needed?
        if (e.compareNode) {
            for (let i = 0; i < e.compareNode.length; i++) {
                const value = e.compareNode[i].getValueFrame(par.frame);
                const valueText = value.toFixed(1);
                // calculate height of the text in pixels in this context
                const textHeight = c.measureText(valueText).actualBoundingBoxAscent;

                c.font = "14px Arial";
                c.strokeStyle = e.compareNode[i].color; // ????
                c.fillText(value.toFixed(1), e.D2CX(par.frame + 1), e.D2CY(value) + textHeight);
            }

        }



        


    }

}

