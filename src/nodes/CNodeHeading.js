import {CNode} from "./CNode";
import {f2m, metersPerSecondFromKnots, radians} from "../utils";
import {gui, guiTweaks, NodeMan, Sit} from "../Globals";
import {DebugArrowAB, V3} from "../threeExt";
import {GlobalScene} from "../LocalFrame";

export class CNodeHeading extends CNode {
    constructor(v, guiMenu) {
        super(v);


        this.setGUI(v, guiMenu)

        this.heading = v.heading;  // true heading
        this.name = v.name ?? ""
        this.arrowColor = v.arrowColor ?? "white"

        this.gui.add (this, "heading", 0,359,1).name(this.name+" Heading").onChange(x =>this.recalculateCascade())

        this.recalculate()
    }

    getValueFrame(f) {
        let fwd = V3(0, 0, -1);
        fwd.applyAxisAngle(V3(0,1,0), radians(-this.heading))
        return fwd;
    }

    getHeading(f) {
        return this.heading
    }


    recalculate() {
        var A = Sit.jetOrigin.clone()

        var B = A.clone().add(this.p().multiplyScalar(10000))
        DebugArrowAB(this.name+" Heading",A,B,this.arrowColor,true,GlobalScene)
    }


}