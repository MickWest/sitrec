import {cos, f2m, interpolate, sin} from "../utils";
import {GlobalDateTimeNode, NodeMan, Sit} from "../Globals";
import {LLAToEUS, RLLAToECEFV_Sphere, wgs84} from "../LLA-ECEF-ENU";

import {MISB} from "../MISBUtils";
import {saveAs} from "../js/FileSaver";
import {CNodeTrack} from "./CNodeTrack";
import {assert} from "../assert.js";
import {CGeoJSON} from "../geoJSONUtils";
import {isLocal} from "../configUtils.js"
import stringify from "json-stringify-pretty-compact";
import {Vector3} from "three";
import {Matrix3} from "three";
import {Matrix4} from "three";

export class CNodeTrackFromMISB extends CNodeTrack {
    constructor(v) {

        const exportable = v.exportable ?? false;
        v.exportable = false; // we don't want the export button on the array

        super(v);
    //    this.kml = FileManager.get(v.cameraFile)

        this._columns = v.columns || ["SensorLatitude", "SensorLongitude", "SensorTrueAltitude"]

//        console.log("CNodeTrackFromMISB:constructor(): columns[2] = ",this._columns[2])

        this.input("misb")


        this.cacheValues();


        this.addInput("startTime",GlobalDateTimeNode)
        this.recalculate()

        this.exportable = exportable;
        if (this.exportable) {
            NodeMan.addExportButton(this, "exportTrackCSV", "CSV ")
            if (isLocal) {
                if (Sit.name === "custom") {
                    // limited to local custom use, as it triggers "more than one export button" warning
                    NodeMan.addExportButton(this, "exportGEOJSON", "GEOJSON ")
                    NodeMan.addExportButton(this, "exportALLGEO", "ALLGEO")
                    NodeMan.addExportButton(this, "exportCustom1", "Custom1 ")
                }
            }
        }
    }


    cacheValues() {
        const misb = this.in.misb;
        misb.selectSourceColumns(this._columns);
        this.latArray = [];
        this.lonArray = [];
        this.rawAltArray = [];
        this.timeArray = [];
        this.validArray = [];

        const len = this.inputs.misb.misb.length;
        for (let i = 0; i < len; i++) {
            this.latArray.push(misb.getLat(i));
            this.lonArray.push(misb.getLon(i));
            this.rawAltArray.push(misb.getRawAlt(i)); // TODO: needs alt adjustments. add a getAlt function to this

            this.timeArray.push(misb.getTime(i));
            this.validArray.push(misb.isValid(i));
        }
    }


    // export the track as a CSV file (only used for testing Custom1 import functionality
    exportCustom1() {
        let csv = "TIME,MGRS,LAT_DMS,LON_DMS,LAT,LONG,LAT_DDM,LON_DDM,ALTITUDE,AIRCRAFT,CALLSIGN,SPEED_KTS\n"
        const misb = this.in.misb;
        misb.selectSourceColumns(this._columns);
        var points = misb.misb.length
        const id = this.shortName ?? this.id;
        for (let slot = 0; slot < points; slot++) {
            const time = misb.getTime(slot);
            const date = new Date(time)
            // we want one with the seconds, not the milliseconds
            const dateStr = date.toISOString().slice(0,19)+"Z";
            csv += dateStr + ","
                + "," + "," + ","
                + misb.getLat(slot) + "," + misb.getLon(slot) + ","
                + "," + ","
                + misb.getAlt(slot) + ","
                + "F-15" + ","+ id + ","
                + 0 + "\n" // speed is currently ignored


        }

        saveAs(new Blob([csv]), "Custom1-"+this.id+".csv")


    }


    exportGEOJSON() {
        const geo = new CGeoJSON()

        const json = JSON.stringify(geo.json)

        console.log("CNodeTrackFromMISB:exportGEOJSON(): json = ", json)


        saveAs(new Blob([json]), "trackFromMISB-"+this.id+".json")

    }


    addToGeoJSON(geo) {
        const misb = this.in.misb;
        misb.selectSourceColumns(this._columns);
        var points = misb.misb.length
        const id = this.id;
        for (let slot = 0; slot < points; slot++) {
            geo.addPoint(id, misb.getLat(slot), misb.getLon(slot), misb.getAlt(slot), misb.getTime(slot))
        }
    }

    // export ALL the misb derived tracks as GEOJSON
    exportALLGEO() {
        const geo = new CGeoJSON();
        name = "";
        NodeMan.iterate((key, node) => {
            if (node instanceof CNodeTrackFromMISB) {
                name += node.id + "_";
                node.addToGeoJSON(geo);
            }
        })

        const json = stringify(geo.json, {maxLength: 180, indent: 2})
        console.log("CNodeTrackFromMISB:exportGEOJSON(): json = ", json)
        saveAs(new Blob([json]), name+".json")
    }


    exportTrackCSV() {
        // let csv = "Frame,Lat,Lon,Alt\n"
        // for (let f=0;f<this.frames;f++) {
        //     const pos = this.array[f].lla
        //     csv += f + "," + (pos[0]) + "," + (pos[1]) + "," + f2m(pos[2]) + "\n"
        // }
        // saveAs(new Blob([csv]), "trackFromMISB-"+this.id+".csv")
        this.exportArray();
    }


    patchColumn(misb, column, test, defaultValue)
    {
        // first find the first valid value (if any)
        const points = misb.misb.length;
        let validValue;
        for (let slot = 0; slot < points; slot++) {
            const value = misb.misb[slot][column]
            if (value !== undefined && value !== null) {
                const valueNumber = Number(value)
                // use only valid FOV values
                if (test(valueNumber)) {
                    validValue = value
//                    console.log("CNodeTrackFromMISB:recalculate(): FIRST validValue = " + validValue);
                    break
                }
            }
        }

        if (validValue === undefined) {
            if (defaultValue !== undefined) {
                validValue = defaultValue
            } else {
//                console.log(this.id + " CNodeTrackFromMISB:recalculate(): No valid patch values found, column = " + column);
                return false
            }
        }

        // // now go over all the slots, if invalid, the patch with validValue
        // // if valid, then update validValue
        for (let slot = 0; slot < points; slot++) {
            const value = misb.misb[slot][column]
            if (value !== undefined && value !== null) {
                const valueNumber = Number(value)
                // use only valid FOV values, so if this is valid, we'll use it for subsequent invald rows
                if (!isNaN(valueNumber) && valueNumber > 0 && valueNumber < 180) {
                    validValue = value
                } else {
                    console.log("Replacing invalid FOV value: " + value + " with validValue = " + validValue)
                    misb.misb[slot][column] = validValue;
                }
            } else {
                misb.misb[slot][column] = validValue;
            }

          //  console.log("CNodeTrackFromMISB:recalculate(): slot = " + slot + " misb.misb[slot][column] = " + misb.misb[slot][column]);
        }
        return (validValue !== undefined)
    }
    

    // the data track is no more, and now we will make this direcly from the MISB data
    // and add gettor function to the MISB data node in CNodeMISBData.js
    // start with the postin and FOV.

    recalculate() {
       // var startTime = this.in.startTime.getStartTimeString()
        var msStart = this.in.startTime.getStartTimeValue()

        const misb = this.in.misb;
        misb.selectSourceColumns(this._columns);

        this.array = [];
        this.frames = Sit.frames;
        this.useSitFrames = true; // flag to say we need recalculate if Sit.frames changes

        assert(this.frames === Math.floor(this.frames),`Frames must be an integer, it's ${this.frames}`)

     //   const data = this.in.timedData.data;

        // now find the first time pair that our start time falls in

//        console.log("Start time: "+ startTime+" = "+msStart+" ms")
        var points = misb.misb.length
        assert(points > 1, "Not enough data to make a track for " + this.id)
        var slot = 0;
        var msNeeded = Sit.frames*Sit.fps*1000;
        var msEnd = msStart+msNeeded
        var frameTime = 0 // keep count for time for this frame in seconds


        // patch the fov values in the misb column, overwriting any ilegal or missing values

        // EXTRACT as not changing
        let validFOV = this.patchColumn(misb, MISB.SensorVerticalFieldofView,
            (n) => {return !isNaN(n) && n > 0 && n < 180;}
        )

        let validWindDirection = this.patchColumn(misb, MISB.WindDirection,
            (n) => {return !isNaN(n) && n >= 0 && n < 360}
        )

        let validWindSpeed = this.patchColumn(misb, MISB.WindSpeed,
            (n) => {return !isNaN(n) && n >= 0 && n < 400} // 400 knots is a bit much, but it's a reasonable limit
        )


        const rSitLat = Sit.lat * Math.PI / 180
        const rSitLon = Sit.lon * Math.PI / 180

        // convert ECEF (ecefX, ecefY, ecefZ) to ENU (east, north, up)
        const cosSitLat = Math.cos(rSitLat)
        const sinSitLat = Math.sin(rSitLat)
        const cosSitLon = Math.cos(rSitLon)
        const sinSitLon = Math.sin(rSitLon)

        const lon1 = rSitLon
        const lat1 = rSitLat
        const radius = wgs84.RADIUS;



// I'm now precalculating a lot for speed. Could do more.
// Build ECEF to ENU rotation
        const mECEF2ENU = new Matrix3().set(
            -Math.sin(lon1),                    Math.cos(lon1),                      0,
            -Math.sin(lat1)*Math.cos(lon1), -Math.sin(lat1)*Math.sin(lon1), Math.cos(lat1),
            Math.cos(lat1)*Math.cos(lon1),  Math.cos(lat1)*Math.sin(lon1), Math.sin(lat1)
        );

// Compose ENU → EUS swap
        const mENUtoEUS = new Matrix3().set(
            1, 0,  0,
            0, 0,  1,
            0, -1, 0
        );

// Final rotation
        const mECEF2EUS_3x3 = new Matrix3().multiplyMatrices(mENUtoEUS, mECEF2ENU);

// Promote to Matrix4
        const mECEF2EUS = new Matrix4();

// Assign that combined 3x3 rotation into top-left of 4x4
        const e = mECEF2EUS.elements;
        const r = mECEF2EUS_3x3.elements;

        e[0] = r[0]; e[4] = r[3]; e[8]  = r[6]; e[12] = 0;
        e[1] = r[1]; e[5] = r[4]; e[9]  = r[7]; e[13] = 0;
        e[2] = r[2]; e[6] = r[5]; e[10] = r[8]; e[14] = 0;
        e[3] = 0;    e[7] = 0;    e[11] = 0;    e[15] = 1;


// Translation
        const originECEF = RLLAToECEFV_Sphere(lat1, lon1, 0, wgs84.RADIUS);
        const translation = new Matrix4().makeTranslation(-originECEF.x, -originECEF.y, -originECEF.z);

// Final matrix: rotate * translate

        // TODO!!! this should be global, and used in many other places for ECEF->EUS
        mECEF2EUS.multiply(translation);

        for (var f=0;f<Sit.frames;f++) {
            var msNow = msStart + Math.floor(frameTime*1000)
            // advance the slot if needed
            while (slot < points-1) {
                // we need at least two good consecutive slots
                if (this.validArray[slot] && this.validArray[slot+1]) {
                    const nextDataTime = this.timeArray[slot + 1];
                    if (nextDataTime > msNow) {
                        break
                    }
                }
                slot++;
            }

          //  if (slot < points-1) {

              if (slot < points-1) {
                  // for the in-range slots, check the time is increasing
                  // which means the data is good and we can interpolate
                  assert(this.timeArray[slot + 1] > this.timeArray[slot], "Time data is not increasing slot =" + slot + " time=" + this.timeArray[slot] + " next time=" + misb.getTime(slot + 1));
              } else {
                  // use the last two slots and interpolate (extrapolate) the position
                  slot = points - 2

              }


            // is either is invalid, then go back until we find a valid pair
            // this should only kick in at the end of the track
            while ((!this.validArray[slot] || !this.validArray[slot+1]) && slot > 0) {
                slot--
            }

            // note the extrapolation will work for slot <0 as well as slot > points-1
            // however we might want to do something different for out or range
            // as the first and last pairs of data points might not be good

            assert(this.validArray[slot], "slot " + slot + " is not valid, id=" + this.id)
            assert(this.validArray[slot+1], "slot+1 " + (slot+1) + " is not valid, id=" + this.id)


            assert(this.timeArray[slot+1] > this.timeArray[slot], "Time data is not increasing slot =" + slot + " time=" + this.timeArray[slot] + " next time=" + this.timeArray[slot+1]);

           // assert(slot < points, "not enough data, or a bug in your code - Time wrong? id=" + this.id)
            const fraction = (msNow - this.timeArray[slot]) / (this.timeArray[slot + 1] - this.timeArray[slot])
            const lat = interpolate(this.latArray[slot], this.latArray[slot +1], fraction);
            const lon = interpolate(this.lonArray[slot], this.lonArray[slot +1], fraction);
            const alt = misb.adjustAlt(interpolate(this.rawAltArray[slot], this.rawAltArray[slot +1], fraction));


            //const pos = LLAToEUS(lat, lon, alt)

            // expanded LLAToEUS out for speed
            const rLat = lat * Math.PI / 180
            const rLon = lon * Math.PI / 180
            const cosLat = Math.cos(rLat)
            const sinLat = Math.sin(rLat)
            const cosLon = Math.cos(rLon)
            const sinLon = Math.sin(rLon)
            const radiusAlt = radius + alt;

            // convert LLA to ECEF, including altitude
            const ecefX = radiusAlt * cosLat * cosLon;
            const ecefY = radiusAlt * cosLat * sinLon;
            const ecefZ = radiusAlt * sinLat;

            // convert ECEF to ENU
            // const ecef = new Vector3(ecefX, ecefY, ecefZ);
            // const enu = ecef.clone().sub((originECEF)).applyMatrix3(mECEF2ENU)
            // // and store as EUS
            // const pos = new Vector3(enu.x, enu.z, -enu.y)

            // Final transformation in one step

            const pos = new Vector3(ecefX, ecefY, ecefZ );
            pos.applyMatrix4(mECEF2EUS);
            // const posY = pos.y;
            // pos.y = pos.z;
            // pos.z = -posY;
            //const pos = new Vector3(ecef_enu.x, ecef_enu.z, -ecef_enu.y)


            // end expanded LLAToEUS
            ///////////////////////////////////////////////////////////////////////



            // end product, a per-frame array of positions
            // that is a track.

            assert(!Number.isNaN(pos.x),"CNodeTrackFromMISB:recalculate(): pos.x NaN " + "lat = " + lat + " lon = " + lon + " alt = " + alt)

            // minumum data that is needed (no clone need as it's done in the expanded LLAToEUS)
            const product = {position: pos, lla:[lat,lon,alt]}

            // // uniterpolated extra fields
            // const extraFields = [
            //     "focal_len",
            //     "heading",
            //     "pitch",
            //     "roll",
            //     "gHeading",
            //     "gPitch",
            //     "gRoll",
            // ]

            // only copy the vFov if it's actually there
            // need this check for drag-and-drop
            if (validFOV) {
                const misbFOV = misb.misb[slot][MISB.SensorVerticalFieldofView]
                if (misbFOV !== undefined) {
                    const misbFOVNumber = Number(misbFOV)
                    // use only valid FOV values
                    if (!isNaN(misbFOVNumber) && misbFOVNumber > 0 && misbFOVNumber < 180) {
                        product["vFOV"] = misbFOVNumber;
//                        console.log("CNodeTrackFromMISB:recalculate(): product[\"vFOV\"] = ", product["vFOV"])
                    } else {
                        assert(0, "CNodeTrackFromMISB:recalculate(): invalid FOV value: " + misbFOV)
                    }
                }
            }

            // store the interpolated LLA for exporting
            product["lla"] = [lat,lon,alt];

            // we store a reference to the misb row for later use
            // so we can extract other data from it as needed
            product["misbRow"] = misb.misb[slot];


            this.array.push(product)

            frameTime += Sit.simSpeed/Sit.fps
        }


    }

}




