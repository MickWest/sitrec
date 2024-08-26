// a node that lets you choose a value with a slider/input box
import {CNodeConstant} from "./CNode";
import {par} from "../par";
import {isLocal} from "../../config";
import {assert} from "../assert.js";
import {Units} from "../Globals";
import {roundIfClose} from "../utils";


export class CNodeGUIConstant extends CNodeConstant {
    constructor(v) {
        super(v);
        this.value = v.value ?? assert(0, "CNodeGUIConstant missing 'value' parameter");
    }

}

export class CNodeGUIValue extends CNodeGUIConstant {
    constructor(v, _guiMenu) {

        if (v.id === undefined && v.desc !== undefined) {
            v.id = v.desc;
        }

        super(v);

        if (isLocal)
            v.desc = "*"+v.desc;

        
        this.setGUI(v, _guiMenu)

        this.unitType = v.unitType ?? "none";

        this.start = v.start ?? 0
        this.end = v.end ?? v.value * 2
        this.step = v.step ?? Math.abs((this.end-this.start)/100);


        this.onChange = v.onChange;

        //   this.hideUnused = true;

        if(!this.gui)
            return;

        this.desc = v.desc;

        this.guiEntry = this.gui.add(this, "value", this.start, this.end, this.step).onChange(
            value => {
                this.recalculateCascade()
                if (this.onChange !== undefined) {
                    this.onChange(value)
                }
                par.renderOne = true;
            }
        ).name(v.desc ? v.desc : "<no desc>").listen()

        // update the desc with the units
        this.updateDesc()

        // set it invisible
        if (v.hidden) {
            this.guiEntry.domElement.style.display = "none";
        }

        if (v.color !== undefined) {
            this.guiEntry.setLabelColor(v.color)
        }
    }

    getValueFrame(frame) {
        const value = super.getValueFrame(frame);
        // we need to convert from whatever units to SI units
        // if we have units
        if (this.unitType === "none") {
            return value;
        }
        // we have units
        // we need to convert from big, small, or speed to SI units
        const SI = Units[this.unitType].toM * value;
        return SI;
    }

    changeUnits(units, scaleFactors)  {
        if (this.unitType === "none") {
            return;
        }

        const scale = scaleFactors[this.unitType];
        // we just need to change the value, start, and end in the GUI

        // this.value is what is referenced by the gui, so we can change it directly
        this.value = roundIfClose(this.value * scale);

        // min and max need to be changed in the gui
        this.guiEntry._min = roundIfClose(this.guiEntry._min * scale);
        this.guiEntry._max = roundIfClose(this.guiEntry._max * scale);
        // this.guiEntry.step *= scale;

        this.updateDesc()

    }

    updateDesc() {
        if (this.unitType === "none") {
            return;
        }
        // update the desc with the units
        const unitsAbbrev = Units[this.unitType].abbrev;
        this.guiEntry.name(this.desc + " (" + unitsAbbrev + ")");

        // update the display
        this.guiEntry.updateDisplay();
    }



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


    // onChange(f) {
    //     this.onChangeCallback = f;
    //     return this
    // }

}


// a scaled gui value uses the Units object to scale the value
// the value in the gui is the in user units
// but we return the value in the internal units
// we need to know the name of the sub-units, and the conversion factor
// example
// this.bigUnitsFull = "Nautical Miles";
// this.bigUnitsAbbrev = "NM";
// this.smallUnitsFull = "Feet"
// this.smallUnitsAbbrev = "ft";
// this.vsUnits = "fpm"
// this.speedUnits = "Knots"
// this.big2M = 1852;          // big units to meters
// this.small2M = 0.3048       // scale small (feet) to meters 0.3048 is the EXACT international foot
// this.vs2mps = 0.00508;      // feet per minute to meters per second

// unit type could "big", "small", "vs", "speed"
// where vs is vertical speed
// converstions are always to to return in SI units:
// big - KM
// small - M
// vs - m/s
// speed - m/s


export class CNodeScaledGUIValue extends CNodeGUIValue {
    constructor(v, _guiMenu) {
        super(v, _guiMenu);

    }
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

