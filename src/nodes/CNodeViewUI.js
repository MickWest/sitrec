// UI class for various 2D overlays
// uses a 2d canvas that optionally sits on top of a CView
import {cos, getTextBBox, radians, sin} from "../utils";
import {CUIText} from "./CNodeView";
import {NodeMan, Sit} from "../Globals";
import {CNodeCloudData} from "./CNodeCloudData";
import {CNodeViewCanvas2D} from "./CNodeViewCanvas";
import {par} from "../par";

export class CNodeViewUI extends CNodeViewCanvas2D {
    // constructor is passed a CView object or id, if null then this is stand-alone
    constructor(v) {
        super(v)
        if (this.overlayView) {
            this.visible = this.overlayView.visible;
        }
        this.defaultFontSize = v.defaultFontSize ?? 5// font height as % of window height
        this.defaultFontColor = v.defaultFontColor ?? '#FFFFFF'
        this.defaultFont = v.defaultFont ?? 'sans-serif'
        this.defaultAlign = v.defaultAlign ?? 'center'
        this.textElements = {} // text elements are named
        this.autoClear = true; // always need to autoclear
        // we don't need a div as we deriver from CNodeViewCanvas2D

        // center of rotation, default to 50%, but CNodeATFLIRUI will set to y= 36.4
        this.cx = 50
        this.cy = 50

        this.wpx = this.widthPx;
        this.hpx = this.heightPx

    }

    // (cx,cy) = x and y of the center point (percentages)

    // px, py = pixel position of a percentage, so 50,50 = center
    px(x) {
        return this.wpx * x / 100
    }

    py(y) {
        return this.hpx * y / 100
    }

    // return x component of x, y rotated about cx,cy, by a
    rx(x, y, a) {
        return this.px(this.cx + (x - this.cx) * cos(a) + (y - this.cy) * sin(a))
    }

    ry(x, y, a) {
        return this.py(this.cy - (x - this.cx) * sin(a) + (y - this.cy) * cos(a))
    }

    rLine( x1, y1, x2, y2, a) {
        this.ctx.moveTo(this.rx(x1, y1, a), this.ry(x1, y1, a))
        this.ctx.lineTo(this.rx(x2, y2, a), this.ry(x2, y2, a))
    }

    rLineTo(c, x2, y2, a) {
        this.ctx.lineTo(this.rx(x2, y2, a), this.ry(x2, y2, a))
    }

    arc(x, y, radius, startAngle = 0, endAngle = 360) {
        this.ctx.arc(this.px(x), this.px(y), this.py(radius), radians(startAngle), radians(endAngle))
    }

    moveTo(x, y) {
        this.ctx.moveTo(this.px(x), this.py(y))
    }

    lineTo(x, y) {
        this.ctx.lineTo(this.px(x), this.py(y))
    }

    lineAB(x0,y0,x1,y1,width=1, color="#00FF00") {
        var c = this.ctx
        c.beginPath();
        c.lineWidth = width
        c.strokeStyle = color;
        this.moveTo(x0,y0);
        this.lineTo(x1,y1);
        c.stroke();
    }

    arrowAB(x0,y0,x1,y1,width=1, color="#00FF00") {
        let ly = (x1 - x0)*0.02;
        let lx = -(y1 - y0)*0.02;
        let mx = x0+(x1 - x0)*0.8
        let my = y0+(y1 - y0)*0.8
        this.lineAB(x0,y0,x1,y1,width,color)
        this.lineAB(x1,y1,mx-lx,my-ly,width,color)
        this.lineAB(x1,y1,mx+lx,my+ly,width,color)
        this.lineAB(mx-lx,my-ly,mx+lx,my+ly,width,color)

    }


    // adds a line one line below the last one
    // uses the Y value to create a unique ID (not intended to be referenced)
    addLine(text) {
        return this.addText(
            this.lastKey+this.lastY,
            text, this.lastX, this.lastY + this.lastSize, this.lastSize,
            this.lastColor, this.lastAlign, this.lastFont
        )
    }

    addText(key, text, x, y, size, color, align, font) {
        size ??= this.defaultFontSize
        color ??= this.defaultFontColor
        font ??= this.defaultFont
        align ??= this.defaultAlign

        this.lastKey = key;
        this.lastSize = size;
        this.lastColor = color;
        this.lastFont = font;
        this.lastAlign = align;
        this.lastY = y;
        this.lastX = x;


        // make sure we have the size right for centering text
        this.inheritSize()
        this.canvas.width = this.widthPx
        this.canvas.height = this.heightPx
        //this.canvas.style.zIndex = 10;

        this.textElements[key] = new CUIText(text, x, y, size, color, align, font)
        return this.textElements[key]
    }

    removeText(key) {
       delete this.textElements[key]
    }

    // render for CNodeViewUI - extends CNodeViewCanvas2D
    render(frame) {
        super.render(frame) // will be CNodeViewCanvas2D
        if (this.overlayView && !this.overlayView.visible) return;
        this.setVisible(true)

        this.wpx = this.widthPx;
        this.hpx = this.heightPx

        /*
        if (1) {

            // changing the size resets the style and clears the canvas
            // so restore style here???
            this.ctx.font = '12px sans-serif'
            this.ctx.fillStyle = '#FFFFFF'
            this.ctx.strokeStyle = '#FFFFFF'
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
*/

 //       this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);


        Object.keys(this.textElements).forEach(key => {
            const t = this.textElements[key]

            t.checkListener()

            const x = t.x * this.widthPx
            const y = t.y * this.heightPx
            this.ctx.font = Math.floor(this.heightPx * t.size) + 'px' + " " + t.font
            this.ctx.fillStyle = t.color;
            this.ctx.strokeStyle = t.color;
            this.ctx.textAlign = t.align;
            this.ctx.fillText(t.text, x, y)
            t.bbox = getTextBBox(this.ctx, t.text)
            const w = t.bbox.width
            const h = t.bbox.height
            if (t.boxed) {
                this.ctx.strokeRect(x + t.bbox.left - t.boxGap, y + t.bbox.top - t.boxGap, w + t.boxGap * 2, h + t.boxGap * 2)
            }
        })

    }

    // recalculate() will be called if an input node to this CNodeViewUI is changed
    // we want to force an update of any textElement that has a callback
    // so we simply make all the values undefined and then call checkListener()
    // which will force a recalculation of the text, which will then be displayed later by render()
    recalculate() {
        Object.keys(this.textElements).forEach(key => {
            const t = this.textElements[key]
            if (t.object != undefined) {
                t.initialValue = undefined;
                t.checkListener();
            }
        })
        par.renderOne = true;
      //  this.render(par.frame);
    }
}

export function forceUpdateUIText() {
        NodeMan.iterate((k,n) => {
        if (n instanceof CNodeViewUI) {
            n.recalculate()
        }
    })
}
