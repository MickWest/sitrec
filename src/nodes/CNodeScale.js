import {NodeMan} from "../Globals";
import {CNode} from "./CNode";
import {scaleF2M} from "../utils";

export class CNodeScale extends CNode {
    constructor(id, scale, node) {
        super({id: id})
        this.addInput("in", node)
        this.scale = scale
    }

    getValueFrame(frame) {
        var value = this.in.in.v(frame) * this.scale
//        console.log("... "+value)
        return value


    }
}

export function scaleNodeF2M(id, node) {
    return new CNodeScale(id, scaleF2M, node)
}

