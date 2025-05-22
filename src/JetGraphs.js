import {CNodeCurveEditor} from "./nodes/CNodeCurveEdit";
import {CNodeGraphSeries} from "./nodes/CNodeGraphSeries";
import {CNodeMunge, makeMunge} from "./nodes/CNodeMunge";
import {NodeMan, Sit, Units} from "./Globals";
import {acos, degrees, m2f, metersFromMiles, NMFromMeters} from "./utils";
import {pointAltitude} from "./SphericalMath";
import {CNodeTrackScreenAngle} from "./nodes/CNodeJetTrack";
import {assert} from "./assert.js";
import {getGlareAngleFromFrame} from "./JetUtils";

// add a graph of the subtended size of the target
// as a percentage of its size at the start of the video
export function AddSizePercentageGraph() {
    var sizePercentGraphNode = new CNodeCurveEditor({
        id: "sizePercentGraph",
        left: 0.45, top: 0, width: -1, height: .25,

        visible: true, draggable: true, resizable: true, shiftDrag: false, freeAspect: true,
        editorConfig: {
            minX: 0, maxX: 1031, minY: 80, maxY: 150,
            xLabel: "Frame",
            xLabelDelta: true,

            xStep: 200,
            yLabel: "Apparent Size %",
            yStep: 10,
            points: [],
        },
        displayInputs: {
            compare: new CNodeGraphSeries({
                id: "sizePercentGraphSeries",
                inputs: {
                    source: new CNodeMunge({
                        id: "sizePercentGraphMunge",
                        inputs: {targetTrack: "LOSTraverseSelect", cameraTrack: "jetTrack",},
                        munge: function (f) {
                            let d0 = this.in.targetTrack.p(0)
                                .sub(this.in.cameraTrack.p(0)).length()
                            let d1 = this.in.targetTrack.p(f)
                                .sub(this.in.cameraTrack.p(f)).length()
                            return 100 * (1 / d1) / (1 / d0); // flipped as size is reciprocal of distance
                        }
                    })
                },
                color: "#008000",
            })
        },

        frames: Sit.frames,

    })
    sizePercentGraphNode.editor.disable = true;
}

const defaultMungeInputs = {
    targetTrack: "LOSTraverseSelect",
    cameraTrack: "jetTrack",
}

const windowDefaults = {
    left: 0.30, top: 0, width: -1, height: .25,

    visible: true, draggable: true, resizable: true, shiftDrag: false, freeAspect: true,
}

const editorConfigDefaults = {
minX: 0, minY: 0, maxY: 120,
    xLabel: "Frame",
    xLabelDelta: true,

    xStep: 200,
    yStep: 10,
    points: [],
}

// generic graph that's customizable with a munge function
function addGenericJetGraph(id, yLabel, mungeInputs, windowParams, editorParams, mungeFunction, frames) {

    var frames = NodeMan.get(mungeInputs.cameraTrack).frames

    var targetDistanceGraphNode = new CNodeCurveEditor({
        id: id,

        ...windowDefaults,

        checkDisplayOutputs: true,

        editorConfig: {
            ...editorConfigDefaults,
            maxX: frames,
            yLabel: yLabel,
            ...editorParams,
        },

        displayInputs: {
            compare: new CNodeGraphSeries({
                id: id+"_GenericJetGraph_compare",
                inputs: {
                    source: new CNodeMunge({
                        id: id+"_GenericJetGraph_Munge",

                        inputs: mungeInputs,
                        munge: mungeFunction,
                    })
                },
                color: "#008000",
            })
        },

        frames: Sit.frames,
        ...windowParams,

    })
    targetDistanceGraphNode.editor.disable = true;
    return targetDistanceGraphNode;

}

export function AddTargetDistanceGraph(mungeInputs, windowParams={}, editorParams={}) {
    mungeInputs ??= defaultMungeInputs

    var mungeFunction = function (f) {
        let d0 = this.in.targetTrack.p(f)
            .sub(this.in.cameraTrack.p(f)).length()
        return NMFromMeters(d0)
    }

    return addGenericJetGraph("targetDistanceGraph", "Target Distance NM", mungeInputs, windowParams, editorParams, mungeFunction);

}


export function AddTailAngleGraph(mungeInputs, windowParams={}, editorParams={}) {

    mungeInputs ??= {
        targetTrack: "LOSTraverseSelect",
        cameraTrack: "jetTrack",
        wind: "targetWind",
    }

    var mungeFunction = function (f) {
        if (f === 0) f = 1;
        var toTarget = this.in.targetTrack.p(f)
            .sub(this.in.cameraTrack.p(f))
        var targetVel = this.in.targetTrack.p(f)
            .sub(this.in.targetTrack.p(f - 1))
            .sub(this.in.wind.p(f))
        toTarget.normalize()
        targetVel.normalize()
        const dot = toTarget.dot(targetVel)
        const angle = degrees(acos(dot))
        return angle
    }

    addGenericJetGraph("tailAngleGraph", "Tail Angle", mungeInputs, windowParams, editorParams, mungeFunction);
}

export function AddSpeedGraph(source, caption, minY = 0, maxY = 1000, left = 0.60, top = 0, width = -1, height = 0.25, lines=[], dynamicY = false) {

    let maybeGlare = {};

    if (Sit.name.startsWith("gimbal")) {
        maybeGlare = {
            // black = glare angle
            compare4: new CNodeGraphSeries({
                // Munge node to convert a traverse track to speed
                source: new CNodeMunge({
                    id: "mungeGlareAngle"+source,
                    inputs: {source: source},
                    munge: function (f) {
                        return getGlareAngleFromFrame(f)
                    }
                }),
                name: "Glare Angle",
                color: "#800000",
            }),

            compare5: new CNodeGraphSeries({
                id: "graphScreenAngle"+source,
                source: new CNodeTrackScreenAngle({
                    id: "screenAngle"+source,
                    targetTrack: source,
                    cameraTrack: "jetTrack",
                }),
                name: "Screen Angle",
                color: "#800080",
            })

        }
    }

    var speedGraphNode = new CNodeCurveEditor({
        id: "speedGraph_"+source,
        left: left, top: top, width: width, height: height,

        visible: true, draggable: true, resizable: true, shiftDrag: false, freeAspect: true,
        editorConfig: {
            //       dynamicY: true,

            minX: 0, maxX: Sit.frames, minY: minY, maxY: maxY,
            dynamicX: true,
            dynamicY: dynamicY,

            onChange: function () {

            },
            clamp: function () {
                debugger;
            },
            xLabel: "Frame",
            xStep: 200,
            yLabel: caption+" " + Units.speedUnits,
            yStep: 10,
            points: [],
            xLabelDelta: true,

            lines: lines,

        },
        inputs: {

            compare3: new CNodeGraphSeries({
                id: "graphHorizontalAirSpeed"+source,
                // Munge node to convert a traverse track to speed
                source: new CNodeMunge({
                    id: "mungeHorizontalAirSpeed"+source,
                    inputs: {source: source, wind: "targetWind"},
                    munge: function (f) {
                        if (f === 0) f = 1;
                        let move = this.in.source.p(f)
                        move.sub(this.in.source.p(f - 1))
                        move.sub(this.in.wind.p(f))
                        move.y = 0;
                        return (move.length() * this.in.source.fps * Units.m2Speed)
                    }
                }),
                name: "Horizontal Air Speed",
                color: "blue",
            }),


            // Ground speed
            compare1: new CNodeGraphSeries({
                id: "graphHorizontalGroundSpeed"+source,
                // Munge node to convert a traverse track to speed
                source: new CNodeMunge({
                    id: "mungeHorizontalGroundSpeed"+source,
                    inputs: {source: source},
                    munge: function (f) {
                        if (f === 0) f = 1;
                        let move = this.in.source.p(f)
                        move.sub(this.in.source.p(f - 1))
                        move.y = 0;
                        return (move.length() * this.in.source.fps * Units.m2Speed)
                    }
                }),
                name: "Horizontal Ground Speed",
                color: "green",
            }),

            compare: new CNodeGraphSeries({
                id: "graphObjectSpeed"+source,
                // Munge node to convert a traverse track to speed
                source: new CNodeMunge({
                    id: "mungeObjectSpeed"+source,
                    inputs: {source: source},
                    munge: function (f) {
                        if (f === 0) f = 1;
                        let move = this.in.source.p(f)
                        move.sub(this.in.source.p(f - 1))
                        return (move.length() * this.in.source.fps * Units.m2Speed)
                    }
                }),
                name: "Object Speed",
                color: "#008000",
            }),

            // RED = vertical speed
            compare2: new CNodeGraphSeries({
                id: "graphVerticalSpeed"+source,
                // Munge node to convert a traverse track to speed
                source: new CNodeMunge({
                    id: "mungeVerticalSpeed"+source,
                    inputs: {source: source},
                    munge: function (f) {
                        if (f === 0) f = 1;
                        let move = this.in.source.p(f)
                        move.sub(this.in.source.p(f - 1))
                        return (move.y * this.in.source.fps * Units.m2Speed)
                    }
                }),
                name: "Vertical Speed",
                color: "#800000",
            }),

            ...maybeGlare,



        },

        frames: Sit.frames,

    })
    speedGraphNode.editor.disable = true;

    /*
    // add a line overlay - uses an overlay so we don't have to redraw the graph
    new CNodeGraphLine({
        id:"speedGraphLine",
        overlayView:speedGraphNode.editorView,
    })
*/

    if (Sit.name.startsWith("gimbal") && Sit.name !== "gimbalsr71") {
        var speedGraphNodeFleet = new CNodeCurveEditor({
            id: "speedGraphFleet",
            left: 0.60, top: 0.25, width: -1, height: .25,

            visible: true, draggable: true, resizable: true, shiftDrag: false, freeAspect: true,
            editorConfig: {
                //       dynamicY: true,

                minX: 0, maxX: 1031, minY: 0, maxY: 6000,
                onChange: function () {

                },
                clamp: function () {
                    debugger;
                },
                xLabel: "Frame",
                xStep: 200,
                yLabel: "Fleet Speed " + Units.speedUnits,
                yStep: 100,
                points: [],
                xLabelDelta: true,


            },
            inputs: {

                compare1: new CNodeGraphSeries({
                    id: "graphHorizontalGroundSpeedFleet",
                    // Munge node to convert a traverse track to speed
                    source: new CNodeMunge({
                        id: "mungeHorizontalGroundSpeedFleet",
                        inputs: {source: "fleeter01"},
                        munge: function (f) {
                            if (f === 0) f = 1;
                            let move = this.in.source.p(f)
                            move.sub(this.in.source.p(f - 1))
                            move.y = 0;
                            return (move.length() * this.in.source.fps * Units.m2Speed)
                        }
                    }),
                    name: "Horizontal Speed",
                    color: "#000080",
                }),
            },
            frames: Sit.frames,

        })
        speedGraphNodeFleet.editor.disable = true;
    }
    return speedGraphNode;
}

export function AddAltitudeGraph(min, max, source = "LOSTraverseSelect", left  = 0.73, top =0, width = -1, height =.25, yStep=5000, xStep=200, dynamicY = false) {
    var AltitudeGraphNode = new CNodeCurveEditor({
        id: "altitudeGraph",
        left: left, top: top, width: width, height: height,


        visible: true,
        draggable: true,
        resizable: true,
        shiftDrag: false,
        freeAspect: true,
        editorConfig: {
            //     dynamicY: true,
            //     dynamicRange: 1000,
            xLabelDelta: true,
            minX: 0, maxX: Sit.frames - 1, minY: min, maxY: max,
            xLabel: "Frame", xStep: xStep, yLabel: "Target Altitude", yStep: yStep,
            xLabel2: "Alititude",
            dynamicX: true,
            dynamicY: dynamicY,
        },
        inputs: {
            compare: new CNodeGraphSeries({
                // Munge node to convert a traverse track to altitude
                source: new CNodeMunge({
                    id: "altitudeGraphMunge",
                    inputs: {source: source, radius: "radiusMiles",},
                    munge: function (f) {
                        const pos = this.in.source.p(f)
                        const alt = m2f(pointAltitude(pos, metersFromMiles(this.in.radius.v0)))
                        return alt;
                    }
                }),
                name: "Jet Altitude",
                //     min: 20000, max: 26000,
                color: "#008000",
            })
        },

        frames: Sit.frames,

    })
    AltitudeGraphNode.editor.disable = true;
    return AltitudeGraphNode;
}


// add a generic graph for a node that returns a value (like Az, El, etc)
export function AddValueGraph(v) {
// defaults were: min, max, source = "LOSTraverseSelect", left  = 0.73, top =0, width = -1, height =.25, yStep=5000, xStep=200, dynamicY = false

    const id = v.id ?? "valueGraph";
    const min = v.min ?? 0;
    const max = v.max ?? 1000;
    const source = v.source ?? "LOSTraverseSelect";
    const left = v.left ?? 0.73;
    const top = v.top ?? 0;
    const width = v.width ?? -1;
    const height = v.height ?? 0.25;
    const yStep = v.yStep ?? 5000;
    const xStep = v.xStep ?? 200;
    const dynamicY = v.dynamicY ?? false;
    const yLabel = v.yLabel ?? "Value";
    const xLabel = v.xLabel ?? "Frame";
    const xLabel2 = v.title ?? "Value";
    const yLabel2 = v.yLabel2 ?? "Value";

    const name = v.name ?? xLabel2;

    const visible = v.visible ?? true;


    var GraphNode = new CNodeCurveEditor({
        id: id,
        name: name,
        left: left, top: top, width: width, height: height,

        visible: visible,
        draggable: true,
        resizable: true,
        shiftDrag: false,
        freeAspect: true,
        editorConfig: {
            //     dynamicY: true,
            //     dynamicRange: 1000,
            xLabelDelta: false,
            minX: 0, maxX: Sit.frames - 1, minY: min, maxY: max,
            xLabel: xLabel, xStep: xStep, yLabel: yLabel, yStep: yStep,
            xLabel2: xLabel2,
            dynamicX: true,
            dynamicY: dynamicY,
        },
        inputs: {
            compare: new CNodeGraphSeries({
                // Munge node to convert a traverse track to altitude
                source: source,
                name: "yLabel",
                //     min: 20000, max: 26000,
                color: "#008000",
            })
        },

        frames: Sit.frames,

    })
    GraphNode.editor.disable = true;
    GraphNode.editorView.show(visible);
    return GraphNode;
}










// given a node and a munge function, plat a graph
// node must return a number
// for an x component use a munge node, like
// f => {return this.p(f).x}

// take array like
// [
//     ["red", "jetTrack","position","x"],
//     ["green", "jetTrack","position","y"],
// ]

export function AddGenericNodeGraph(title, yAxis, nodes, params={}, lines=[]) {

    const munges = []
    // make the munge nodes
    for (var j=0;j<nodes.length;j++) {
        //export function makeMunge(node, index1, index2, scale=1) {
        munges.push(makeMunge(nodes[j][2], nodes[j][3], nodes[j][4], nodes[j][1] ))
    }



    const frames = munges[0].frames;
    assert (frames > 0,"Generic node graph with zero frames in first munge node "+munges[0].id)


    var min = 1000000000000
    var max = -100000000000
    var minFrame = 0;
    var maxFrame = 0;
    for (var j=0;j<nodes.length;j++) {
        var node = munges[j]

        for (var i = 0; i < frames; i++) {
            var value = node.v(i)
            if (value < min) {
                min = value;
                minFrame = i

            }
            if (value > max) {
                max = value;
                maxFrame = i;
            }
        }
//        console.log(">>>>>>>>>Node "+j+" min="+min +" max="+max +" minFrame="+minFrame+" maxFrame="+maxFrame)
    }

    var inputs = {}
    var compareNumber = 1;
    for (var j=0;j<nodes.length;j++) {

        inputs["compare"+compareNumber++] = new CNodeGraphSeries({
                id: "genericGraph_"+(nodes[j][2].id !== undefined?nodes[j][2].id:nodes[j][2]),
                source: munges[j],
                name: "?????",
                //     min: 20000, max: 26000,
                color: nodes[j][0],
        })
    }

    const defaults = {
        id: "genericGraph_"+node.id,
        left: 0.25, top: 0, width: .3, height: .25,

        visible: true,
        draggable: true,
        resizable: true,
        shiftDrag: false,
        freeAspect: true,
        editorConfig: {
            dynamicY: true,
            //dynamicRange: 1000,
            xLabelDelta: true,
            minX: 0, maxX: frames - 1, minY: min, maxY: max,
            xLabel: "Frame", xStep: 200,
            yLabel: yAxis, yStep: (max-min)/10,
            xLabel2: title,
            lines: lines,
            noVerticalLines: true,
        },
        inputs: inputs,

        frames: frames,

    }

    Object.assign(defaults, params)

    var GenericGraphNode = new CNodeCurveEditor(defaults)
    GenericGraphNode.editor.disable = true;
}
