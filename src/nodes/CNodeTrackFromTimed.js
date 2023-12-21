import {CNodeEmptyArray} from "./CNodeArray";
import {f2m, interpolate, vdump} from "../utils";
import {Sit} from "../Globals";
import {assert} from "../utils.js";
import {LLAToEUS} from "../LLA-ECEF-ENU";
import {V3} from "../threeExt";
import {GlobalDateTimeNode} from "../nodes/CNodeDateTime";

export class CNodeTrackFromTimed extends CNodeEmptyArray {
    constructor(v) {
        super(v);
    //    this.kml = FileManager.get(v.cameraFile)

        this.input("timedData")

        this.addInput("startTime",GlobalDateTimeNode)
        this.recalculate()
    }

    recalculate() {


        var startTime = this.in.startTime.toUTCString()
        var msStart = this.in.startTime.getStartTimeValue()

        this.array = [];
        this.frames = Sit.frames;

        assert(this.frames === Math.floor(this.frames),`Frames must be an integer, it's ${this.frames}`)

    //    const times = []
    //    const positions = []

    //    getKMLTrackWhenCoord(this.kml, times, positions)

        const times = this.in.timedData.times;
        const positions = this.in.timedData.coord;

        // now find the first time pair that our start time falls in

        console.log("Start time: "+ startTime+" = "+msStart+" ms")
        var points = times.length
        var slot = 0;
        var msNeeded = Sit.frames*Sit.fps*1000;
        var msEnd = msStart+msNeeded
        var frameTime = 0 // keep count for time for this frame in seconds

//        console.log(`+++ Adding ${Sit.frames}`)

        for (var f=0;f<Sit.frames;f++) {
            var msNow = msStart + Math.floor(frameTime*1000)
            // advance the slot if needed
            while (slot < points) {
                if (times[slot+1] > msNow) {
                    break
                }
                slot++;
            }

            if (slot < points) {

               // assert(slot < points, "not enough data, or a bug in your code - Time wrong? id=" + this.id)
                var fraction = (msNow - times[slot]) / (times[slot + 1] - times[slot])
                var lat = interpolate(positions[slot].lat, positions[slot + 1].lat, fraction)
                var lon = interpolate(positions[slot].lon, positions[slot + 1].lon, fraction)
                var alt = interpolate(positions[slot].alt, positions[slot + 1].alt, fraction)

                var pos = LLAToEUS(lat, lon, alt)
                // end product, a per-frame array of positions
                // that is a track.
                this.array.push({position: pos.clone()})
            } else {
                this.array.push({position: V3()}) // no position
            }
            frameTime += Sit.simSpeed/Sit.fps
        }


    }

}




