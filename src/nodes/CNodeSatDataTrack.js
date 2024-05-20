import {CNodeEmptyArray} from "./CNodeArray";

// WORK IN PROGRESS
// WORK IN PROGRESS
// WORK IN PROGRESS
// WORK IN PROGRESS

export class CNodeTimeseries extends CNodeEmptyArray {
}


export class CNodeSatDataTrack extends CNodeTimeseries  {
    constructor(v) {
        super(v);
        this.addInput("nightSky", "NightSkyNode");
        this.satName = v.sat;
        // get the night sky node



        this.sat = this.satData.getSat(this.satName);

        this.secsBefore = v.secsBefore ?? 0;
        this.secsAfter = v.secsAfter ?? 0;
        this.recalculate()
    }

    recalculate() {
        const tleData = this.in.nightSky.TLEData;
    }

    getPositionAtTime(t) {
/// WORK IN PROGRESS
    }

}