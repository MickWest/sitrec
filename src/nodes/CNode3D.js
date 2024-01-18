import {CNode} from "./CNode";
import {NodeMan} from "../Globals";
import {par} from "../par";

import {stripParentheses} from "../utils";
//import {CNodeController} from "./CNodeController";
//import {assert} from "../utils"
//import {CNodeSwitch} from "./CNodeSwitch";

// wrapper class for THREE.JS objects, like cameras, groups, 3D models, etc.
// Mostly to allow hooking up of controllers, which previous were camera-only
export class CNode3D extends CNode {
    constructor(v) {
        super(v);
        this._object = null;    // a 3D object
    }

    update(f) {
        super.update(f);
        this.applyControllers(f);
    }

    applyControllers(f, depth = 0) {

        // To prevent loops, we only apply controllers at most twice per frame
        // remember the f value called with
        // if it's new, then rest count to zero
        // if not new, increment count
        // if count > 2, then return
        if (f !== this.lastF) {
            this.lastF = f
            this.applyControllersCount = 0
        } else {
            this.applyControllersCount++
            if (this.applyControllersCount > 2) {
                console.warn("Loop detected in controllers for " + this.id)
               // console.warn("Constructor Call Stack: " + stripParentheses(this.callStack))
                return
            }
        }

        // Note: JS will iterate object in the order they were added
        // assuming all the keys are non-numeric strings
        // and your browser is reasonable (ES2015+)
        // see https://www.stefanjudis.com/today-i-learned/property-order-is-predictable-in-javascript-objects-since-es2015/
        for (const inputID in this.inputs) {
            const input = this.inputs[inputID]
            if (input.isController) {

                if (par.paused) {
                    if (depth === 0) {
                        console.log("Apply: "+ this.id)
                    } else {
                        console.log("|---".repeat(depth) + " Apply:  " + input.id)
                    }
                }

                input.apply(f,this)
            }
        }

    }

    addController(type, def) {
        this.addControllerNode(NodeMan.create("Controller"+type, def))
        return this;
    }

    addControllerNode(node) {
// having this introduces circular dependency with CNodeView's including CNodeCamera
//        assert(node instanceof CNodeController || node instanceof CNodeSwitch,
//            "Calling addControllerNode with non Controller or Switch");
        node.isController = true;
        this.addInput(node.id, node)
        return this;
    }

}