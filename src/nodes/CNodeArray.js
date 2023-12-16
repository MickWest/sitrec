import {assert, RollingAverage} from "../utils";
import {CNode} from "./CNode";

export class CNodeArray extends CNode {
    constructor(v) {
        v.frames = v.frames ?? v.array.length
        assert (v.array !== undefined, "CNodeArray array undefined")
        super(v);
        // frames?
        this.array = v.array
    }

    getValueFrame(frame) {
        return this.array[frame]
    }
}


export class CNodeEmptyArray extends CNodeArray {
    constructor(v) {
        assert (v.array === undefined, "CNodeEmptyArray passed an array, use CArray if that's what you intended")
        v.array = []
        super(v)
    }
}


export class CNodeSmoothedArray extends CNodeEmptyArray {
    constructor(v) {
        super(v)
        this.input("source") // source arrau node
        this.input("smooth") // amount to smooth (rolling average window size)
        v.array = RollingAverage(this.in.source.array, this.in.smooth.v0)
        v.frames = v.array.length;
    }
}



