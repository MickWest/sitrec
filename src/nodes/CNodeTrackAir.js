import {V3} from "../threeExt";
import {CNodeDisplayTrack} from "./CNodeDisplayTrack";
import {CNodeTrack} from "./CNodeTrack";

export class CNodeTrackAir extends CNodeTrack {
    constructor(v) {
        super(v);
        this.input("source")
        this.input("wind")
        this.frames = this.in.source.frames;
        this.fps = this.in.source.fps;
        this.recalculate()


    }

    recalculate() {
        this.array = []
        var totalWind = V3()
        for (var f = 0; f < this.frames; f++) {
            this.array.push({position: this.in.source.p(f).sub(totalWind)})
            totalWind.add(this.in.wind.v(f))
        }
    }

    update(frame) {
        var totalWind = V3()
        for (var f = 0; f < frame; f++) {
            totalWind.add(this.in.wind.v(f))
        }

        // PATCH, if one outputs is a CNodeDisplayTrack
        // then move its group
        for (var output of this.outputs)
            if (output instanceof CNodeDisplayTrack) {
                output.group.position.copy(totalWind);
            }
    }
}