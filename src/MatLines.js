
import {LineMaterial} from "../three.js/examples/jsm/lines/LineMaterial";

var matLines = {} // collection of line materials that need updating on resize
// we make one entry per unique material
function makeMatLine(color, linewidth = 2, dashed = false) {
    var key = String(color) + String(linewidth) + String(dashed)
    if (!matLines[key]) {
        var lineMaterial = new LineMaterial({
            color: color,
            linewidth: linewidth,
            dashed: dashed,
        })
        lineMaterial.resolution.set(window.innerWidth, window.innerHeight)
        matLines[key] = lineMaterial
    }
    return matLines[key]
}

function updateMatLineResolution(windowWidth, windowHeight) {
    Object.keys(matLines).forEach(key => matLines[key].resolution.set(windowWidth, windowHeight))
}

export {updateMatLineResolution};
export {makeMatLine};