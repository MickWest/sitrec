import {CNode} from "./CNode";
import {addOptionToGUIMenu, removeOptionFromGUIMenu} from "../lil-gui-extras";
import {assert} from "../utils";
import {isConsole, isLocal} from "../../config";
import {NodeMan, Sit} from "../Globals";

class CNodeSwitch extends CNode {
    constructor(v, _gui) {
        super(v);
        this.choice = v.default; // this is the key of the entry in choices
        this.onChangeCallback= v.onChange; // function to call when choice changes

                this.desc = v.desc;

//        console.log("CNodeSwitch:constructor "+this.id)
//        console.log(JSON.stringify(v, null, 2))

        this.setGUI(v, _gui)

        if (this.choice === undefined) {
            if (Object.keys(this.inputs).length > 0) {
                this.choice = Object.keys(this.inputs)[0]
            } else {
                this.choice = null; // no choices avaialable, so allow a null value until later (for an empty menu)
            }
        }

        assert(this.choice === null || this.inputs[this.choice] !== undefined, "CNodeSwitch: choice not found in inputs, choice="+this.choice)

        // in console mode the gui is not defined but we stil use 'frames'
        if (this.choice === null || this.inputs[this.choice].frames === 0) {
            this.frames = Sit.frames
            this.useSitFrames = true;
        } else {
            this.frames = this.inputs[this.choice].frames
        }



        // add the menu if the gui is defined
        if (this.gui !== undefined) {
            this.guiOptions = {}

            // build the list of "key","key" pairs for the gui drop-down menu
            Object.keys(this.inputs).forEach(key => {
                this.guiOptions[key] = key
                //          assert(this.frames === this.choiceList[key].frames,"Frame number mismatch "+
                //              this.frames + key + this.choiceList[key].frames)
            })
            this.controller = this.gui.add(this, "choice", this.guiOptions)
                .name((isLocal?"*":"") + v.desc)
                .onChange((newValue) => {   // using ()=> preserves this
//                    console.log("Changed to "+newValue)
//                    console.log("(changing) this.choice = "+this.choice)

                    //this.recalculateCascade()
                    this.recalculateCascade(undefined, false, 0, true)

                    // this is a bit odd, as it's calling the callback with the selected object
                    // I think nothing uses it except form the Zoom To Track button
                    if (this.onChangeCallback !== undefined) {
                        this.onChangeCallback(this.getObject())
                    }

                })
        } else if(!isConsole) {
            console.warn("No gui for CNodeSwitch - this is probably not what you want")
        }
        this.recalculate()

        this.exportable = v.exportable
        if (this.exportable) {
            NodeMan.addExportButton(this, "exportTrackCSV", "Export Traverse")
        }

    }


    serialize() {

    }

    // different approach to serialization
    // we assume the object is going to be set up as before
    // then we just serialize the changes we need to make to the object
    modSerialize() {
        return {
            ...super.modSerialize(),
            choice: this.choice,
        }
    }

    // then when loading, we just deserialize the changes to an existing node
    // in this case the switch options will be set up as a result of loading the files
    // so we just need to set the choice (the selected option)
    modDeserialize(v) {
        super.modDeserialize(v);
        this.selectOptionQuietly(v.choice);
    }

    dispose() {
        if (this.controller !== undefined) {
            this.controller.destroy()
        }
        super.dispose()
    }

    exportTrackCSV() {
        // get the selected node
        // if it has and export function then call it.
        const choiceNode = this.inputs[this.choice];
        if (choiceNode.exportTrackCSV !== undefined) {
            choiceNode.exportTrackCSV()
        }
    }


    hide() {
        super.hide()
        this.controller.hide()
        return this
    }

    show() {
        super.show()
        this.controller.show()
        return this
    }

    addOption(option, value) {
        this.inputs[option] = value;
        addOptionToGUIMenu(this.controller, option, option)
    }

    removeOption(option) {
        if (this.inputs[option] !== undefined) {
            delete this.inputs[option]
            removeOptionFromGUIMenu(this.controller, option)
        }
    }

    selectOption(option, quiet=false) {
        this.choice = option
        if (!quiet) {
            this.controller.setValue(option)
            this.recalculateCascade()
        } else {
            this.choice = option
            this.controller.updateDisplay();
        }
    }

    selectOptionQuietly(option) {
        this.selectOption(option, true)
    }

    selectFirstOptionQuietly() {
        this.selectOption(Object.keys(this.inputs)[0], true)
    }


    onChange(f) {
        this.onChangeCallback = f;
        return this
    }

    recalculate() {
        console.log("CNodeSwitch:recalculate "+this.id)

        // turn controller on or off
        Object.keys(this.inputs).forEach(key => {
            const node = this.inputs[key];
            if (node.isController) {
                if (key !== this.choice) {
                    node.enabled = false;
                } else {
                    node.enabled = true;
                }
            }
        })

        // turn on or off gui for all gui sources
        // only turn them off if they are not connected to anything else
        Object.keys(this.inputs).forEach(key => {
            if (key !== this.choice) {
                console.log("CNode:recalculate HIDE "+this.inputs[key].id)
                if (this.inputs[key].outputs.length === 1) {
                // if the input is only connected to this switch, then hide it
                     this.inputs[key].hide()
                 }
                this.inputs[key].hideInactiveSources()
            } else {
            }
        })
        // show the selected inputs AFTER all the hiding has been done
        console.log("CNode:recalculate SHOW choice "+this.inputs[this.choice].id)
        if (Object.keys(this.inputs).length > 0) {
            this.inputs[this.choice].show()
            this.inputs[this.choice].showActiveSources()
        }
    }


    // For a switch, we override both getValue and getValueFrame
    // to pass through to the selected input
    // so that input can handle the number of frames
    getValue(frameFloat) {
        if (Object.keys(this.inputs).length > 0) {
            return this.inputs[this.choice].getValue(frameFloat)
        } else {
            return null
        }
    }

    getValueFrame(f) {
        if (Object.keys(this.inputs).length > 0) {
            return this.inputs[this.choice].getValueFrame(f)
        } else {
            return null
        }
    }

    getObject() {
        if (Object.keys(this.inputs).length > 0) {
            return this.inputs[this.choice]
        } else {
            return null
        }
    }

    // apply is used for controllers (like CNodeController)
    // we want to have a selection of camera controllers
    // so we need to pass though the apply() call to the selected one
    apply(f, cam) {
        if (Object.keys(this.inputs).length > 0) {
            return this.inputs[this.choice].apply(f, cam)
        } else {
            return null
        }
    }

}

export {CNodeSwitch};
