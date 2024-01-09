// simple UI intermediate class that just has a canvas.
// we use this for the CNodeViewUI and the (upcoming) CNodeVideoView
// passing in an "overlayView" parameter will attache
import {CNodeView} from "./CNodeView";
import {NodeMan} from "../Globals";
import {CNodeCloudData} from "./CNodeCloudData";


export class CNodeViewCanvas extends CNodeView {
    constructor(v) {
        super(v)

        this.canvas = document.createElement('canvas')
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = 0 + 'px';
        this.canvas.style.left = 0 + 'px';


        this.adjustSize()

        this.div.appendChild(this.canvas)
    }

    ignoreMouseEvents() {
        this.canvas.style.pointerEvents = 'none';
    }

    adjustSize() {
        // just keep the canvas the same size as its div
        if (this.canvas.width !== this.div.clientWidth || this.canvas.height !== this.div.clientHeight || this.autoClear) {
            this.canvas.width = this.div.clientWidth
            this.canvas.height = this.div.clientHeight

            // bit of a patch to redraw the editor/graph, as resizing clears
            if (this.editor) {
                // this is just resizing, so don't need to recalculate, just redraw.
                this.editor.dirty = true;
            }
        }
    }

}

class CNodeViewCanvas2D extends CNodeViewCanvas {
    constructor(v) {
        super(v)

        this.ctx = this.canvas.getContext('2d')
        this.ctx.font = '36px serif'
        this.ctx.fillStyle = '#FF00FF'
        this.ctx.strokeStyle = '#FF00FF'

        // this.canvas.style.backgroundColor = 'transparent';
        // this.ctx.globalAlpha = 0.5;

        this.autoClear = v.autoClear;

    }

    render(frame) {
        super.render(frame)

        this.adjustSize()

        // the autoClear will clear it to transparent, so need to
        // fill it with a solid color if we've got an autoFill

        if (this.autoFill) {
            this.ctx.fillStyle = this.autoFillColor ?? "black";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

    }
}

export {CNodeViewCanvas2D};
