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

    render(f) {
        super.render(f)
        var e = this.overlayView.editor
        var c = this.ctx

        c.beginPath();
        c.lineWidth = this.lineWidth
        c.strokeStyle = this.color;
        c.moveTo(e.D2CX(par.frame), e.D2CY(e.min.y));
        c.lineTo(e.D2CX(par.frame), e.D2CY(e.max.y));
        c.stroke();




        


    }

}

