import {CNodeEmptyArray} from "./CNodeArray";
import {f2m, interpolate, vdump} from "../utils";
import {Sit, GlobalDateTimeNode} from "../Globals";
import {assert} from "../utils.js";
import {LLAToEUS} from "../LLA-ECEF-ENU";
import {V3} from "../threeExt";

import {MISB} from "../MISB";

export class CNodeTrackFromMISB extends CNodeEmptyArray {
    constructor(v) {
        super(v);
    //    this.kml = FileManager.get(v.cameraFile)

        this.input("misb")

        this.addInput("startTime",GlobalDateTimeNode)
        this.recalculate()
    }


    // the data track is no more, and now we will make this direcly from the MISB data
    // and add gettor function to the MISB data node in CNodeMISBData.js
    // start with the postin and FOV.

    recalculate() {
       // var startTime = this.in.startTime.getStartTimeString()
        var msStart = this.in.startTime.getStartTimeValue()

        const misb = this.in.misb;

        this.array = [];
        this.frames = Sit.frames;

        assert(this.frames === Math.floor(this.frames),`Frames must be an integer, it's ${this.frames}`)

     //   const data = this.in.timedData.data;

        // now find the first time pair that our start time falls in

//        console.log("Start time: "+ startTime+" = "+msStart+" ms")
        var points = misb.misb.length
        var slot = 0;
        var msNeeded = Sit.frames*Sit.fps*1000;
        var msEnd = msStart+msNeeded
        var frameTime = 0 // keep count for time for this frame in seconds

        for (var f=0;f<Sit.frames;f++) {
            var msNow = msStart + Math.floor(frameTime*1000)
            // advance the slot if needed
            while (slot < points-1) {
                const nextDataTime = misb.getTime(slot+1);
                if ( nextDataTime > msNow) {
                    break
                }
                slot++;
            }

            if (slot < points-1) {

                assert(misb.getTime(slot+1) > misb.getTime(slot), "Time data is not increasing slot ="+slot+" time="+misb.getTime(slot));

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
                const product = {position: pos.clone()}

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

                product["vFOV"] = Number(misb.misb[slot][MISB.SensorVerticalFieldofView]);
                // we store a reference to the misb row for later use
                // so we can extract other data from it as needed
                product["misbRow"] = misb.misb[slot];
//                if (f<10) console.log("vFOV",product["vFOV"])

//                 // optional additional data
//                 for (let field of extraFields) {
//                     if (data[slot][field] !== undefined) {
//                         product[field] = data[slot][field]
//
// //                        if (field == "heading") console.log(product[field])
//                     }
//                 }

                this.array.push(product)


            } else {
                this.array.push({position: V3()}) // no position
            }
            frameTime += Sit.simSpeed/Sit.fps
        }


    }

}



