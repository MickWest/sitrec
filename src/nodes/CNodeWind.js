import {CNode} from "./CNode";
import {assert, f2m, metersFromMiles, metersPerSecondFromKnots, radians} from "../utils";
import {gui, guiTweaks, NodeMan, Sit} from "../Globals";
import {DebugArrowAB, V3} from "../threeExt";
import {GlobalScene} from "../LocalFrame";
import {getLocalNorthVector, getLocalSouthVector, getLocalUpVector} from "../SphericalMath";
import {LLAToEUS} from "../LLA-ECEF-ENU";

export class CNodeWind extends CNode {
    constructor(v, guiMenu) {
        super(v);

        if (guiMenu === undefined) {
            if (v.gui === "Tweaks")
                guiMenu = guiTweaks;
            else
                guiMenu = gui;
        }

        this.from = v.from;  // true heading of the wind soruce. North = 0
        this.knots = v.knots
        this.name = v.name ?? ""
        this.arrowColor = v.arrowColor ?? "white"

        // this.input("pos")
        // this.input("radius")

        guiMenu.add (this, "from", 0,359,1).name(this.name+" Wind From").onChange(x =>this.recalculateCascade())
        guiMenu.add (this, "knots", 0, 200, 1).name(this.name+" Wind Knots").onChange(x => this.recalculateCascade())

        this.optionalInputs(["originTrack"])
        // wind defaults to being in the frame of reference of the EUS origin (0,0,0)
        this.position=V3(0,0,0);

        // But if there a track is supplied, then the wind is in the frame of reference of the track
        // we just set the position to the origin of the track
        // if (this.in.originTrack !== undefined) {
        //     this.position = this.in.originTrack.p(0)
        // }

        this.recalculate()
    }

    setPosition(pos) {
        this.position = pos.clone();
    }

    // returns a pre-frame wind vector, indicating wind motion for that frame
    // in EUS coordinates
    // optionally supply a position to get the wind at that position
    // with reference to local north and up vectors
    getValueFrame(f) {

        //let wind = V3(0, 0, -metersPerSecondFromKnots(this.knots) / Sit.fps);
        //const posUp = V3(0, 1, 0)
        let wind = getLocalNorthVector(this.position)
        wind.multiplyScalar(metersPerSecondFromKnots(this.knots) / Sit.fps)
        const posUp = getLocalUpVector(this.position)
        wind.applyAxisAngle(posUp, radians(180-this.from))

        // assert no NaNs in the wind vector
        assert(!isNaN(wind.x) && !isNaN(wind.y) && !isNaN(wind.z), "Wind vector has NaNs");

        return wind;
    }


    recalculate() {

        var A = Sit.jetOrigin.clone()

        var B = A.clone().add(this.p().multiplyScalar(Sit.frames))
        DebugArrowAB(this.name+" Wind",A,B,this.arrowColor,true,GlobalScene)
    }


}