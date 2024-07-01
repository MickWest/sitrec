import {Group} from "three"
import {propagateLayerMaskObject} from "../threeExt";
import {GlobalScene} from "../LocalFrame"
import {CNode3D} from "./CNode3D";
import {normalizeLayerType} from "../utils";
import {assert} from "../assert.js";
import {convertColorInput} from "../ConvertColorInputs";

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

        // if we have a color input and it's not a Constant Node then
        // we need to convert it to one from a variety of formata:
        // "#RRGGBB"
        // a Color object
        // [r,g,b]
        // (this is a bit of a hack, but it's a common case)
        convertColorInput(v,"color",this.id)


        this._object = new Group()

        this._object.layers.mask = v.layers ?? 1 // 1 is just the default layer 0 (1<<0)

        this.container.add(this._object)

        this.visibleCheck = v.visibleCheck;

    }

    dispose() {
        assert(this.container !== undefined, "CNode3DGroup container is undefined")
        this.container.remove(this._object);
        super.dispose();
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

    changeLayerMask(mask) {
        if (this.group.layers.mask !== mask) {
            this.group.layers.mask = mask;
            this.propagateLayerMask()
        }
    }
}


