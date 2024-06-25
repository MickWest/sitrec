// dispaly the matrix axes of an object

import {assert} from "../assert";
import {DebugMatrixAxes} from "../threeExt";
import {CNode} from "./CNode";

export class CNodeDebugMatrixAxes extends CNode {
    constructor(v) {
        super(v);
        v.length ??= 500;
        this.input("object")
        this.input("length")


    }

    update(f) {
        const ob = this.in.object._object;
        assert(ob !== undefined, "CNodeDebugMatrixAxes: object is undefined");
        DebugMatrixAxes("MISB Axes", ob.position, ob.matrix, this.in.length.v(f))

    }

    dispoose

}