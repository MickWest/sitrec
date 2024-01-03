import {CNode} from "./CNode";
import {NodeMan} from "../Globals";

// wrapper class for THREE.JS objects, like cameras, groups, 3D models, etc.
//
export class CNode3D extends CNode {
    constructor(v) {
        super(v);
        this._object = null;    // a 3D object
        this.controllers = [];  // controllers for that object...
    }


    update(f) {
        super.update(f);
        for (const controller of this.controllers) {
            controller.apply(f, this);
        }
    }

    addController(type, def, id) {

        this.controllers.push(NodeMan.create("CameraController"+type, def, id))
        return this;
    }

    addControllerNode(node) {

        this.controllers.push(node)
        return this;
    }

}