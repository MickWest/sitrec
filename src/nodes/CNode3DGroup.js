import {Group} from "three"
import {propagateLayerMaskObject} from "../threeExt";
import {GlobalScene} from "../LocalFrame"
import {CNode3D} from "./CNode3D";
import {normalizeLayerType} from "../utils";
import {assert} from "../assert.js";
import {convertColorInput} from "../ConvertColorInputs";
import {guiShowHide} from "../Globals";
import {par} from "../par";
import {toggles} from "../KeyBoardHandler";

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

    show(visible) {
        super.show(visible);
        this.group.visible = visible
    }

    update(f) {
        super.update(f);
        if (this.visibleCheck !== undefined) {
            this.group.visible = this.visibleCheck();
        }
    }

    adjustOrigin(diff) {
        this.group.position.add(diff)
    }


    // set the layer bit for this object to the passed value (or 1 if undefined)
    setLayerBit(layer, value=1) {
        if (value) {
            this.group.layers.enable(layer);
        } else {
            this.group.layers.disable(layer);
        }
        this.propagateLayerMask()
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



    // Similar to showHider in KeyboardHandler.js
    // but more specific to modern objects, not using the legacy "par" object
    showHider(name, key) {
        // "key" is the keystroke to show/hide the object
        this.visible = this.group.visible;
        const hider = guiShowHide.add(this, "visible").name(name).listen().onChange((v) => {
            this.show(v);
            par.renderOne = true;
        })

        if (key) {
            toggles[key] = hider;
        }

        // ensure we serialize it
        this.addSimpleSerial("visible")

    }

    // the "visible" flag is serialized by default, but we need to
    // set the visibility of the Three.js group when we deserialize it
    modDeserialize(v) {
        super.modDeserialize(v);
        if (v.visible !== undefined) {
            this.group.visible = this.visible;
        }

    }


}


