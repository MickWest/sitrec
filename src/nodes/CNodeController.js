import {CNode} from "./CNode";
import {NodeMan} from "../Globals";
import {assert} from "../assert";

export class CNodeController extends CNode {
    constructor(v) {
        super(v);
        // this.objectNode = NodeMan.get(v.objectNode);
        // assert (this.objectNode !== undefined, "CNodeController needs a camera node to control")
        // assert (v.camera === undefined, "CNodeController passed a camera as well as objectNode")

    }

    enableController(enable) {
//        console.log(`CNodeController: enableController(${enable}) called for ${this.id}`)
        this.enabled = enable;
    }

}

// Utility function to add a controller to a named node
export function addControllerTo(target, controller, def) {
    return NodeMan.get(target).addController(controller, def);
}