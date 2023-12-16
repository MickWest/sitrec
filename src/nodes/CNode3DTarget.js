import {CNode3D} from "./CNode3D";
import {NodeMan} from "../Globals";

export class CNode3DTarget extends CNode3D {
    constructor(v) {
        super(v);
        //this.checkInputs(["track", "size"])
        this.input("track")
        this.optionalInputs(["size"])
        this.frames = this.in.track.frames
        this.fps = this.in.track.fps
    }

    update(f) {
        this.group.position.copy(this.in.track.p(f))
    }

    recalculate() {

    }

}

