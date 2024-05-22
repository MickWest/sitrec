import {CNode, CNodeOrigin} from "./CNode";
import {assert, f2m, metersFromMiles, metersPerSecondFromKnots, radians} from "../utils";
import {gui, guiTweaks, NodeMan, Sit} from "../Globals";
import {DebugArrowAB, V3} from "../threeExt";
import {GlobalScene} from "../LocalFrame";
import {getLocalNorthVector, getLocalSouthVector, getLocalUpVector} from "../SphericalMath";
import {LLAToEUS} from "../LLA-ECEF-ENU";

export class CNodeWind extends CNode {
    constructor(v, _guiMenu) {
        super(v);

        this.canSerialize = true;

        this.setGUI(v, _guiMenu)

        this.from = v.from;  // true heading of the wind soruce. North = 0
        this.knots = v.knots
        this.name = v.name ?? v.id // if no name is supplied, use the id

        this.max = v.max ?? 200;

        // this.input("pos")
        // this.input("radius")

        this.guiFrom = this.gui.add (this, "from", 0,359,1).name(this.name+" Wind From").onChange(x =>this.recalculateCascade())
        this.guiKnots = this.gui.add (this, "knots", 0, this.max, 1).name(this.name+" Wind Knots").onChange(x => this.recalculateCascade())

        this.optionalInputs(["originTrack"])
        // wind defaults to being in the frame of reference of the EUS origin (0,0,0)
        this.position=V3(0,0,0);

        // But if there a track is supplied, then the wind is in the frame of reference of the track
        // we just set the position to the origin of the track
        // if (this.in.originTrack !== undefined) {
        //     this.position = this.in.originTrack.p(0)
        // }

        this.lock = v.lock;

        this.recalculate()
    }

    modSerialize() {
        return {
            from: this.from,
            knots: this.knots,
            name: this.name,
            max: this.max,
            lock: this.lock,
        }
    }

    modDeserialize(v) {
        this.from = v.from;
        this.knots = v.knots;
        this.name = v.name;
        this.max = v.max;
        this.lock = v.lock;
        this.guiFrom.updateDisplay()
        this.guiKnots.updateDisplay()
    }

    // hide and show will be called from a switch node
    hide() {
        super.hide()
        this.guiFrom.hide()
        this.guiKnots.hide()
        return this;

    }

    show() {
        super.show()
        this.guiFrom.show()
        this.guiKnots.show()
        return this;
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
        if (this.dontRecurse) return;
        this.dontRecurse = true;

        if (this.lock !== undefined) {
            if (NodeMan.exists("lockWind")) {
                const lock = NodeMan.get("lockWind");
                if (lock.value) {
                    const target = NodeMan.get(this.lock);

                    // we set the value in the object rather than the UI, as we
                    // don't want to trigger a recalculation
                    target.from = this.from;
                    target.knots = this.knots;
                    // updateDisplay on the target from and knots will update the UI
                    target.guiFrom.updateDisplay()
                    target.guiKnots.updateDisplay()

                }
            }
        }

        this.dontRecurse = false;

        // var A = Sit.jetOrigin.clone()
        //
        // var B = A.clone().add(this.p().multiplyScalar(Sit.frames))
        // DebugArrowAB(this.id+" Wind",A,B,this.arrowColor,true,GlobalScene)
    }


}

export class CNodeDisplayWindArrow extends CNode {
    constructor(v) {
        super(v)
        this.input("source")
        this.input("displayOrigin",true)
        if (!this.in.displayOrigin) {
            this.addInput("displayOrigin", new CNodeOrigin({}))
        }
        this.arrowColor = v.arrowColor ?? "white"
        this.recalculate();
    }

    recalculate() {
    //    var A = Sit.jetOrigin.clone()
        var A = this.in.displayOrigin.p(0);
        var B = A.clone().add(this.in.source.p().multiplyScalar(10000))
        DebugArrowAB(this.id+" Wind",A,B,this.arrowColor,true,GlobalScene)
    }
}