import {Group} from '../../three.js/build/three.module.js'
import {CNode, NodeMan} from "./CNode";
import {propagateLayerMaskObject} from "../threeExt";
import {GlobalScene} from "../LocalFrame"

// a CNode3DGroup encapsulates a THREE.Group one or more 3D objects
// is a standard node with inputs, so it will respond to changes in the inputs
// by calling the recalculate method.
export class CNode3DGroup extends CNode {
    constructor(v) {
        super(v);

        this.container = v.container // container frame of reference = a THREE.js GlobalScene or group
        if (this.container === undefined) {
            this.container = GlobalScene;
        }

        this.group = new Group()
        this.group.layers.mask = v.layers ?? 1 // 1 is just the default layer 0 (1<<0)
        this.container.add(this.group)

        this.visibleCheck = v.visibleCheck;

    }

    update() {
        super.update();
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


