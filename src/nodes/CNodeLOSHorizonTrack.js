// Track of LOS intersection with the cloud horizon
// i.e. the point on on the LOS closes to the horizon viewed from the LOS start point in the direction of the LOS
import {CNodeArray, CNodeEmptyArray} from "./CNodeArray";
import {calcHorizonPoint} from "../SphericalMath";
import {metersFromMiles} from "../utils";
import {NodeMan} from "../Globals";
import {CNodeCloudData} from "./CNodeCloudData";

export class CNodeLOSHorizonTrack extends CNodeEmptyArray {
    constructor(v) {
        super(v);
        this.checkInputs(["LOS", "cloudAltitude", "radius"])
        this.recalculate()
    }

    recalculate() {
        this.array = []
        this.frames = this.in.LOS.frames
        for (var f = 0; f < this.frames; f++) {
            const cloudAlt = this.in.cloudAltitude.v(f) // unlikely to change, but what the heck!

            var A = this.in.LOS.p(f)
            var fwd = this.in.LOS.v(f).heading.clone()

            const horizonPoint = calcHorizonPoint(A, fwd, cloudAlt, metersFromMiles(this.in.radius.v(0)))

            this.array.push({position: horizonPoint})

        }
    }
}
