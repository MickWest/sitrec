import {Group} from '../../three.js/build/three.module.js'
import {CNode, NodeMan} from "./CNode";
import {propagateLayerMaskObject} from "../threeExt";
import {GlobalScene} from "../LocalFrame"
import {CNode3D} from "./CNode3D";

// a CNode3DGroup encapsulates a THREE.Group one or more 3D objects
// is a standard node with inputs, so it will respond to changes in the inputs
// by calling the recalculate method.
export class CNode3DGroup extends CNode3D {
    constructor(v) {
        super(v);

        this.container = v.container // container frame of reference = a THREE.js GlobalScene or group
        if (this.container === undefined) {
            this.container = GlobalScene;
        }

        this._object = new Group()
        this._object.layers.mask = v.layers ?? 1 // 1 is just the default layer 0 (1<<0)
        this.container.add(this._object)

        this.visibleCheck = v.visibleCheck;

    }

    get group() {
        return this._object;
    }

    update(f) {
        super.update(f);
        if (this.visibleCheck !== undefined) {
            this.group.visible = this.visibleCheck();
        }
    }

    // Layer masks are on a per-object level, and don't affect child objects
    // so we need to propagate it if there's any chenge
    propagateLayerMask() {
        // copy group layers bitmask into all children
        propagateLayerMaskObject(this.group)
    }
}


