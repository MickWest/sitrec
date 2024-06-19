// fiddly temporary class to handle the jet target
import {CNode3DModel} from "./CNode3DModel";


// legacy class using the new CNode3DModel, and adding the functionality that was in CNode3DTarget
export class CNodeDisplayTargetModel extends CNode3DModel {
    constructor(v) {
        super(v);

        this.input("track");


        // split this into bank and saucer tilt
        // note backwards compatiability patch to get the tracks from the inputs
        this.addController("SaucerTilt", {
            tiltType: v.tiltType,
            track:    v.track    ?? this.in.track,
            wind:     v.wind,
            airTrack: v.airTrack ?? this.in.airTrack,

        })


    }

    update(f) {
        this.group.position.copy(this.in.track.p(f))
        super.update(f);
    }
}

