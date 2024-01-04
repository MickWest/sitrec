import {CNode} from "./CNode";
import {NodeMan} from "../Globals";
import {CNodeController} from "./CNodeController";
import {assert} from "../utils"
import {CNodeSwitch} from "./CNodeSwitch";

// wrapper class for THREE.JS objects, like cameras, groups, 3D models, etc.
// Mostly to allow hooking up of controllers, which previous were camera-only
export class CNode3D extends CNode {
    constructor(v) {
        super(v);
        this._object = null;    // a 3D object
    }

    update(f) {
        super.update(f);
        // Note: JS will iterate object in the order they were added
        // assuming all the keys are non-numeric strings
        // and your browder is reasonable (ES2015+)
        // see https://www.stefanjudis.com/today-i-learned/property-order-is-predictable-in-javascript-objects-since-es2015/
        for (const inputID in this.inputs) {
            const input = this.inputs[inputID]
            if (input.isController) {
                input.apply(f,this)
            }
        }
    }

    addController(type, def) {
        this.addControllerNode(NodeMan.create("Controller"+type, def))
        return this;
    }

    addControllerNode(node) {
        assert(node instanceof CNodeController || node instanceof CNodeSwitch,
            "Calling addControllerNode with non Controller or Switch");
        node.isController = true;
        this.addInput(node.id, node)
        return this;
    }

}