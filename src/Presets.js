import {ViewMan} from "./nodes/CNodeView";
import {par} from "./par";
import {saveAs} from "./js/FileSaver";
import {chartDiv, updateChartSize} from "./JetChart";
import {infoDiv} from "./Globals";

function DumpVar(view, id) {
    return `${id}:${view[id]}, `
}

// Legacy code for Gimbal presets, not used in the current version of the project
export function DumpPreset() {
    var out = ""

    ViewMan.iterate((name, view) => {
        out += `Object.assign(viewManager.get("${name}"), {`;
        out += DumpVar(view, 'visible')
        out += DumpVar(view, 'top')
        out += DumpVar(view, 'left')
        out += DumpVar(view, 'width')
        out += DumpVar(view, 'height')
        out += '})\n'
    })
    out += `Object.assign(par, {`;
    out += DumpVar(par, 'showVideo')
    out += DumpVar(par, 'showChart')
    out += DumpVar(par, 'showCueData')
    out += DumpVar(par, 'showJet')
    out += DumpVar(par, 'showPodsEye')
    out += DumpVar(par, 'videoZoom')
    out += DumpVar(par, 'showSphericalGrid')
    out += DumpVar(par, 'showAzElGrid')
    out += DumpVar(par, 'speed')
    out += DumpVar(par, 'showKeyboardShortcuts')

    out += '})\n'

    out += 'UpdateViewsAfterPreset();\n'
    out += 'break;\n'

    saveAs(new Blob([out]), "pospreset.js")

}

function UpdateViewsAfterPreset() {
    ViewMan.iterate((key, view) => {
        view.
        updateWH();                // turn fractions into pixels
        view.setVisible(view.visible);   // set the div visibility
    })

    console.table(ViewMan.list)

    chartDiv.style.display = par.showChart ? 'block' : 'none';
    infoDiv.style.display = par.showKeyboardShortcuts ? 'block' : 'none';
    updateChartSize()
}