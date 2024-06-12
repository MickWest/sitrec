import {CNode3DGroup} from "./CNode3DGroup";
import {NodeMan} from "../Globals";

import {assert} from "../assert.js";

export class CNode3DTarget extends CNode3DGroup {
    constructor(v) {
        super(v);
        //this.checkInputs(["track", "size"])
        this.input("track")
        this.optionalInputs(["size"])
//        this.frames = this.in.track.frames
//        this.fps = this.in.track.fps
    }

    update(f) {
        this.group.position.copy(this.in.track.p(f))
    }

    recalculate() {

    }

}

