import {CNode} from "./CNode";
import {addOptionToGUIMenu, removeOptionFromGUIMenu} from "../lil-gui-extras";
import {isConsole, isLocal} from "../configUtils.js";
import {NodeMan, Sit} from "../Globals";
import {assert} from "../assert.js";
import {EventManager} from "../CEventManager";

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
            this.selectValidChoice();
        }

        assert(this.choice === null || this.inputs[this.choice] !== undefined, "CNodeSwitch: choice not found in inputs, choice="+this.choice)

        // in console mode the gui is not defined but we stil use 'frames'
        if (this.choice === null || this.inputs[this.choice].frames === 0) {
            this.frames = Sit.frames
            this.useSitFrames = true;
            //console.log("Using Sit.frames for CNodeSwitch"+this.id)
        } else {
            //console.warn("CNodeSwitch: setting frames to "+this.inputs[this.choice].frames)
            this.frames = this.inputs[this.choice].frames
        }



        // add the menu if the gui is defined
        if (this.gui !== undefined) {
            this.guiOptions = {}

            // build the list of "key","key" pairs for the gui drop-down menu
            Object.keys(this.inputs).forEach(key => {
                this.guiOptions[key] = key

                // if any of the inputs are controllers, then this switch is a controller
                if (this.inputs[key].isController) {
                    this.isController = true
                }


                //          assert(this.frames === this.choiceList[key].frames,"Frame number mismatch "+
                //              this.frames + key + this.choiceList[key].frames)
            })
            this.controller = this.gui.add(this, "choice", this.guiOptions)
                .name((isLocal?"*":"") + v.desc)
                .onChange((newValue) => {   // using ()=> preserves this
//                    console.log("Changed to "+newValue)
//                    console.log("(changing) this.choice = "+this.choice)

                    this.choiceChanged();

                    // if the inputs are controllers
                    // then we need to recalculate the output nodes
                    // of the selected controller
                    // because this switch won't do it
                    for (const key in this.inputs) {
                        if (key === this.choice) {
                            if (this.inputs[key].isController) {
                                console.warn("CNodeSwitch:onChange: selected input "+key+" is a controller, so recalculating ALL")
                                //this.inputs[key].recalculateCascade()
                                NodeMan.recalculateAllRootFirst(false); // patch to recalculate all nodes
                                break
                            } else {
                               // console.log("CNodeSwitch:onChange: selected input "+key+" is not a controller, so not recalculating")
                            }
                        }
                    }

                    //this.recalculateCascade()
                    this.recalculateCascade(undefined, false, 0, false)

                    // this is a bit odd, as it's calling the callback with the selected object
                    // I think nothing uses it except form the Zoom To Track button
                    if (this.onChangeCallback !== undefined) {
                        this.onChangeCallback(this.getObject())
                    }
                    EventManager.dispatchEvent("Switch.onChange."+this.id, this.choice)

                })

            this.exportable = v.exportable
            if (this.exportable) {
                NodeMan.addExportButton(this, "exportTrackCSV", "Traverse ")
            }
        } else if(!isConsole) {
            console.warn("No gui for CNodeSwitch - this is probably not what you want")
        }
        this.choiceChanged()
        this.recalculate()
    }

    // The choice is not set, or invalid, so set it to the first available choice
    selectValidChoice() {
        if (Object.keys(this.inputs).length > 0) {
            this.choice = Object.keys(this.inputs)[0]
        } else {
            this.choice = null; // no choices avaialable, so allow a null value until later (for an empty menu)
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

        if (v.choice === "Satellite") {
            // check to see if the TLE data is loaded
            // if it is not loaded, then we need to wait for it to be loaded
            // and then set the choice to the first available choice

            const TlEData = NodeMan.get("NightSkyNode", false)?.TLEData;

            if (TlEData === undefined) {
                // TLE data is not loaded, so we need to wait for it to be loaded
                // and then set the choice to the first available choice
                console.warn("CNodeSwitch:modDeserialize: TLE data not loaded, waiting for it to be loaded")
                this.choice = null; // set to null so that we can select the first available choice later
                // as the Satellite choice is not valid until the TLE data is loaded
                this.selectValidChoice();

                // add an event listener to wait for the TLE data to be loaded
                // and then set the choice to Satellite
                EventManager.addEventListener("tleLoaded", () => {
                    console.log("CNodeSwitch:modDeserialize: TLE data loaded, setting choice 'Satellite''")

                    this.choice = "Satellite";
                    this.selectOption(this.choice);
                })

            } else {
                this.selectOptionQuietly(v.choice);
            }

        } else {
            this.selectOptionQuietly(v.choice);
        }
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
        this.addInput(option, value)
//        console.log("+++ ADDING   "+option+" to   "+this.id)
        addOptionToGUIMenu(this.controller, option, option)
    }

    removeOption(option) {
        if (this.inputs[option] !== undefined) {
//            console.log("--- REMOVING "+option+" from "+this.id)
            this.removeInput(option)
            removeOptionFromGUIMenu(this.controller, option)
        }
    }

    replaceOption(option, value) {
        this.removeOption(option)
        this.addOption(option, value)
    }

    selectOption(option, quiet=false) {
        this.choice = option
        if (!quiet) {
            this.controller.setValue(option)
            this.choiceChanged();
            this.recalculateCascade()
        } else {
            this.choice = option
            this.choiceChanged();
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

    // recursively enable or disable any controllers that are inputs to this switch
    // account for the fact that the input may be a switch itself
    // if a switch is disabled, then it will disable all its inputs
    // if a switch is enabled, then it will enable only the selected input
    enableController(enable) {
        // console.log(`CNodeSwitch:enableController(${enable}) called for ${this.id}`)
        Object.keys(this.inputs).forEach(key => {
            const node = this.inputs[key];
            if (key === this.choice) {
                // console.log(`CNodeSwitch:enableController(${enable}) enabling ${key}`)
                node.enableController(enable)
            } else {
                // console.log(`CNodeSwitch:enableController(${enable}) disabling ${key}`)
                node.enableController(false)
            }
        })
    }

    recalculate() {

        // if (this.choice === undefined) {
        //     console.warn("CNodeSwitch: choice is undefined, setting to first available choice");
        //     this.selectValidChoice();
        // }

        // console.log("");
        // console.log("======================== CNodeSwitch:recalculate "+this.id+" choice = "+this.choice)

        // ensure frames are up to date for this switch, setting it to the selected input's frames
        if (!this.useSitFrames) {
            this.frames = this.inputs[this.choice].frames;
        }

        // showing/hiding nodes has no effect in console mode
        if(isConsole)
            return

        this.enableController(true);


    }

    choiceChanged() {
        // turn on or off gui for all gui sources
        // only turn them off if they are not connected to anything else
        Object.keys(this.inputs).forEach(key => {
            if (key !== this.choice) {
                //  console.log("CNodeSwitch:input " + key+ "has "+this.inputs[key].outputs.length +" outputs")
                if (this.inputs[key].outputs.length === 1) {
                    // if the input is only connected to this switch, then hide it
                    //     console.log("CNodeSwitch:recalculate HIDE "+this.inputs[key].id+ "as only connected to this switch")
                    this.inputs[key].hide()
                }
                this.inputs[key].hideInactiveSources()
            } else {
            }
        })
        // show the selected inputs AFTER all the hiding has been done
        // console.log("CNode:recalculate SHOW choice "+this.inputs[this.choice].id)
        if (Object.keys(this.inputs).length > 0) {
            assert(this.inputs[this.choice] !== undefined, "CNodeSwitch: choice not found in inputs, choice="+this.choice+", Switch Node id = "+this.id)
            this.inputs[this.choice].show()
            this.inputs[this.choice].showActiveSources()
        }
    }


    // For a switch, we override both getValue and getValueFrame
    // to pass through to the selected input
    // so that input can handle the number of frames
    getValue(frameFloat) {
        if (Object.keys(this.inputs).length > 0) {
            assert(this.inputs[this.choice] !== undefined, "CNodeSwitch: choice not found in inputs, choice="+this.choice+", Switch Node id = "+this.id)
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

    // pass through to the selected input
    // used, for example, when we want to set the position of a wind node
    // and the wind node is selected from a switch
    setPosition(pos) {
        if (Object.keys(this.inputs).length > 0) {
            this.inputs[this.choice].setPosition(pos);
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
