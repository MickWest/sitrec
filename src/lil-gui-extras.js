// Helper functions for lil-gui
import {GUI, Controller} from "./js/lil-gui.esm";

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

