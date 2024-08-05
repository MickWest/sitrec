// Factory for line materials, which need to be updated on resize.
import {LineMaterial} from "three/addons/lines/LineMaterial.js";
import {Color} from "three";

var matLines = {} // collection of line materials that need updating on resize
// we make one entry per unique material
function makeMatLine(color, linewidth = 2, dashed = false) {
    if(typeof window == 'undefined')
        return null;
    
    // if it's not a color object, then make it one
    if (!color.isColor) {
        color = new Color(color);
    }

    // we need a unique ID for the material
    // so we can update the resolution
    // we use the color, linewidth, and dashed as the key
    // first we make a string of the values
    // color is THREE.Color, convert it to a hex string
    const hex = color.getHexString()
    var key = hex + String(linewidth) + String(dashed)
    if (!matLines[key]) {
//        console.warn("LEAK?: Creating new line material for key: ", key)
        var lineMaterial = new LineMaterial({
            color: color,
            linewidth: linewidth,
            dashed: dashed,
        })
        lineMaterial.resolution.set(window.innerWidth, window.innerHeight)
        matLines[key] = lineMaterial
        matLines[key].usageCount = 0;
    }
    matLines[key].usageCount++;
    return matLines[key]
}

// dispose of it if it's no longer needed
// note that we need to keep track of the usage count
// as identical materials can be used in multiple places
// and we don't want to dispose of them until they're no longer needed
export function disposeMatLine(matLine) {
    if(typeof window == 'undefined')
        return null;

    Object.keys(matLines).forEach(key => {
        if (matLines[key] === matLine) {
            matLines[key].usageCount--;
            if (matLines[key].usageCount <= 0) {
//                console.warn("LEAK?: Disposing line material for key: ", key)
                matLines[key].dispose()
                delete matLines[key]
            }
        }
    })
}

function updateMatLineResolution(windowWidth, windowHeight) {
    Object.keys(matLines).forEach(key => matLines[key].resolution.set(windowWidth, windowHeight))
}

export {updateMatLineResolution};
export {makeMatLine};