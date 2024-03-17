import {gui, guiShowHide, guiTweaks, NodeMan} from "../Globals";
import {CNode} from "./CNode";
import {CNodeCloudData} from "./CNodeCloudData";
import {addOption, removeOption} from "../lil-gui-extras";

class CNodeSwitch extends CNode {
    constructor(v, _gui) {
        super(v);
        this.choice = v.default; // this is the key of the entry in choices
        this.onChange = v.onChange; // function to call when choice changes

        this.setGUI(v, _gui)

        if (this.choice == undefined) {
            this.choice = Object.keys(this.inputs)[0]
        }

        // add the menu if the gui is defined
        if (this.gui !== undefined) {
            this.guiOptions = {}

            this.frames = this.inputs[this.choice].frames
            // build the list of "key","key" pairs for the gui drop-down menu
            Object.keys(this.inputs).forEach(key => {
                this.guiOptions[key] = key
                //          assert(this.frames === this.choiceList[key].frames,"Frame number mismatch "+
                //              this.frames + key + this.choiceList[key].frames)
            })
            this.controller = gui.add(this, "choice", this.guiOptions)
                .name(v.desc)
                .onChange((newValue) => {   // using ()=> preserves this
                    console.log("Changed to "+newValue)
                    console.log("(changing) this.choice = "+this.choice)

                    this.recalculateCascade()
                    if (this.onChange !== undefined) {
                        this.onChange()
                    }

                })
        } else {
            console.warn("No gui for CNodeSwitch - this is probably not what you want")
        }
        this.recalculate()
    }

    addOption(option, value) {
        console.log("(adding) this.choice = "+this.choice)
        this.inputs[option] = value;
        addOption(this.controller, option, option)
        console.log("(adding) this.choice = "+this.choice)
    }

    removeOption(option) {
        console.log("(removing) this.choice = "+this.choice)
        delete this.inputs[option]
        removeOption(this.controller, option)
        console.log("(removing) this.choice = "+this.choice)
    }

    selectOption(option) {
        this.choice = option
        this.controller.setValue(option)
        this.recalculateCascade()
    }

    onChange(f) {
        this.onChangeCallback = f;
        return this
    }

    recalculate() {
        // turn on or off gui for all gui sources
        // possibly might need a more sophisticated for inputs.
        Object.keys(this.inputs).forEach(key => {
            if (key !== this.choice) {
                //               console.log("HIDE "+key)
                this.inputs[key].hide()
            } else {
                //               console.log("SHOW "+key)
                this.inputs[key].show()
            }
        })
    }


    getValueFrame(f) {
        return this.inputs[this.choice].getValueFrame(f)
    }

    // apply is used for controllers (like CNodeController)
    // we want to have a selection of camera controllers
    // so we need to pass though the apply() call to the selected one
    apply(f, cam) {
        return this.inputs[this.choice].apply(f, cam)
    }

}

export {CNodeSwitch};
