// Helper functions for lil-gui
import GUI, {Controller} from "./js/lil-gui.esm";

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
export function addOptionToGUIMenu(controller, optionName, optionValue) {
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

// Move a controller to the of its parent
Controller.prototype.moveToFirst = function() {
    const parentElement = this.domElement.parentElement;
    if (parentElement) {
        parentElement.insertBefore(this.domElement, parentElement.firstChild);
    }
};

// delete all the children of a GUI
GUI.prototype.destroyChildren = function() {
    Array.from( this.children ).forEach( c => c.destroy() );


}



export class CGuiMenuBar {
    constructor() {
        this.divs = [];
        this.divWidth = 240; // width of a div in pixels
        this.totalWidth = 0; // total width of all the divs
        this.numSlots = 10; // number of emptyslots in the menu bar
        this.slots = []; // array og GUI objects

        // create a div for the menu bar
        this.menuBar = document.createElement("div");
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

        // capture clicks from anywhere on screen to detect if we want to close the GUIs
        document.addEventListener("click", (event) => {
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
            div.style.width = this.divWidth + "px";
            div.style.position = "absolute";
            div.style.left = (i * this.divWidth) + "px";
            div.style.top = "0px";

            // since we are only using the divs for positioning,
            // we can set the height to 1px to avoid overlapping divs capturing mouse inputs

            div.style.height = "1px";

       //     div.style.overflowY = "auto"; // Allow scrolling if content overflows
            div.style.zIndex = 9999;

            this.menuBar.appendChild(div);
            this.divs.push(div);
        }

        this.nextSlot = 0; // next slot to be filled
    }

    updateListeners() {
        this.slots.forEach((gui) => {
            gui.updateListeners();
        })
    }

    show() {
        this.slots.forEach((gui) => {
            gui.show();
        })
        this._hidden = false;
    }

    hide() {
        // call hide on all the GUI slots
        this.slots.forEach((gui) => {
            gui.hide();
        })

        this._hidden = true;
    }

    toggleVisiblity() {
        if (this._hidden) {
            this.show();
        } else {
            this.hide();
        }
    }

    // creates a gui, adds it into the next menu slot
    // and returns it.
    // called addFolder to maintain compatibility with a single gui system under dat.gui
    addFolder(title) {
        const newGUI = new GUI({container: this.divs[this.nextSlot], autoPlace: false});
        //newGUI.title(title);
        newGUI.$title.innerHTML = title;

        console.log("Adding GUI "+title+" at slot "+this.nextSlot+" with left "+this.totalWidth+"px")

        this.divs[this.nextSlot].style.left = this.totalWidth + "px";

        // const divDebugColor = ["red", "green", "blue", "yellow", "purple", "orange", "pink", "cyan", "magenta", "lime", "teal", "indigo", "violet", "brown", "grey", "black", "white"];
        // // give the div a colored border
        // this.divs[this.nextSlot].style.border = "1px solid "+ divDebugColor[this.nextSlot % divDebugColor.length];

        const width = getTextWidth(title) + 30;
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

        // when opened, close the others
        newGUI.onOpenClose( (changedGUI) => {

            if (!changedGUI._closed) {
                this.slots.forEach((gui, index) => {
                    if (gui !== newGUI) {
                        gui.close();
                    }
                });
            }
        })

        // allow for opening menus when hovering over the title
        // (if we've already got a menu open)
        // So the intial open is done by clicking, but subsequent opens are done by hovering
        // like with Windows and Mac menus.

        // Bind the method and store the reference in a property (so we can unbind cleanly)
        this.boundHandleTitleMouseOver = this.handleTitleMouseOver.bind(this);

        // Add the event listener using the bound method
        newGUI.$title.addEventListener("mouseover", this.boundHandleTitleMouseOver);

        return newGUI;
    }

    handleTitleMouseOver(event) {
        // event.target will be the title element we just moused over
        // find the GUI object that has this title element
        const newGUI = this.slots.find((gui) => gui.$title === event.target);

        if (this.slots.some((gui) => !gui._closed && gui !== newGUI)) {
            newGUI.open();
        }
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

}


// text width helper function
// assumes the default lil-gui font
function getTextWidth(text) {
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
    return width;
}

