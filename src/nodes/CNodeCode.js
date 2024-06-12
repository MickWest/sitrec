import {CNode} from "./CNode";

import {assert} from "../assert.js";


// usage like this:
// new CNodeCode({
//     id: "code",
//     code: "return 1",
// }
//
// and with an input:
// new CNodeCode({
//     id: "code",
//     code: "return a",
//     inputs: {a: "someNode"}

export class CNodeCode extends CNode {
    constructor(v) {
        super(v);
        this.code = v.code
        // copy frame count from first input
        this.frames = v.frames ?? this.inputs[Object.keys(this.inputs)[0]].frames

        this.code = v.code;

        // THIS IS NOT DONE
        switch (this.inputs.length) {
            case 0:
                this.func = new Function(`return ${this.code}`)
                break;
            case 1:
                this.func = new Function(Object.keys[this.inputs][0], `return ${this.code}`)
                break;
            case 2:
                this.func = new Function(Object.keys[this.inputs][1], Object.keys[this.inputs][1], `return ${this.code}`)
                break;
            default:
                assert(false, "CNodeCode with more than 2 inputs not supported")

        }


        // we allow a frame count of 0, to indicate a constant
        assert(this.frames !== undefined, "CNodeCode missing frame count, unexpected, but technically legal")

    }

    getValueFrame(f) {
        assert(0, "CNodeCode.getValueFrame not implemented")
    }

}


