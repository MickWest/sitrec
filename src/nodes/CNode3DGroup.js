import {Group} from "three"
import {CNodeConstant} from "./CNode";
import {propagateLayerMaskObject} from "../threeExt";
import {GlobalScene} from "../LocalFrame"
import {CNode3D} from "./CNode3D";
import {Color} from "three";
import {assert, normalizeLayerType} from "../utils";
import * as LAYER from "../LayerMasks";

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
        this.convertColorInput(v,"color")


        this._object = new Group()

        // if v.layers is a string then it's a layer make name
        // so we prepend it with MASK_ to get the layer mask index
        // and then get the value from the LAYER object
        // so             layers: "HELPERS",
        // becomes         layers: LAYER.MASK_HELPERS,


        v.layers = normalizeLayerType(v.layers)

        this._object.layers.mask = v.layers ?? 1 // 1 is just the default layer 0 (1<<0)


        this.container.add(this._object)

        this.visibleCheck = v.visibleCheck;

    }

    dispose() {
        assert(this.container !== undefined, "CNode3DGroup container is undefined")
        this.container.remove(this._object);
        super.dispose();
    }

    convertColorInput(v, name) {
        if (v[name] !== undefined && !(v[name] instanceof CNodeConstant)) {
            var colorObject = v[name];
            if (! (colorObject instanceof Color)) {
                if (typeof colorObject === "string" || typeof colorObject === "number" ) {
                    // hex string or number
                    colorObject = new Color(colorObject)
                } else if (Array.isArray(colorObject)) {
                    colorObject = new Color(colorObject[0], colorObject[1], colorObject[2])
                } else {
                    assert(0, "CNode3DGroup color input not understood");
                    console.log("CNode3DGroup color input not understood")
                }
            }

            v[name] = new CNodeConstant({id:this.id+"_"+name+"_colorInput", value: colorObject})
        }

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


