import {CNode} from "./CNode";
import {NodeMan} from "../Globals";
import {par} from "../par";

import {stripParentheses} from "../utils";
import {mainLoopCount} from "../Globals";

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


   //     if (f === 19) debugger;

        // To prevent loops, we only apply controllers at most twice per frame
        // remember the f value called with
        // if it's new, then rest count to zero
        // if not new, increment count
        // if count > 100, then it's an inifite loop
        if (mainLoopCount !== this.lastF) {
//            console.log("Resetting applyControllersCount for " + this.id + " at mainLoop " + mainLoopCount);
            this.lastF = mainLoopCount;
            this.applyControllersCount = 0
        } else {
//            console.log("Incrementing applyControllersCount for " + this.id + " at mainLoop " + mainLoopCount);
            this.applyControllersCount++
            if (this.applyControllersCount > 100) {
                console.warn("Infinite loop detected in controllers for " + this.id + " at mainLoop " + mainLoopCount);
                console.warn("Constructor Call Stack: " + stripParentheses(this.callStack))
                for (const inputID in this.inputs) {
                    const input = this.inputs[inputID]
                    if (input.isController) {

                        console.log("Controller:  " + input.id)

                    }
                }

                debugger;
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

                // if (par.paused) {
                //     if (depth === 0) {
                //         console.log("Apply: "+ input.id +" to " + this.id + "frame " + f + " depth " + depth);
                //     } else {
                //         console.log("|---".repeat(depth) + " Apply:  " + input.id)
                //     }
                // }

                input.apply(f,this)
            }
        }

    }

    addController(type, def) {
        console.log("Adding Controller " + type + " to " + this.id)
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