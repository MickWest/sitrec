import {f2m, interpolate} from "../utils";
import {GlobalDateTimeNode, NodeMan, Sit} from "../Globals";
import {LLAToEUS} from "../LLA-ECEF-ENU";

import {MISB} from "../MISBUtils";
import {saveAs} from "../js/FileSaver";
import {CNodeTrack} from "./CNodeTrack";
import {assert} from "../assert.js";
import {CGeoJSON} from "../geoJSONUtils";
import {isLocal} from "../../config";
import stringify from "json-stringify-pretty-compact";

export class CNodeTrackFromMISB extends CNodeTrack {
    constructor(v) {

        const exportable = v.exportable ?? false;
        v.exportable = false; // we don't want the export button on the array

        super(v);
    //    this.kml = FileManager.get(v.cameraFile)

        this.columns = v.columns || ["SensorLatitude", "SensorLongitude", "SensorTrueAltitude"]

        console.log("CNodeTrackFromMISB:constructor(): columns[2] = ",this.columns[2])

        this.input("misb")

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


    // export the track as a CSV file (only used for testing Custom1 import functionality
    exportCustom1() {
        let csv = "TIME,MGRS,LAT_DMS,LON_DMS,LAT,LONG,LAT_DDM,LON_DDM,ALTITUDE,AIRCRAFT,CALLSIGN,SPEED_KTS\n"
        const misb = this.in.misb;
        misb.selectSourceColumns(this.columns);
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
        misb.selectSourceColumns(this.columns);
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
                    console.log("CNodeTrackFromMISB:recalculate(): FIRST validValue = " + validValue);
                    break
                }
            }
        }

        if (validValue === undefined) {
            if (defaultValue !== undefined) {
                validValue = defaultValue
            } else {
                console.log(this.id + " CNodeTrackFromMISB:recalculate(): No valid patch values found, column = " + column);
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
        misb.selectSourceColumns(this.columns);

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

        let validFOV = this.patchColumn(misb, MISB.SensorVerticalFieldofView,
            (n) => {return !isNaN(n) && n > 0 && n < 180;}
        )

        let validWindDirection = this.patchColumn(misb, MISB.WindDirection,
            (n) => {return !isNaN(n) && n >= 0 && n < 360}
        )

        let validWindSpeed = this.patchColumn(misb, MISB.WindSpeed,
            (n) => {return !isNaN(n) && n >= 0 && n < 400} // 400 knots is a bit much, but it's a reasonable limit
        )


        
        for (var f=0;f<Sit.frames;f++) {
            var msNow = msStart + Math.floor(frameTime*1000)
            // advance the slot if needed
            while (slot < points-1) {
                // we need at least two good consecutive slots
                if (misb.isValid(slot) && misb.isValid(slot+1)) {
                    const nextDataTime = misb.getTime(slot + 1);
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
                  assert(misb.getTime(slot + 1) > misb.getTime(slot), "Time data is not increasing slot =" + slot + " time=" + misb.getTime(slot) + " next time=" + misb.getTime(slot + 1));
              } else {
                  // use the last two slots and interpolate (extrapolate) the position
                  slot = points - 2

              }


            // is either is invalid, then go back until we find a valid pair
            // this should only kick in at the end of the track
            while ((!misb.isValid(slot) || !misb.isValid(slot+1)) && slot > 0) {
                slot--
            }

            // note the extrapolation will work for slot <0 as well as slot > points-1
            // however we might want to do something different for out or range
            // as the first and last pairs of data points might not be good

            assert(misb.isValid(slot), "slot " + slot + " is not valid, id=" + this.id)
            assert(misb.isValid(slot+1), "slot+1 " + (slot+1) + " is not valid, id=" + this.id)


            assert(misb.getTime(slot+1) > misb.getTime(slot), "Time data is not increasing slot =" + slot + " time=" + misb.getTime(slot) + " next time=" + misb.getTime(slot+1));

           // assert(slot < points, "not enough data, or a bug in your code - Time wrong? id=" + this.id)
            const fraction = (msNow - misb.getTime(slot)) / (misb.getTime(slot + 1) - misb.getTime(slot))
            const lat = interpolate(misb.getLat(slot), misb.getLat(slot + 1), fraction);
            const lon = interpolate(misb.getLon(slot), misb.getLon(slot + 1), fraction);
            const alt = interpolate(misb.getAlt(slot), misb.getAlt(slot + 1), fraction);

            const pos = LLAToEUS(lat, lon, alt)
            // end product, a per-frame array of positions
            // that is a track.

            assert(!Number.isNaN(pos.x),"CNodeTrackFromMISB:recalculate(): pos.x NaN " + "lat = " + lat + " lon = " + lon + " alt = " + alt)

            // minumum data that is needed
            const product = {position: pos.clone(), lla:[lat,lon,alt]}

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
                        console.log("CNodeTrackFromMISB:recalculate(): product[\"vFOV\"] = ", product["vFOV"])
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




