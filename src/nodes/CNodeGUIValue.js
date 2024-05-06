// a node that lets you choose a value with a slider/input box
import {assert} from "../utils";
import {CNodeConstant} from "./CNode";
import {par} from "../par";


export class CNodeGUIConstant extends CNodeConstant {
    constructor(v) {
        super(v);
        this.value = v.value ?? assert(0, "CNodeGUIConstant missing 'value' parameter");
    }

}

export class CNodeGUIValue extends CNodeGUIConstant {
    constructor(v, _guiMenu) {

        super(v);

        this.setGUI(v, _guiMenu)

        this.start = v.start ?? 0
        this.end = v.end ?? v.value * 2
        this.step = v.step ?? 0

        this.onChange = v.onChange;

        //   this.hideUnused = true;

        if(!this.gui)
            return;

        this.guiEntry = this.gui.add(this, "value", this.start, this.end, this.step).onChange(
            value => {
                this.recalculateCascade()
                if (this.onChange !== undefined) {
                    this.onChange(value)
                }
                par.renderOne = true;
            }
        ).name(v.desc ? v.desc : "<no desc>").listen()
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


    // onChange(f) {
    //     this.onChangeCallback = f;
    //     return this
    // }

}

// shorthand factory function
export function makeCNodeGUIValue(id, value, start, end, step, desc, guiMenu, change) {
    return new CNodeGUIValue({
        id: id,
        value: value, start: start, end: end, step: step, desc: desc,
        onChange: change
    }, guiMenu)
}

export class CNodeGUIFlag extends CNodeConstant {

    constructor(v, _guiMenu) {

        super(v);
        this.setGUI(v, _guiMenu)
        this.onChange = v.onChange;
        this.guiEntry = this.gui.add(this, "value").onChange(
            value => {
                this.recalculateCascade()
                if (this.onChange !== undefined) {
                    this.onChange()
                }
                par.renderOne = true;
            }
        ).name(v.desc ? v.desc : "<no desc>").listen()
    }
}

export function makeCNodeGUIFlag(id, value, desc, guiMenu, change) {
    return new CNodeGUIFlag({
        id: id,
        value: value, desc: desc,
        onChange: change
    }, guiMenu)

}

