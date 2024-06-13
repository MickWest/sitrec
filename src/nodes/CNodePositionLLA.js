// A node that returns a EUS vector position based on LLA input
// Can be defined by a lat, lon, and alt
// or a LLA array of three values
import {LLAToEUS} from "../LLA-ECEF-ENU";
import {CNode} from "./CNode";

export class CNodePositionLLA extends CNode {
    constructor(v) {
        super(v);

        if (v.LLA != undefined) {
            // copy the array in v.LLA to this.LLA
            this.LLA = v.LLA.slice()
        } else {

            this.input("lat")
            this.input("lon")
            this.input("alt")
        }
        this.recalculate()
    }

    recalculate() {
    }

    // return vector3 EUS for the specified LLA (animateabel)
    getValueFrame(f) {
        if (this.LLA !== undefined) {
            return LLAToEUS(this.LLA[0], this.LLA[1], this.LLA[2])
        }
        const lat = this.in.lat.v(f)
        const lon = this.in.lon.v(f)
        const alt = this.in.alt.v(f)
        return LLAToEUS(lat, lon, alt)
    }


}

export function makePositionLLA(id, lat, lon, alt) {
    return new CNodePositionLLA({
        id: id,
        lat: lat, lon: lon, alt: alt
    })
}