// given a LOS node and a radius
// we either have an "altitude" node for constant altitude
// or "startDist" to start at a particular distance along the first line
import {Ray} from "three";
import {CNodeTrack} from "./CNodeTrack";
import {Vector3} from "three";
import {DebugArrowAB} from "../threeExt";

export class CNodeLOSTraverseCloseToTarget extends CNodeTrack {
    constructor(v) {
        super(v);
        this.input("LOS")
        this.input("target")
        this.array = []
        this.recalculate()
    }

    recalculate() {
        this.array = [];
        this.frames = this.in.LOS.frames



        for (let f = 0; f < this.frames; f++) {

            // get the LOS position and heading
            const los = this.in.LOS.v(f)
            const start = los.position.clone();
            const heading = los.heading.clone();

            // get the target position
            const target = this.in.target.p(f)

            // assume start  and heading (not necessarily unit-length) are THREE.Vector3
            const dir = heading.clone().normalize();      // unit direction

            const closest = new Vector3();
            new Ray(start, dir).closestPointToPoint(target, closest);

            if (f %100 === 0) {
                DebugArrowAB("LOS"+f, start, los.position,"#00FF00")
            }


            const result = {
                position: closest.clone(),
            }

            this.array.push(result)
        }

    }

    getValueFrame(f) {
        return this.array[f]
    }

}
