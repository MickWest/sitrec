import {CNode} from "./CNode";
import {f2m, metersFromMiles, metersPerSecondFromKnots, radians} from "../utils";
import {NodeMan, Sit} from "../Globals";
import {DebugArrowAB, V3} from "../threeExt";
import {GlobalScene} from "../LocalFrame";
import {getLocalUpVector} from "../SphericalMath";
import {LLAToEUS} from "../LLA-ECEF-ENU";

export class CNodeWind extends CNode {
    constructor(v, gui) {
        super(v);

        this.from = v.from;  // true heading of the wind soruce. North = 0
        this.knots = v.knots
        this.name = v.name ?? ""
        this.arrowColor = v.arrowColor ?? "white"

        // this.input("pos")
        // this.input("radius")

        gui.add (this, "from", 0,359,1).name(this.name+" Wind From").onChange(x =>this.recalculateCascade())
        gui.add (this, "knots", 0, 200, 1).name(this.name+" Wind Knots").onChange(x => this.recalculateCascade())


        this.recalculate()
    }


    // returns a pre-frame wind vector, indicating wind motion for that frame
    getValueFrame(f) {
        let fwd = V3(0, 0, -metersPerSecondFromKnots(this.knots) / Sit.fps);
        fwd.applyAxisAngle(V3(0,1,0), radians(180-this.from))

        // TODO make it tangent to the surface
        // but position is depending on wind
        // and wind needs position to get the tangent!!
        // so probably need to use an approximate position
        // var pos = this.in.pos.p(f)
        // var radius = metersFromMiles(this.in.radius.v(f))
        //
        // var upAxis = getLocalUpVector(pos, radius)
        // var rightAxis = V3()
        // rightAxis.crossVectors(upAxis, fwd)  // right is calculated as being at right angles to up and fwd
        // fwd.crossVectors(rightAxis, upAxis) // then fwd is a right angles to right and up
        //

        return fwd;
    }


    recalculate() {

        var A = Sit.jetOrigin.clone()

        var B = A.clone().add(this.p().multiplyScalar(Sit.frames))
        DebugArrowAB(this.name+" Wind",A,B,this.arrowColor,true,GlobalScene)
    }


}