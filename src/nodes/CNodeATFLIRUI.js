// The Atflir UI has some of the screen symbology, plus the rendering of the artifial horizon
import {Sit} from "../Globals";
import {par} from "../par";
import {abs, cos, floor, m2f, pad, radians, sin} from "../utils";
import {NodeMan} from "../Globals";
import {CNodeViewUI} from "./CNodeViewUI";

export class   CNodeATFLIRUI extends CNodeViewUI {

    constructor(v) {
        super(v);

        this.input("jetAltitude")

        this.timeStart = v.timeStart;
        this.timeStartMin = v.timeStartMin;
        this.timeStartSec = v.timeStartSec;

        this.cx = 50
        this.cy = 36.4

        this.wpx = this.widthPx;
        this.hpx = this.heightPx

        this.addText("fov", "NAR", 14.8, 3.1)
        this.addText("mode", "IR", 48.4, 3.1)
        this.addText("reticle", "RTCL", 61.9, 3.1)
        this.addText("diamond", "V", 93.9, 4.5, 4)
        this.addText("operational", "OPR", 3.5, 7)
        this.addText("zoom", Sit.lookFOV === 0.35 ? "Z 2.0" : "Z 1.0", 14.8, 7)

        /////////////////////////////////////////////////////////////////////
        // these are all rather specific, and should be passed in as hooks
        // but par.az and par el work. par.time needs a base value

        this.addText("az", "35° L", 47, 7).listen(par, "az", function (value) {
            this.text = (floor(0.499999+abs(value))) + "° " + (value > 0 ? "R" : "L");
        })

        this.addText("el", "- 2°", 8.2, 48.5).listen(par, "el", function (value) {
            this.text = (value < 0 ? "- " : "  ") + (floor(0.49999+abs(value))) + "°";
        })


        if (par.rng === undefined)
            par.rng = 0;
        this.addText("rng", "", 85, 30).listen(par, "rng", function (value) {
            if (par.rng > 0)
                this.text = value.toFixed(1) + " RNG";
            else
                this.txt = ""
        })

        if (par.Vc === undefined)
            par.Vc = 0;
        this.addText("Vc", "", 90, 40).listen(par, "Vc", function (value) {
            if (par.Vc !== 0)
                this.text = value.toFixed() + " Vc";
            else
                this.txt = ""
        })


        const timeStartMin = v.timeStartMin ?? 52;
        const timeStartSec = v.timeStartSec ?? 45;
        par.timeStartTotalSec = 60*timeStartMin + timeStartSec
        this.addText("time", "....", 45.9, 99.8).listen(par, "time", function (value) {
            var sec = par.timeStartTotalSec + floor(value)
            this.text = pad(floor(sec/60),2)+pad(sec%60,2);
        })


        this.textAlt1000s = this.addText("alt-1000s", "", 74.7, 96, 4.2)
        this.textAlt000 = this.addText("alt-000", "", 79.3, 95.805, 3.7)
    }


    update() {
        const altitude = Math.round(m2f(this.in.jetAltitude.v0));
        this.textAlt1000s.text = ""+pad(Math.floor(altitude/1000),2)
        this.textAlt000.text = ""+pad(altitude%1000,3);
    }

    // Render for CNodeATFLIRUI
    render(frame) {
        if (this.overlayView && !this.overlayView.visible) return;
        super.render(frame)

        // const a = -radians(this.horizonAngle)
        const a = radians(NodeMan.get("bank").v(par.frame))
        const c = this.ctx

        c.strokeStyle = '#FFFFFF';
        c.lineWidth = 1.5





        const r = 1.6 // radius of small circle
        const k = 4 // length of spike
        const k_top = 3 // length of spike
        c.beginPath();
        c.arc(this.px(this.cx), this.py(this.cy), this.px(r), 0, 2 * Math.PI)

        c.moveTo(this.px(this.cx - r), this.py(this.cy))
        c.lineTo(this.px(this.cx - r - k), this.py(this.cy))

        c.moveTo(this.px(this.cx + r), this.py(this.cy))
        c.lineTo(this.px(this.cx + r + k), this.py(this.cy))

        c.moveTo(this.px(this.cx), this.py(this.cy) - this.px(r))
        c.lineTo(this.px(this.cx), this.py(this.cy - k_top) - this.px(r))  // px(r) in the y as we scale r by x for arc

        c.stroke();

        var o = 6.7 // offset of start of line from middle
        var l = 13 // length of line
        var d = 3 // lenght of small line at the end
        c.beginPath()
        this.rLine(this.cx - o, this.cy, this.cx - o - l, this.cy,a)
        this.rLineTo(c,this.cx - o - l, this.cy + d,a)
        this.rLine(this.cx + o, this.cy, this.cx + o + l, this.cy,a)
        this.rLineTo(c,this.cx + o + l, this.cy + d,a)
        c.stroke()
    }




}

