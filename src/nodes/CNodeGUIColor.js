// a node that lets you choose a value with a slider/input box
import {CNodeConstant} from "./CNode";
import {par} from "../par";
import {isLocal} from "../../config";
import {assert} from "../assert.js";
import {Color} from "three";
import {CNodeGUIConstant} from "./CNodeGUIValue";

export class CNodeGUIColor extends CNodeGUIConstant {
    constructor(v, _guiMenu) {

        if (v.id === undefined && v.desc !== undefined) {
            v.id = v.desc;
        }

        super(v);

        if (isLocal)
            v.desc = "*"+v.desc;

        
        this.setGUI(v, _guiMenu)
        this.onChange = v.onChange;

        if(!this.gui)
            return;

        // for lil-gui, this.value should be a hex string, or an object with r,g,b fields, or a custom range(?)
        // i.e. one of these
        // params = {
        // 	cssColor: '#ff00ff',
        // 	rgbColor: { r: 0, g: 0.2, b: 0.4 },
        // 	customRange: [ 0, 127, 255 ],
        // };


        assert(v.value !== undefined, "CNodeGUIColor: value is undefined")
        // assert it's not a number
        assert(typeof v.value !== "number", "CNodeGUIColor: value is a number")




        this.guiEntry = this.gui.addColor(this, "value", this.start, this.end, this.step).onChange(
            value => {
                this.recalculateCascade()
                if (this.onChange !== undefined) {
                    this.onChange(value)
                }
                par.renderOne = true;
            }
        ).name(v.desc ? v.desc : "<no desc>").listen()

        // set it invisible
        if (v.hidden) {
            this.guiEntry.domElement.style.display = "none";
        }

        if (v.color !== undefined) {
            this.guiEntry.setLabelColor(v.color)
        }
    }

    // this will need a little work, as it's a color RGBA
    modSerialize() {
        return {
            ...super.modSerialize(),
            value: this.value
        }
    }

    modDeserialize(v) {
        super.modDeserialize(v);
        this.value = v.value
        this.guiEntry.setValue(this.value)
        this.recalculateCascade()
    }

    show() {
        if(!this.gui)
            return this
        super.show()
        this.guiEntry.show()
        return this
    }

    hide() {
        if(!this.gui)
            return this
        super.hide()
        this.guiEntry.hide()
        return this
    }

}

