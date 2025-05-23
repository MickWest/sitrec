import {LLAToEUS} from "../LLA-ECEF-ENU";
import {FileManager, NodeMan} from "../Globals";
import {MISB, MISBFields} from "../MISBUtils";
import {CNodeEmptyArray} from "./CNodeArray";
import {saveAs} from "../js/FileSaver";

import {CNodeLOSTrackMISB} from "./CNodeLOSTrackMISB";
import {makeArrayNodeFromMISBColumn} from "./CNodeArrayFromMISBColumn";

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

        this.exportable = v.exportable ?? false;
        if (this.exportable) {
            NodeMan.addExportButton(this, "exportMISBCSV", "MISB ")
        }
    }

    exportMISBCSV() {
        let csv = ""
        // MISB is an object of name -> index pairs, so we can get the column name from the index
        // but have to search for it.
        for (let i=0;i<MISBFields;i++) {
            let name = "unknown";
            for (let key in MISB) {
                if (MISB[key] === i) {
                    name = key;
                    break;
                }
            }
            csv = csv + name + (i<MISBFields-1?",":"\n");
        }

        for (let f=0;f<this.misb.length;f++) {
            for (let i=0;i<MISBFields;i++) {
                let value = this.misb[f][i];
                // if not null and an object, then replace with "COMPLEX"
                // (null is considered an object - a quirk of JS)
                if (value !== null && typeof value === "object") {
                        value = "COMPLEX"
                }

                csv = csv + value + (i<MISBFields-1?",":"\n");
            }
        }
        saveAs(new Blob([csv]), "MISB-DATA"+this.id+".csv")
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
            // we only handle rows that have valid data
            if (this.isValid(f)) {
                var pos = LLAToEUS(this.getLat(f), this.getLon(f), this.getAlt(f));
                this.array.push({position: pos})
            } else {
                // otherwise, just give it an empty structure
                console.warn("CNodeMISBDataTrack: invalid data at frame " + f + " in track " + this.id + " lat=" + this.getLat(f) + " lon=" + this.getLon(f) + " alt=" + this.getAlt(f));
                console.warn("Returning empty object {}")
                this.array.push({})
            }

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

    getRawAlt(i) {
        return Number(this.misb[i][this.altCol])
    }

    adjustAlt(a) {
        if (this.altitudeLock !== undefined && this.altitudeLock !== -1) {
            return this.altitudeLock;
        } else if (this.altitudeOffset !== undefined) {
            return a + this.altitudeOffset
        }
        return a;
    }


    getAlt(i) {
        let a = Number(this.misb[i][this.altCol])
        return this.adjustAlt(a);
    }

    getTime(i) {
        let time = Number(this.misb[i][MISB.UnixTimeStamp])
        // check to see if it's in milliseconds or microseconds
        if (time > 31568461000000) {   // 31568461000000 is 1971 using microseconds, but 2970 using milliseconds
            time = time / 1000
        }
        return time
    }

    // given a time, find the first frame that is at or after that time
    getIndexAtTime(time) {
        let points = this.misb.length
        for (let f = 0; f < points; f++) {
            if (this.getTime(f) >= time) {
                return f;
            }
        }
        return 0
    }

    // get EUS position at frame i
    getPosition(i) {
        return LLAToEUS(this.getLat(i), this.getLon(i), this.getAlt(i));
    }

    // given a time in ms (UNIX time), return the position at that time
    getPositionAtTime(time) {
        return this.getPosition(this.getIndexAtTime(time));
    }


    // a slot is valid if it has a valid timestamp
    // and the lat/lon/alt are not NaN
    isValid(slotNumber) {
        let lat = this.getLat(slotNumber)
        let lon = this.getLon(slotNumber)
        let alt = this.getAlt(slotNumber)
        let time = this.getTime(slotNumber)

        // time is in unix time, check its a number and from 1970 to 2100
        if (isNaN(time) || time < 0 || time > 4102444800000) return false
        // lat, lon, alt are floats, check they are not NaN
        if (isNaN(lat) || isNaN(lon) || isNaN(alt)) return false
        // check lat is -90 to 90
        if (lat < -90 || lat > 90) return false
        // and lon is -180 to 180, but allow to 360 as some data might be 0..360, or even (unlikely) -360..0
        // basically jsut checking they are reasonable numbers
        if (lon < -360 || lon > 360) return false
        // and alt is a positive number, allowing a little leeway for the ground
        if (alt < -1000) return false
        // nothing beyond geostationary orbit
        // not expecting anything out of the atmosphere, but just in case.
        // again just checking for reasonable numbers
        if (alt > 36000000) return false

        // check for zeros, as they are likely to be invalid
        if (lat ===0 ) {
            // check if the last valid slot's lat was near zero, if so we allow this
            if (this.lastValidSlot === undefined || Math.abs(this.getLat(this.lastValidSlot)) > 1.0) {
                return false;
            }
        }

        if (lon ===0 ) {
            // check if the last valid slot's lon was near zero, if so we allow this
            if (this.lastValidSlot === undefined || Math.abs(this.getLon(this.lastValidSlot)) > 1.0) {
                return false;
            }
        }

        if (alt ===0 ) {
            // always allow alt === 0, as it's common for grounded planes (ADS-B)
            // maybe we might want to check if it is on the ground and use terrain elevation?
            // // check if the last valid slot's alt was near zero, if so we allow this
            // if (this.lastValidSlot === undefined || Math.abs(this.getAlt(this.lastValidSlot)) > 1000) {
            //     return false;
            // }
            if (!this.warnedAboutZeroAltitude)
                console.warn("Altitude is zero at slot " + slotNumber + " (and maybe others) in track " + this.id+" (allowed, likely grounded plane)");
            this.warnedAboutZeroAltitude = true;
        }



        this.lastValidSlot = slotNumber;


        return true;

    }


    recalculate() {
        this.makeArrayForTrackDisplay()
    }
}


// given a track with MISB style platform and sensor Az/El/Roll
// extract them into arrays and then use those arrays
// to create CNodeLOSTrackMISB
export function makeLOSNodeFromTrackAngles(trackID, data) {
    const cameraTrackAngles = NodeMan.get(trackID);
    const smooth = data.smooth ?? 0;

    makeArrayNodeFromMISBColumn(trackID+"platformHeading", cameraTrackAngles, data.platformHeading ?? MISB.PlatformHeadingAngle, smooth, true)
    makeArrayNodeFromMISBColumn(trackID+"platformPitch", cameraTrackAngles, data.platformPitch ?? MISB.PlatformPitchAngle, smooth, true)
    makeArrayNodeFromMISBColumn(trackID+"platformRoll", cameraTrackAngles, data.platformRoll ?? MISB.PlatformRollAngle, smooth, true)
    makeArrayNodeFromMISBColumn(trackID+"sensorAz", cameraTrackAngles, data.sensorAz ?? MISB.SensorRelativeAzimuthAngle, smooth, true)
    makeArrayNodeFromMISBColumn(trackID+"sensorEl", cameraTrackAngles, data.sensorEl ?? MISB.SensorRelativeElevationAngle, smooth, true)
    makeArrayNodeFromMISBColumn(trackID+"sensorRoll", cameraTrackAngles, data.sensorRoll ?? MISB.SensorRelativeRollAngle, smooth, true)

    const node = new CNodeLOSTrackMISB({
        id: data.id ?? trackID+"_LOS", cameraTrack: trackID,
        platformHeading: trackID+"platformHeading", platformPitch: trackID+"platformPitch", platformRoll: trackID+"platformRoll",
        sensorAz: trackID+"sensorAz", sensorEl: trackID+"sensorEl", sensorRoll: trackID+"sensorRoll"
    })

    return node;
}

export function removeLOSNodeColumnNodes(trackID) {
    console.log("removeLOSNodeColumnNodes: trackID="+trackID);
    NodeMan.disposeRemove(trackID+"platformHeading")
    NodeMan.disposeRemove(trackID+"platformPitch")
    NodeMan.disposeRemove(trackID+"platformRoll")
    NodeMan.disposeRemove(trackID+"sensorAz")
    NodeMan.disposeRemove(trackID+"sensorEl")
    NodeMan.disposeRemove(trackID+"sensorRoll")
}

