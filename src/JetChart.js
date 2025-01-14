///////////////////////////////////////////////////////////
import {NodeMan, Sit} from "./Globals";
import {saveAs} from "./js/FileSaver";
import {
    UIChangedTime
} from "./JetStuff";
import {getIdealDeroFromFrame, getPodRollFromGlareAngleFrame} from "./JetHorizon";
import {par} from "./par";
import {PRJ2XYZ} from "./SphericalMath";
import {degrees} from "./utils";
import uPlot from "./js/uPlot/uPlot.mick.esm";
import {ViewMan} from "./CViewManager";
import {
    Frame2Az, Frame2CueAz,
    getGlareAngleFromFrame,
    jetPitchFromFrame,
    jetRollFromFrame,
    pitchAndGlobalRollFromFrame,
    podRollFromFrame
} from "./JetUtils";
import {vizRadius} from "./JetStuffVars";

var lastChartData

export function UpdateChart() {
    if (theChart !== undefined) {
// regenerate the graph data when variables (like jet Pitch) change
        lastChartData = getData()
        theChart.setData(lastChartData)
    }
}

// just update the line in the chart that shows where the current frame is
export function UpdateChartLine() {
    if (theChart !== undefined) {
// regenerate the graph data when variables (like jet Pitch) change
        theChart.setData(lastChartData)
    }
}

export var theChart;

// get the data for the graph
export function getData() {

    var data = [[], [], [], [], [], [], [], [], []] // see below
    var pitch, globalRoll;

    for (var frame = 0; frame < Sit.frames; frame += 1) {
        var podRoll = podRollFromFrame(frame);
        [pitch, globalRoll] = pitchAndGlobalRollFromFrame(frame)

        data[0].push(frame / Sit.fps)

        var deroNeeded = getIdealDeroFromFrame(frame)
//        data[1].push(podRoll) // white = pod roll
        data[1].push(deroNeeded) // white = ideal derotation

        if (par.showCueData) {
            data[2].push(-Frame2Az(frame))  // yellow = Az
            if (1) {
                data[3].push(-Frame2CueAz(frame))  // Cyan = Cue Az
                //data[4].push(-this.CSV[frame][9])  // Grey = Recorded Cue Az
                data[4].push(NodeMan.get("recordedCueAz").getValueFrame(frame))
            } else {
                // super magnified
                data[3].push(20 + 25 * (-Frame2CueAz(frame) + Frame2Az(frame)))  // Cyan = Cue Az
                data[4].push(20 + 25 * (-this.CSV[frame][9] + Frame2Az(frame)))  // white recorded cue az

            }
        }

        //   if (par.showGlareGraph) {
        data[5].push(jetRollFromFrame(frame)) // red, bank angle
        data[6].push(getGlareAngleFromFrame(frame))  // green = Glare angle wrt screen

        var glarePos = PRJ2XYZ(pitch, getPodRollFromGlareAngleFrame(frame) + jetRollFromFrame(frame), jetPitchFromFrame(frame), vizRadius)

        var v = PRJ2XYZ(pitch, globalRoll, jetPitchFromFrame(frame), vizRadius)
        var errorAngle = degrees(v.angleTo(glarePos))
        data[7].push(errorAngle * 10 - 100)
        //      data[8].push(this.CSV[frame][7] - 210) // data [6] Orange = y-bump relative to 210
        //  }
    }
    return data;
}

function dumpData(data) {
    var out = ""

    out += "frame,time,pod roll,az,cue az, recorded cue az,bank,glare,error,bump\n"
    for (var f = 0; f < Sit.frames; f++) {
        out += f + ",";
        out += data[0][f] + ","
        out += data[1][f] + ","
        out += data[2][f] + ","
        out += data[3][f] + ","
        out += data[4][f] + ","
        out += data[5][f] + ","
        out += data[6][f] + ","
        out += ((data[7][f] + 100) / 10) + ","
        out += data[8][f] + "\n"
    }

    saveAs(new Blob([out]), "gimbalAppData.csv")

}

export function updateChartSize() {

    if (theChart === undefined)
        return;                                     // PATCH

    var view = ViewMan.get("chart")
    var scale = window.innerHeight / 1080
    par.graphSize = 100 * view.widthPx / (600 * scale)

    // scaling the fonts
    $("div.u-title").each(function (i) {
        this.style.fontSize = 18 * scale * par.graphSize / 100 + "px"
    })
    $("div.u-lable").each(function (i) {
        this.style.fontSize = 8 * scale * par.graphSize / 100 + "px"
    })

    // take chart size from the encapsulating view
    theChart.setSize({
        // width: 600 * scale * par.graphSize / 100,
        // height: 600 * scale * par.graphSize / 100
        width: view.widthPx,
        height: view.heightPx
    })
} // Options for the graph using uPlot.js
export var opts = {}

export function setupOpts() {

    opts = {
        title: "Pod Roll vs Glare Angle",
        width: 600,
        height: 600,
        scales: {
            x: {time: false, auto: false, range: [0, Sit.duration],},
            y: {auto: false, range: [-180, +180],},
        },
        series: [
            {label: "Time",},
            {label: "Pod Head Roll ", stroke: "white", width: 1,},
            /*       {
                       label: "Current",
                       stroke: "white",
                       width: 5,
                       fill: "rgba(255,0,0,0.1)",
                       points: {
                           space: 0,
                           fill: "transparent",
                       },
                   },
           */
            {label: "az", stroke: "yellow", width: 1,},
            {label: "Cue az", stroke: "cyan", width: 1,},
            {label: "Cue Data", stroke: "white", width: 1,},
            {label: "Bank", stroke: "red", width: 1,},
            {label: "Glare Angle", stroke: "#00FF00", width: 1,},
            {
                label: "Error", stroke: "magenta", width: 1,
                value: (self, rawValue) => {
                    return ((rawValue + 100) / 10).toFixed(2)
                }
            },
            /*
            {
                label: "Bump",
                stroke: "orange",
                width: 2,
                },
            */
        ],
        axes: [
            {
                space: 30,
                label: "Time (seconds)",
                size: 30,
                labelSize: 30,
                labelGap: 0,
                stroke: "white",
                show: true,
                labelFont: "12px Arial",
                font: "12px Arial",
                gap: 2,
                grid: {show: true, stroke: "#888", width: 0.5, dash: [],},
                ticks: {show: true, stroke: "#eee", width: 2, dash: [], size: 10,}
            },
            {
                space: 15,
                //	size: 40,
                side: 3,
                label: "Degrees",
                labelGap: 0,
                labelSize: 8 + 12 + 8,
                stroke: "white",
                grid: {show: true, stroke: "#888", width: 0.5, dash: [],},
            },
            {
                space: 15,
                //	size: 40,
                side: 1,
                //label: "Degrees Error",
                labelGap: 0,
                labelSize: 8 + 12 + 8,
                stroke: "magenta",
                grid: {show: false, stroke: "#888", width: 0.5, dash: [],},

                // This creates the limited magenta scale for the 10x error graph
                values: (u, vals, space) => vals.map(v => v < -120 ? "" : v > -40 ? "" : (v + 100) / 10 + "°"),

            }
        ],
        // The cursor parameters here override the values in cursorOpts
        // allowing us to capture and alter the cursor position in the graph
        // note this requires some "mick" modification to uPlot
        cursor: {
            dataIdx: (self, seriesIdx, hoveredIdx, cursorXVal) => {
                return par.frame
            },
            move: function cursorMove(self, mouseLeft1, mouseTop1) {

                let sc = self.scales.x;  // probably not always x
                if (sc.max > 0 && self.mickWidth != undefined) {

                    if (self.mickDragging == true) {
                        par.time = self.mickMouseLeft1 / self.mickWidth * sc.max;
                        UIChangedTime()
                        return [mouseLeft1, mouseTop1]
                    } else
                        return [par.time / sc.max * self.mickWidth, 1]
                } else return [10, 10]
//        else return [mouseLeft1, mouseTop1]
            }

        },
        legend: {
            live: false, // turn off the updating of numbers in the legned.
        }
    }
}


export var chartDiv
export function setChartDiv(div) {chartDiv = div;}

export function setupGimbalChart() {
    const data = getData();
    theChart = new uPlot(opts, data, chartDiv);
}

export function disposeGimbalChart() {
    if (theChart !== undefined) {
        theChart.destroy()
        theChart = undefined
    }
}
