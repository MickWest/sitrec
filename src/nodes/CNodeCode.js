import {CNode} from "./CNode";
import {assert} from "../utils";

export class CNodeCode extends CNode {
    constructor(v) {
        super(v);
        this.code = v.code
        // copy frame count from first input
        this.frames = v.frames ?? this.inputs[Object.keys(this.inputs)[0]].frames

        // we allow a frame count of 0, to indicate a constant
        assert(this.frames !== undefined, "CNodeCode missing frame count, unexpected, but technically legal")

    }

    getValueFrame(f) {

    }

}