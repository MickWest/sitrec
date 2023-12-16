import {NodeMan} from "../Globals";
import {CNode} from "./CNode";
import {CNodeCloudData} from "./CNodeCloudData";

class CNodeSwitch extends CNode {
    constructor(v, gui) {
        super(v);
        this.choice = v.default; // this is the key of the entry in choices
        this.onChange = v.onChange; // function to call when choice changes
        this.gui = gui;
        if (this.choice == undefined) {
            this.choice = Object.keys(this.inputs)[0]
        }

        // if a gui is passed in, it's assumed to be able
        // to take lil-giu (or dat-gui) style parapmeters for addina a drop down box
        //
        if (this.gui !== undefined) {
            var guiOptions = {}

            this.frames = this.inputs[this.choice].frames
            // build the list of "key","key" pairs for the gui drop-down menu
            Object.keys(this.inputs).forEach(key => {
                guiOptions[key] = key
                //          assert(this.frames === this.choiceList[key].frames,"Frame number mismatch "+
                //              this.frames + key + this.choiceList[key].frames)
            })
            gui.add(this, "choice", guiOptions)
                .name(v.desc)
                .onChange((newValue) => {   // using ()=> preserves this
                    console.log("Changed to "+newValue)
                    this.recalculateCascade()
                    if (this.onChange !== undefined) {
                        this.onChange()
                    }

                })
        }
        this.recalculate()
    }

    onChange(f) {
        this.onChangeCallback = f;
        return this
    }

    recalculate() {
        // turn on or off gui for all gui sources
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

}

export {CNodeSwitch};
