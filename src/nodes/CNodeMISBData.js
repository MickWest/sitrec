import {LLAToEUS} from "../LLA-ECEF-ENU";
import {FileManager} from "../Globals";
import {MISB} from "../MISBUtils";
import {CNodeEmptyArray} from "./CNodeArray";

//export const MISBFields = Object.keys(MISB).length;

// export const MISB_Aliases = {
//     // PrecisionTimeStamp uses microseconds not milliseconds
//     // so any conversion will have to detect this and multiply by 1000
//     PrecisionTimeStamp: MISB.UnixTimeStamp,
// }


export class CNodeMISBDataTrack extends CNodeEmptyArray {
    constructor(v) {
        super(v);
//        this.misb = FileManager.get(v.misbFile)

        // if v.misb is an array then it's the data, otherwise it's a file name
        // of an already converted MISB file
        if (Array.isArray(v.misb)) {
            this.misb = v.misb;
        } else {
            this.misb = FileManager.get(v.misb)
        }

        this.selectSourceColumns(v.columns || ["SensorLatitude", "SensorLongitude", "SensorTrueAltitude"]);

        this.recalculate()
    }

    // given an array of the MISB column names for lat,lon,alt
    // then store the column indices for the lat, lon, and alt
    // this is soe we can switch between the sensor LLA, the frame center LLA, and the corners
    selectSourceColumns(columns) {
        this.latCol = MISB[columns[0]]
        this.lonCol = MISB[columns[1]]
        this.altCol = MISB[columns[2]]
    }

    // to display the full length track of original source data, (like, for a KML)
    // we need to make an array of EUS positions for each point in the track
    // NOTE: this is a DATA track, not a camera/position
    // and this array is just to display the shape of the track,
    makeArrayForTrackDisplay() {
        this.array = [];
        var points = this.misb.length
        for (var f = 0; f < points; f++) {
//            var pos = LLAToEUS(this.coord[f].lat, this.coord[f].lon, this.coord[f].alt)
            var pos = LLAToEUS(this.getLat(f), this.getLon(f), this.getAlt(f));
            this.array.push({position: pos})
        }
        this.frames = points;

    }

    getTrackStartTime() {
        return this.getTime(0)
    }

    getLat(i) {
        return Number(this.misb[i][this.latCol]);
    }

    getLon(i) {
        return Number(this.misb[i][this.lonCol]);
    }

    getAlt(i) {
        return Number(this.misb[i][this.altCol]);
    }

    getTime(i) {
        let time = Number(this.misb[i][MISB.UnixTimeStamp])
        // check to see if it's in milliseconds or microseconds
        if (time > 31568461000000) {   // 31568461000000 is 1971 using microseconds, but 2970 using milliseconds
            time = time / 1000
        }
        return time
    }

    recalculate() {
        this.makeArrayForTrackDisplay()
    }
}