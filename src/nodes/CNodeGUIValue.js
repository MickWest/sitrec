// a node that lets you choose a value with a slider/input box
import {CNodeConstant} from "./CNode";
import {par} from "../par";
import {isLocal} from "../configUtils.js"
import {assert} from "../assert.js";
import {Globals, NodeMan, Units} from "../Globals";
import {roundIfClose, stripComments} from "../utils";
import {EventManager} from "../CEventManager";
import {addMathInputs, evaluateExpression} from "./CNodeMath";


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

        // unitType is "none", "big", "small", "vs", "speed"
        // where vs is vertical speed
        // converstions are always to return in SI units:
        // i.e. meters, meters, m/s, m/s
        this.unitType = v.unitType ?? "none";

        this.start = v.start ?? 0
        this.end = v.end ?? v.value * 2
        this.step = v.step ?? Math.abs((this.end-this.start)/100);

        if (v.quietLink !== undefined) {
            this.quietLink = v.quietLink;
        }

        if (v.link !== undefined) {
            this.link = v.link;
        }


        if (v.linkMath !== undefined) {
            this.linkMath = stripComments(v.linkMath);

            // only add inputs for the silent links
            // we only need to propagate changes in one direction
            // so if Sit.frames changes, we will update the primary value (turnRate)
            // but not the silent linked value (totalTurn)
            if (v.link === undefined) {
                addMathInputs(this, this.linkMath)
            }
        }

        this.onChange = v.onChange;

        //   this.hideUnused = true;

        if(!this.gui)
            return;

        this.desc = v.desc;

        this.guiEntry = this.gui.add(this, "value", this.start, this.end, this.step).onChange(
            value => {

                this.recalculateCascade()
                if (this.onChange !== undefined) {
                    this.onChange(this.getValueFrame(0)) // use getValue to account for unitType
                }
               // console.log("GUIValue.onChange."+this.id);
                EventManager.dispatchEvent("GUIValue.onChange."+this.id, value)
                par.renderOne = true;
            }
        ).name(v.desc ? v.desc : "<no desc>").listen()

        if (v.tip) {
            this.guiEntry.tooltip(v.tip);
        }

        this.elastic = v.elastic ?? false;
        if (this.elastic) {
            this.elasticMin = v.elasticMin ?? 10;
            this.elasticMax = v.elasticMax ?? 1000000;

            this.guiEntry.elastic(this.elasticMin, this.elasticMax)
        }

        // update the desc with the units
        this.updateDesc()


        if (v.color !== undefined) {
            this.guiEntry.setLabelColor(v.color)
        }

        // set it invisible
        if (v.hidden) {
            this.hidden = true;
            this.hide();
        }

        // the guiEntry has a _stepExplicit field, which flags
        // if we snap to the step, or allow any value
        // this is used (set false) in the CNodePositionLLA to prevent snapping
        if (v.stepExplicit !== undefined) {
            this.guiEntry._stepExplicit = v.stepExplicit;
        }
    }

    // recalculate will be called when the value changes from the UI
    // or when the inputs to linkedMath change
    recalculate(f) {
        super.recalculate(f);
        // check for links to other gui values
        if (this.linkMath !== undefined && !Globals.suppressLinkedRecalculate) {
//            console.log("GUIValue: Evaluating linkMath: " + this.linkMath);

            const linkedValue = evaluateExpression(this.linkMath)

            // NOTE: with a link/quietLink pair, the setting of the value
            // for the link will trigger a recalculation of the quietLink
            // but not vice-verse
            // TODO: Consider if we should ignore the node that triggered the recalculation

            if (this.link !== undefined) {
                const link = NodeMan.get(this.link);
                // the default will be to set the value with recalculation
                link.setValue(linkedValue);
            }

            if (this.quietLink !== undefined) {
                const link = NodeMan.get(this.quietLink);
                // quietLink is a link that does not trigger recalculation
                link.setValue(linkedValue, true);
            }
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

        assert(Units[this.unitType] !== undefined, "CNodeGUIValue: unknown unit type " + this.unitType);

        const scale = scaleFactors[this.unitType];
        // we just need to change the value, start, and end in the GUI

        // this.value is what is referenced by the gui, so we can change it directly
        this.value = roundIfClose(this.value * scale);

        // min and max need to be changed in the gui
        this.guiEntry._min = roundIfClose(this.guiEntry._min * scale);
        this.guiEntry._max = roundIfClose(this.guiEntry._max * scale);

        // elastic bounds also need to be changed
        if (this.guiEntry._elastic) {
            this.guiEntry._elasticMin = roundIfClose(this.guiEntry._elasticMin * scale);
            this.guiEntry._elasticMax = roundIfClose(this.guiEntry._elasticMax * scale);
            this.guiEntry.updateElasticStep();
        }
        // this.guiEntry.step *= scale;

        this.updateDesc()

    }


    // set GUI controlelr value directly, and update the gui,
    // optionally ignoring the onChange callback
    setValue(value, ignoreOnChange=false) {
        this.value = value;

        if (!ignoreOnChange) {
            // this will call the onChange callback
            this.guiEntry.setValue(this.value);
        } else {
            // this will not call the onChange callback
            this.guiEntry.setValueQuietly(this.value);
        }
    }


    // given a value, and the units and unitType, set the value in the gui
    // example: setValueWithUnits(10, "meters", "small")
    // if the current units are metric, then this will be converted from 10 meters to 32.8084 feet
    setValueWithUnits(value, fromUnits, unitType, ignoreOnChange=false) {
        if (this.unitType === "none") {
            // valueless, so just set the value
            this.setValue(value, ignoreOnChange);
            return;
        }

        assert(Units.factors[fromUnits] !== undefined, "CNodeGUIValue: unknown unit " + fromUnits + "type " + unitType);
        assert(unitType === this.unitType, "CNodeGUIValue: unitType mismatch " + unitType + " !== " + this.unitType);

        // we need to convert the value to the current units in the requested unitType
        const scale = Units.getScaleFactors(fromUnits)[unitType];
        value = roundIfClose(value * scale);
        this.setValue(value, ignoreOnChange);

    }

    updateDesc() {
        if (this.unitType === "none") {
            return;
        }
        assert(Units[this.unitType] !== undefined, "CNodeGUIValue: unknown unit type " + this.unitType);

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
        if (this.value !== v.value) {
            this.value = v.value
            this.guiEntry.setValue(this.value)
            this.recalculateCascade()
        }
    }

    show(visible=true) {
        if (this.visible === visible) {
            // note the gui has a _hidden flag, not a visible flag, so inverted logic
            if (this.gui && this.guiEntry._hidden !== visible)
            return this;
        }
        super.show(visible)
        if(!this.gui)
            return this


        if (visible)
            this.guiEntry.show()
        else
            this.guiEntry.hide()

        return this
    }

    update(frame) {
        super.update(frame)
        // ensure the gui visibility matches the node visibility
        if (this.guiEntry) {
            if (this.guiEntry._hidden === this.visible) {
                this.guiEntry.show(this.visible)
            }
        }
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

