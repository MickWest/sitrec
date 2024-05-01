// Simple LOS Traversal for EITHER of:
// VcMPH (Closing Velocity in MPH, not really useful
// range (distance from the plane - i.e. a fixed distance.
import {NodeMan} from "../Globals";
import {CNode} from "./CNode";
import {metersFromMiles, metersFromNM, unitsToMeters} from "../utils";
import {CNodeCloudData} from "./CNodeCloudData";

export class CNodeLOSTraverse extends CNode {
    constructor(v) {
        super(v);
        this.requireInputs(["LOS"])
        this.optionalInputs(["startDist", "VcMPH", "range"])

        // historically this was in nautical miles, but we allow the user to specify
        this.units = v.units ?? "NM";

        this.array = []
        this.recalculate()
    }

    recalculate() {
        this.array = [];
        this.frames = this.in.LOS.frames

        // Range values are for like the gimbal video, range in NM, very specific, don't use for other thigns.
        if (this.in.range !== undefined) {
            for (let f = 0; f < this.frames; f++) {

//                const dist = metersFromNM(this.in.range.v(f))
                const dist = unitsToMeters(this.units, this.in.range.v(f))
                const los = this.in.LOS.v(f)
                let position = los.position.clone();
                let heading = los.heading.clone();
                heading.multiplyScalar(dist)
                position.add(heading)
                this.array.push({position: position})
            }

        } else {

            let start = this.in.startDist.v(0)
            let end = start;
            if (this.in.endDist !== undefined)
                end = this.in.endDist.v(0)


            if (this.in.VcMPH !== undefined)
                end = start + metersFromMiles(this.in.VcMPH.v(f)) / 60 / 60 / this.fps * this.frames

            let dist = start
            const distStep = (end - start) / (this.frames - 1)
            for (var f = 0; f < this.frames; f++) {

                const los = this.in.LOS.v(f)

                let position = los.position.clone();
                let heading = los.heading.clone();
                heading.multiplyScalar(dist)
                position.add(heading)
                this.array.push({position: position})

                dist += distStep
            }
        }
    }

    getValueFrame(f) {
        return this.array[f]
    }

}

