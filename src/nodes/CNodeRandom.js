import {CNode} from "./CNode";

class CNodeRandom extends CNode {
    constructor(v) {
        super(v);
        this.start = v.start ?? 0;
        this.end = v.end ?? 1;
    }

    getValueFrame(frame) {
        return this.start + Math.random() * (this.end - this.start)
    }
}

export {CNodeRandom};
