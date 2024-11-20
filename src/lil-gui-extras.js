// Helper functions for lil-gui
import GUI, {Controller} from "./js/lil-gui.esm";
import {updateSize} from "./JetStuff";
import {ViewMan} from "./nodes/CNodeView";
import {Globals} from "./Globals";
import {assert} from "./assert";
const Stats = require("stats.js");

// Issue with lil-gui, the OptionController options() method adds a
// _names array to the controller object, and a _values array
// When it's passed an object then these are value and keys, generated from the object
// but when it's an array, then BOTH _values and _names reference the original array
// meaning adding and removing options (below) will not work
// it will A) corrupt the original, and B) add everything twice
// Solution (patch) is to make a copy of the array

// add an option to a drop down menu
// note for usage with CNodeSwitch, optionName and optionValue will be the same
// as we use it as in index into the this.inputs object
// so adding and deleting also has to modify this.inputs (where "this" is a CNodeSwitch
export function addOptionToGUIMenu(controller, optionName, optionValue = optionName) {
    const index = controller._names.indexOf(optionName);
    if (index !== -1) {
        console.warn("Option "+ optionName +"  already exists in controller, skipping re-add");
        return;
    }
    // Update internal arrays
    controller._values.push(optionValue);
    controller._names.push(optionName);

    // Create a new option element
    const $option = document.createElement('option');
    $option.innerHTML = optionName;
    $option.value = optionValue;

    // Append the new option to the select element
    controller.$select.appendChild($option);

    // Update the display
    controller.updateDisplay();
}

// Same, but for removing an option
export function removeOptionFromGUIMenu(controller, optionName) {
    // Find the index of the option to be removed
    const index = controller._names.indexOf(optionName);
    if (index !== -1) {
        // Remove the option element
        controller.$select.removeChild(controller.$select.options[index]);

        // Update internal arrays
        controller._values.splice(index, 1);
        controller._names.splice(index, 1);

        // Update the display
        controller.updateDisplay();
    } else {
        console.warn("Option "+ optionName +"  does not exist in controller, skipping remove");
    }
}

export function dumpGUIMenu(controller) {
    if (controller._names[0] === "Start Time") {
        console.log("Dumping GUI Menu")
        for (let i = 0; i < controller._names.length; i++) {
            console.log(i + ": " + controller._names[i] + " = " + controller._values[i])
        }
        // also dump the $select
        console.log(controller.$select)
    }
}

export function preventDoubleClicks(gui) {
    gui.domElement.addEventListener('dblclick', function(e) {
        e.stopPropagation();
    });
}

// Extend the lil-gui Controller prototype
Controller.prototype.setLabelColor = function(color) {
    // Find the label element within the controller's DOM
    const label = this.$name;
    if (label) {
        // Add a general class to the controller
        this.domElement.classList.add('custom-controller-label');

        // Create a unique class name for this controller
        const uniqueClass = `controller-label-${Math.random().toString(36).substr(2, 9)}`;

        // Add the unique class to the controller's DOM element
        this.domElement.classList.add(uniqueClass);

        // Add a style element to the head to apply the custom color
        const style = document.createElement('style');
        style.innerHTML = `
                .${uniqueClass} .name {
                    color: ${color} !important;
                }
            `;
        document.head.appendChild(style);
    }

    return this; // Return the controller to allow method chaining
};

// Move a controller to the top of its parent
Controller.prototype.moveToFirst = function() {
    const parentElement = this.domElement.parentElement;
    if (parentElement) {
        parentElement.insertBefore(this.domElement, parentElement.firstChild);
    }
};

Controller.prototype.moveAfter = function(name) {
    const parentElement = this.domElement.parentElement;
    if (parentElement) {
        // find the child with the name
        const children = Array.from(parentElement.children);
        const child = children.find(c => c.querySelector('.name').innerText === name);
        if (child) {
            parentElement.insertBefore(this.domElement, child.nextSibling);
        } else {
            console.warn("moveAfter: Could not find child with name " + name);
        }

    }
}




// delete all the children of a GUI
GUI.prototype.destroyChildren = function() {
    Array.from( this.children ).forEach( c => c.destroy() );


}

// Extend the GUI prototype to add a new method
GUI.prototype.addExternalLink = function(text, url) {
    // Create an object to hold the button action
    const obj = {};

    // Add a method to the object that opens the link
    obj[text] = function() {
        window.open(url, '_blank');
    };

    // Add the button to the GUI
    return this.add(obj, text);
};

var injectedLILGUICode = false;

export class CGuiMenuBar {
    constructor() {

        if (!injectedLILGUICode) {

            // For the menu bar, we need to modify the lil-gui code
            // removing the transition logic.
            GUI.prototype.openAnimated = function(open = true) {
                if (this.lockOpenClose) return;

                // Set state immediately
                this._setClosed(!open);

                // Set the aria-expanded attribute for accessibility
                this.$title.setAttribute('aria-expanded', !this._closed);

                // Calculate the target height
                const targetHeight = !open ? '0px' : `${this.$children.scrollHeight}px`;

                // Set initial height
                this.$children.style.height = targetHeight;

                // Ensure the closed class is correctly toggled
                this.domElement.classList.toggle('closed', !open);

                // Remove height after setting it to allow for dynamic resizing
                // but not until next event loop, to allow the height to be set first
                setTimeout(() => {
                    this.$children.style.height = '';
                }, 0);

                return this;
            }
            injectedLILGUICode = true;
        }

        this.divs = [];
        this.divWidth = 1 // 240; // width of a div in pixels
        this.totalWidth = 0; // total width of all the divs
        this.numSlots = 20; // number of empty slots in the menu bar
        this.slots = []; // array of GUI objects

        this.barHeight = 25; // height of the menu bar

        // create a div for the menu bar
        this.menuBar = document.createElement("div");
        this.menuBar.id = "menuBar";
        // position it at the top left
        this.menuBar.style.position = "absolute";
        this.menuBar.style.top = "0px";
        this.menuBar.style.left = "0px";
        this.menuBar.style.height = "100%";
        this.menuBar.style.width = "100%"; // Added this to ensure full width
        this.menuBar.style.overflowY = "auto"; // Allow scrolling if content overflows

        this._hidden = false;

        // add the menuBar to the document body
        document.body.appendChild(this.menuBar);

        // add a black bar div, with a grey 1 pixel border
        const bar = document.createElement("div");
        bar.style.position = "absolute";
        bar.style.top = "0px";
        bar.style.left = "0px";
        bar.style.height = this.barHeight+"px"; // one pixel more than the menu title divs
        bar.style.width = "100%";
        bar.style.backgroundColor = "black";
        bar.style.borderBottom = "1px solid grey";
        bar.style.zIndex = 400; // behind the other menus
        bar.id = "menuBarBlackBar";

        document.body.appendChild(bar);
        this.bar = bar;


        // capture mousedown events from anywhere on screen to detect if we want to close the GUIs
        document.addEventListener("mousedown", (event) => {
            // if the click was not in the menu bar, close all the GUIs
            if (!this.menuBar.contains(event.target)) {
                this.slots.forEach((gui) => {
                    gui.close();
                });
            }
        });



        // create numSlots empty divs of width divWidth,
        // each positioned at divWidth * i
//        for (let i = 0; i < this.numSlots; i++) {
          for (let i = this.numSlots-1; i >= 0; i--) {
            const div = document.createElement("div");
            div.id = "menuBarDiv_"+i;
            div.style.width = this.divWidth + "px";
            div.style.position = "absolute";
            div.style.left = (i * this.divWidth) + "px";
            div.style.top = "0px";

            // since we are only using the divs for positioning,
            // we can set the height to 1px to avoid overlapping divs capturing mouse inputs

            div.style.height = "1px";

       //     div.style.overflowY = "auto"; // Allow scrolling if content overflows
            div.style.zIndex = 5000;

            this.menuBar.appendChild(div);
            this.divs.push(div);
        }

        this.nextSlot = 0; // next slot to be filled

        // add an info GUI in the top right
        this.infoGUI = new GUI().title("Sitrec").close()

         Globals.stats = new Stats();
        // Globals.stats.showPanel( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
        // const attach = this.infoGUI.domElement;
        //
        // attach.appendChild( Globals.stats.dom );


    }

    updateListeners() {

        this.hideEmpty();


        this.slots.forEach((gui) => {
            gui.updateListeners();
        })
    }

    show() {
        this.slots.forEach((gui) => {
            gui.show();
        })

        this.infoGUI.show();
        this.bar.style.display = "block";






        this._hidden = false;

        viewMan.topPx = this.barHeight;
    }

    hide() {
        // call hide on all the GUI slots
        this.slots.forEach((gui) => {
            gui.hide();
        })

        this.infoGUI.hide();
        this.bar.style.display = "none";

        this._hidden = true;

        ViewMan.topPx = 0;
        ViewMan.updateSize();
        updateSize();
    }

    toggleVisiblity() {
        if (this._hidden) {
            this.show();
        } else {
            this.hide();
        }
    }

    reset() {
        this.slots.forEach((gui) => {
            this.restoreToBar(gui);
            gui.close();
        })
    }

    hideEmpty() {
        let x = 0;
        for (let i = 0; i < this.numSlots; i++) {
            const gui = this.slots[i];
            if (gui) {
                const div = this.divs[i];



                if (gui.children.length === 0) {
                    gui.close();
                    div.style.display = "none";
                } else {
                    div.style.display = "block";
                    if (!gui.lockOpenClose) {
                        div.style.left = x + "px";
                    }
                    x += getTextWidth(gui.$title.innerText) + 16;
                }
            }

        }
    }

    // creates a gui, adds it into the next menu slot
    // and returns it.
    // called addFolder to maintain compatibility with a single gui system under dat.gui
    addFolder(title) {
        const newGUI = new GUI({container: this.divs[this.nextSlot], autoPlace: false});
        //newGUI.title(title);
        newGUI.$title.innerHTML = title;

//        console.log("Adding GUI "+title+" at slot "+this.nextSlot+" with left "+this.totalWidth+"px")

        assert (this.nextSlot < this.numSlots, "Too many GUIs in the menu bar");

        this.divs[this.nextSlot].style.left = this.totalWidth + "px";

        newGUI.originalLeft = this.totalWidth;
        newGUI.originalTop = 0;

        // const divDebugColor = ["red", "green", "blue", "yellow", "purple", "orange", "pink", "cyan", "magenta", "lime", "teal", "indigo", "violet", "brown", "grey", "black", "white"];
        // // give the div a colored border
        // this.divs[this.nextSlot].style.border = "1px solid "+ divDebugColor[this.nextSlot % divDebugColor.length];

        const width = getTextWidth(newGUI.$title.innerHTML) + 16;
       // this.divs[this.nextSlot].style.width = width + "px";
       // this.divs[this.nextSlot].style.height = "1 px";
        this.totalWidth += width;

        let left = this.totalWidth;
        // adjust the position of all subsequent divs to the right
        for (let i = this.nextSlot+1; i < this.numSlots; i++) {
            this.divs[i].style.left = left + "px";
            left += this.divWidth;
        }

        // make the div pass through mouse events
        //this.divs[this.nextSlot].style.pointerEvents = "none";


        preventDoubleClicks(newGUI);
        this.slots[this.nextSlot] = newGUI;
        this.nextSlot++;

        newGUI.mode = "DOCKED";

        // when opened, close the others
        newGUI.onOpenClose( (changedGUI) => {

            if (!changedGUI._closed) {
                this.slots.forEach((gui, index) => {
                    if (gui !== newGUI && !gui._closed) {
                        gui.close();
                    }
                });

                // if this gui only has one child, which is a folder (GUI class), then open it
                if (newGUI.children.length === 1 && newGUI.children[0].constructor.name === "GUI") {
                    newGUI.children[0].open();
                }
            }
        })

        // allow for opening menus when hovering over the title
        // (if we've already got a menu open)
        // So the initial open is done by clicking, but subsequent opens are done by hovering
        // like with Windows and Mac menus.

        // Bind the method and store the reference in a property (so we can unbind cleanly)
        this.boundHandleTitleMouseOver = this.handleTitleMouseOver.bind(this);
        this.boundHandleTitleMouseDown = this.handleTitleMouseDown.bind(this);
        this.boundHandleTitleDoubleClick = this.handleTitleDoubleClick.bind(this);

        // Add the event listener using the bound method
        newGUI.$title.addEventListener("mouseover", this.boundHandleTitleMouseOver);

        newGUI.$title.addEventListener("mousedown", this.boundHandleTitleMouseDown);
        newGUI.$title.addEventListener("dblclick", this.boundHandleTitleDoubleClick);


        return newGUI;
    }

    handleTitleDoubleClick(event) {
        // restore the original position
        // event.target will be the title element we just moused over
        // find the GUI object that has this title element
        const newGUI = this.slots.find((gui) => gui.$title === event.target);
        this.restoreToBar(newGUI);
        newGUI.close();
        event.stopPropagation();

    }

    restoreToBar(newGUI) {
        // and the div
        const newDiv = this.divs.find((div) => div === newGUI.domElement.parentElement);
        // restore position

        newDiv.style.left = newGUI.originalLeft + "px";
        newDiv.style.top = newGUI.originalTop + "px";
        newGUI.lockOpenClose = false;
        newGUI.mode = "DOCKED";
    }

    handleTitleMouseDown(event) {
        // event.target will be the title element we just moused over
        // find the GUI object that has this title element
        const newGUI = this.slots.find((gui) => gui.$title === event.target);

        // and find the div
        const newDiv = this.divs.find((div) => div === newGUI.domElement.parentElement);


        // record current mouse position
        let mouseX = event.clientX;
        let mouseY = event.clientY;

        newGUI.firstDrag = (newGUI.mode === "DOCKED");

        newGUI.mode = "DRAGGING"

        // capture all the mouse move events and use then to move the div
        // when the mouse is released, remove the event listener
        const boundHandleMouseMove = (event) => {
            // make sure it's open
            if (newGUI._closed) {
                // in case we got locked into a closed state
                // (dragged menus are always open)
                newGUI.lockOpenClose = false;
                newGUI.open();
                // lock it open
            }
            newGUI.lockOpenClose = true;


            newDiv.style.left = (parseInt(newDiv.style.left) + event.clientX - mouseX) + "px";
            newDiv.style.top = (parseInt(newDiv.style.top) + event.clientY - mouseY) + "px";
            mouseX = event.clientX;
            mouseY = event.clientY;

            // if off the top, then click it back into the menu bar
            if (parseInt(newDiv.style.top) < -5) {
                this.restoreToBar(newGUI);
                document.removeEventListener("mousemove", boundHandleMouseMove);
                newDiv.removeEventListener("mouseup", boundHandleMouseUp);
                newGUI.close();
            }

            // prevent all the default mouse events
            event.preventDefault();
        }

        //newDiv.addEventListener("mousemove", boundHandleMouseMove);
        // capture ALL mouse events, not just those on the div
        document.addEventListener("mousemove", boundHandleMouseMove);



        const boundHandleMouseUp = (event) => {
            console.log("Mouse up in boundHandleMouseUp")
            document.removeEventListener("mousemove", boundHandleMouseMove);
            newDiv.removeEventListener("mouseup", boundHandleMouseUp);

            // if in the first drag, and only moved a little, then snap it back
            if (newGUI.firstDrag && parseInt(newDiv.style.top) < 5) {
                this.restoreToBar(newGUI);
            }
            event.preventDefault();
        }
        newDiv.addEventListener("mouseup", boundHandleMouseUp);

        event.preventDefault();
    }



    handleTitleMouseOver(event) {
        // now we have some menus locked open, mosuign over does not make sense
        // // event.target will be the title element we just moused over
        // // find the GUI object that has this title element
        // const newGUI = this.slots.find((gui) => gui.$title === event.target);
        //
        // if (this.slots.some((gui) => !gui._closed && gui !== newGUI)) {
        //     newGUI.open();
        // }
    }

    destroy(all = true) {
        for (let i = this.numSlots-1; i >= 0; i--) {
            const gui = this.slots[i];
            if (gui) {

                gui.$title.removeEventListener("mouseover", this.boundHandleTitleMouseOver);

                gui.destroy(all);

                if (all || !gui.permanent) {
                    // splice out the slots and divs
                    this.slots.splice(i, 1);

                    // temp reference to the div
                    const div = this.divs[i];
                    // remove div
                    this.divs.splice(i, 1);
                    // move the div at i to the end. so it can be reused
                    // not really ideal, but it's a quick fix
                    // we probably want more control over the order per-sitch
                    this.divs.push(div)

                    this.nextSlot--;
                }
            }
        }

    }

    getSerialID(slot) {
        return this.slots[slot].$title.innerHTML
    }

    modSerialize( ) {

        // serialize the GUIs by index
        // as we have issue with nested structures
        // each entry has a uniquie key
        const out  = {};
        for (let i = 0; i < this.slots.length; i++) {
            const gui = this.slots[i];
            out[this.getSerialID(i)] = {
                closed: gui._closed,
                left: gui.domElement.parentElement.style.left,
                top: gui.domElement.parentElement.style.top,
                mode: gui.mode,
                lockOpenClose: gui.lockOpenClose,
            };
        }

        return out;
    }


    modDeserialize( v ) {
        const guiData = v;
        for (let i = 0; i < this.slots.length; i++) {
            const key = this.getSerialID(i);
            if (v[key] !== undefined) {
                const gui = this.slots[i];
                const data = guiData[key];
                gui._closed = data.closed;
                gui.domElement.parentElement.style.left = data.left;
                gui.domElement.parentElement.style.top = data.top;
                gui.mode = data.mode;
                gui.lockOpenClose = data.lockOpenClose;
                if (gui.lockOpenClose) {
                    // really we only lock them open
                    gui.lockOpenClose = false;
                    gui.open();
                    gui.lockOpenClose = true;
                }
            }
        }

    }


}

const textWidths = {};

// text width helper function
// assumes the default lil-gui font
function getTextWidth(text) {
    // cache values, as it's an expensive calculation
    if (textWidths[text] !== undefined) {
        return textWidths[text];
    }
    // Create a temporary element
    const element = document.createElement('span');
    // Apply styles from the stylesheet
    element.style.fontFamily = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`;
    element.style.fontSize = `11px`;
    element.style.fontWeight = `normal`;
    element.style.fontStyle = `normal`;
    element.style.lineHeight = `1`;
    // Add text to the element
    element.innerText = text;
    // Append to the body to measure
    document.body.appendChild(element);
    // Measure width
    const width = element.offsetWidth;
    // Remove the temporary element
    document.body.removeChild(element);
    textWidths[text] = width;
    return width;
}

