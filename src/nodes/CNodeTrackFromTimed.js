import {CNodeEmptyArray} from "./CNodeArray";
import {f2m, interpolate, vdump} from "../utils";
import {Sit, GlobalDateTimeNode} from "../Globals";
import {assert} from "../utils.js";
import {LLAToEUS} from "../LLA-ECEF-ENU";
import {V3} from "../threeExt";

export class CNodeTrackFromTimed extends CNodeEmptyArray {
    constructor(v) {
        super(v);
    //    this.kml = FileManager.get(v.cameraFile)

        this.input("timedData")

        this.addInput("startTime",GlobalDateTimeNode)
        this.recalculate()
    }

    recalculate() {


        var startTime = this.in.startTime.getStartTimeString()
        var msStart = this.in.startTime.getStartTimeValue()

        this.array = [];
        this.frames = Sit.frames;

        assert(this.frames === Math.floor(this.frames),`Frames must be an integer, it's ${this.frames}`)

//        const times = this.in.timedData.times;
//        const positions = this.in.timedData.coord;

        const data = this.in.timedData.data;

        // now find the first time pair that our start time falls in

        console.log("Start time: "+ startTime+" = "+msStart+" ms")
        var points = data.length
        var slot = 0;
        var msNeeded = Sit.frames*Sit.fps*1000;
        var msEnd = msStart+msNeeded
        var frameTime = 0 // keep count for time for this frame in seconds

        for (var f=0;f<Sit.frames;f++) {
            var msNow = msStart + Math.floor(frameTime*1000)
            // advance the slot if needed
            while (slot < points-1) {
                if (data[slot+1].time > msNow) {
                    break
                }
                slot++;
            }

            if (slot < points-1) {

               // assert(slot < points, "not enough data, or a bug in your code - Time wrong? id=" + this.id)
                var fraction = (msNow - data[slot].time) / (data[slot + 1].time - data[slot].time)
                var lat = interpolate(data[slot].lla.lat, data[slot + 1].lla.lat, fraction)
                var lon = interpolate(data[slot].lla.lon, data[slot + 1].lla.lon, fraction)
                var alt = interpolate(data[slot].lla.alt, data[slot + 1].lla.alt, fraction)

                var pos = LLAToEUS(lat, lon, alt)
                // end product, a per-frame array of positions
                // that is a track.

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

                // optional additional data
                for (let field of extraFields) {
                    if (data[slot][field] !== undefined) {
                        product[field] = data[slot][field]

//                        if (field == "heading") console.log(product[field])
                    }
                }

                this.array.push(product)


            } else {
                this.array.push({position: V3()}) // no position
            }
            frameTime += Sit.simSpeed/Sit.fps
        }


    }

}




