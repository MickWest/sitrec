import {f2m, interpolate} from "../utils";
import {Sit, GlobalDateTimeNode, FileManager, NodeMan} from "../Globals";
import {LLAToEUS} from "../LLA-ECEF-ENU";

import {MISB} from "../MISBUtils";
import {saveAs} from "../js/FileSaver";
import {CNodeTrack} from "./CNodeTrack";
import {assert} from "../assert.js";

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
            NodeMan.addExportButton(this, "exportTrackCSV", "Export Track CSV ")
        }
    }

    exportTrackCSV() {
        let csv = "Frame,Lat,Lon,Alt\n"
        for (let f=0;f<this.frames;f++) {
            const pos = this.array[f].lla
            csv += f + "," + (pos[0]) + "," + (pos[1]) + "," + f2m(pos[2]) + "\n"
        }
        saveAs(new Blob([csv]), "trackFromMISB-"+this.id+".csv")
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

        // first find the first valid FOV value
        let validFOV
        for (let slot=0;slot<points;slot++) {
            const misbFOV = misb.misb[slot][MISB.SensorVerticalFieldofView]
            if ( misbFOV !== undefined) {
                const misbFOVNumber = Number(misbFOV)
                // use only valid FOV values
                if (!isNaN(misbFOVNumber) && misbFOVNumber > 0 && misbFOVNumber < 180) {
                    validFOV = misbFOV
                    console.log("CNodeTrackFromMISB:recalculate(): FIRST validFOV = " + validFOV);
                    break
                }
            }
        }

        // // now go over all the slots, if invalid, the patch with validFOV
        // // if valid, then update validFOV
        for (let slot=0;slot<points;slot++) {
            const misbFOV = misb.misb[slot][MISB.SensorVerticalFieldofView]
            if ( misbFOV !== undefined) {
                const misbFOVNumber = Number(misbFOV)
                // use only valid FOV values, so if this is valid, we'll use it for subsequent invald rows
                if (!isNaN(misbFOVNumber) && misbFOVNumber > 0 && misbFOVNumber < 180) {
                    validFOV = misbFOV
                }
                else {
                    console.log("Replacing invalid FOV value: " + misbFOV + " with validFOV = " + validFOV)
                    misb.misb[slot][MISB.SensorVerticalFieldofView] = validFOV;
                }
            }
            else {
                misb.misb[slot][MISB.SensorVerticalFieldofView] = validFOV;
            }
//            console.log("CNodeTrackFromMISB:recalculate(): slot = " + slot + " misb[SensorVerticalFieldofView] = " + misb.misb[slot][MISB.SensorVerticalFieldofView] + " validFOV = " + validFOV);
        }

        // later if validFOV is still undefined, just skip over all the FOV stuff




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

            // uniterpolated extra fields
            const extraFields = [
                "focal_len",
                "heading",
                "pitch",
                "roll",
                "gHeading",
                "gPitch",
                "gRoll",
            ]

            // only copy the vFov if it's actually there
            // need this check for drag-and-drop
            if (!validFOV) {
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




