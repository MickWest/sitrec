
import {AlwaysDepth, Color, Vector3} from "../../three.js/build/three.module";
import {par} from "../par";
import {arrayColumn, ExpandKeyframes, RollingAverage, scaleF2M} from "../utils";
import {CNodeCurveEditor} from "../nodes/CNodeCurveEdit";
import {FileManager, guiJetTweaks, NodeMan, Sit} from "../Globals";
import {CNodeArray} from "../nodes/CNodeArray";
import {CNodeSwitch} from "../nodes/CNodeSwitch";
import {CNodeInterpolate} from "../nodes/CNodeInterpolate";
import {CNodeGUIValue, makeCNodeGUIValue} from "../nodes/CNodeGUIValue";
import {CNodeDerivative, CNodeGForce, CNodeMunge, makeMunge} from "../nodes/CNodeMunge";
import {CNodeNegate} from "../nodes/CNodeNegate";
import {CNodeTurnRateBS} from "../nodes/CNodeTurnRateBS";
import {CNodeWatch} from "../nodes/CNodeWatch";
import {CNodeTurnRateFromClouds} from "../nodes/CNodeTurnRateFromClouds";
import {CNodeWind} from "../nodes/CNodeWind";
import {CNodeHeading} from "../nodes/CNodeHeading";
import {CNodeJetTrack, CNodeTrackSpeed} from "../nodes/CNodeJetTrack";
import {CNodeSAPage} from "../nodes/CNodeSAPage";
import {CNodeLOSTrackAzEl} from "../nodes/CNodeLOSTrackAzEl";
import {calculateGlareStartAngle} from "../JetHorizon";
import {curveChanged, SetupCommon, SetupTrackLOSNodes, SetupTraverseNodes} from "../JetStuff";
import {LocalFrame} from "../LocalFrame";
import {gui, guiTweaks} from "../Globals";
import {SetupJetGUI} from "../JetGUI";
import {CNodeFleeter} from "../nodes/CNodeFleeter";
import {ViewMan} from "../nodes/CNodeView";
import {CNodeGraphSeries} from "../nodes/CNodeGraphSeries";
import {CNodeTraverseAngularSpeed} from "../nodes/CNodeTraverseAngularSpeed";
import {SetupCloudNodes} from "../Clouds";
import {CNodeDisplayTrack} from "../nodes/CNodeDisplayTrack";
import {CNodeConstant} from "../nodes/CNode";
import {AddGenericNodeGraph} from "../JetGraphs";
import {CNodeTrackAir} from "../nodes/CNodeTrack";
import {CNodeLOSTraverseConstantSpeed} from "../nodes/CNodeLOSTraverseConstantSpeed";
import {CNodeDisplayTargetModel} from "../nodes/CNodeDisplayTargetModel";
import {CNodeScale} from "../nodes/CNodeScale";
import {CNodeDisplayTargetSphere} from "../nodes/CNodeDisplayTargetSphere";
import {setupOpts} from "../JetChart";
import {commonJetLabels} from "./CommonSitch";

const GimbalDefaults = {
    name:"gimbal",
    isTextable: false,

    fps: 29.97,
    frames: 1031,
    aFrame: 0,
    bFrame: 1030,

    jetStuff: true, // gimbal is the only place this is used
    azSlider:{defer:true},

    //OVERRIDES:
    startDistance: 32,
    targetSpeed: 340,
    defaultTraverse:"Constant Speed",

    // arbritary lat/lon, off the coast of Florida
    lat: 28.5,
    lon: -79.5,


    files: {
        GimbalCSV: 'gimbal/GimbalData.csv',
        GimbalCSV2: 'gimbal/GimbalRotKeyframes.csv',
        GimbalCSV_Pip: 'gimbal/GimbalPIPKeyframes.csv',
        TargetObjectFile: 'models/saucer01a.glb',
        ATFLIRModel: 'models/ATFLIR.glb',
    },

    mainCamera: {},
    mainView: { left: 0.00, top: 0, width: 1, height: 1, fov: 10, background:'#000000' },

    videoFile: "../sitrec-videos/public/2 - Gimbal-WMV2PRORES-CROP-428x428.mp4",
    videoView: {left: 0.8250, top: 0.6666, width: -1, height: 0.3333,background:[1,0,0,0]},

    lookCamera: { fov:0.35 },
    lookView: {left: 0.6656, top: 1 - 0.3333, width: -1, height: 0.333,background:[0.02,0.02,0.02],
               draggable:true,resizable:true,shiftDrag:true,freeAspect:false, noOrbitControls:true},

    mirrorVideo: { transparency: 0.15, autoClear: true, autoFill: false},


    focusTracks: {
        "Default": "default",
        "Jet track": "jetTrack",
        //"Target Track": "targetTrack",
        "Traverse Path (UFO)": "LOSTraverseSelect"
    },


    include_JetLabels: true,

    setup: function () {
        setupOpts();

        par.deroFromGlare = true;
        par.showGlareGraph = true;

        this.CSV = FileManager.get("GimbalCSV");

        this.CSV2 = FileManager.get("GimbalCSV2");
        this.CSV2 = ExpandKeyframes(this.CSV2, 1031)

        this.CSV_Pip = FileManager.get("GimbalCSV_Pip");
        this.CSV_Pip = ExpandKeyframes(this.CSV_Pip, 1031, 0, 7)
        this.CSV_Pip = RollingAverage(this.CSV_Pip, 10)

        this.glareAngleOriginal = (arrayColumn(this.CSV, 1));
        this.glareAngleSmooth = RollingAverage(this.glareAngleOriginal, 6)

        SetupJetGUI()
        SetupCommon()
        SetupGimbal();
        SetupTraverseNodes({
            "Straight Line": "LOSTraverseStraightLine",
            "Const Ground Spd": "LOSTraverseConstantSpeed",
            "Const Air Spd": "LOSTraverseConstantAirSpeed",
            "Const Air AB": "LOSTraverseStraightConstantAir",
            "Constant Altitude": "LOSTraverseConstantAltitude",
            "Constant Vc (closing vel)": "LOSTraverse1",
        },this.defaultTraverse)

        new CNodeGUIValue({id:"fleetTurnStart", value:this.fleetTurnStart,start:0,end:35,step:0.1, desc: "Fleet Turn Start"},guiTweaks)
        new CNodeGUIValue({id:"fleetTurnRate", value:this.fleetTurnRate,start:0,end:50,step:0.1, desc: "Fleet Turn Rate"},guiTweaks)
        new CNodeGUIValue({id:"fleetAcceleration", value:this.fleetAcceleration,start:1,end:50,step:0.1, desc: "Fleet Acceleration"},guiTweaks)
        new CNodeGUIValue({id:"fleetSpacing", value:this.fleetSpacing,start:0.01,end:4,step:0.01, desc: "Fleet Spacing"},guiTweaks)
        new CNodeGUIValue({id:"fleetX", value:this.fleetX,start:-10,end:20,step:0.01, desc: "Fleet X"},guiTweaks)
        new CNodeGUIValue({id:"fleetY", value:this.fleetY,start:-10,end:10,step:0.01, desc: "Fleet Y"},guiTweaks)

        const fleetDefaults = {
            gimbal: "LOSTraverseSelect",
            turnRate: "fleetTurnRate",       // degrees per second
            acc:"fleetAcceleration",
            spacing:"fleetSpacing",
            fleetX:"fleetX",
            fleetY:"fleetY",
        }

        new CNodeFleeter({id:"fleeter01",
            ...fleetDefaults,
            turnFrame: new CNodeMunge({inputs: {t:"fleetTurnStart"}, frames:0, munge: function(f) {return 30*(this.in.t.v(0)+2.1)}}),   // when do we start to turn
            offX: -2, offY:0, offZ: -1, // offset in NM
        })


        new CNodeFleeter({id:"fleeter02",
            ...fleetDefaults,
            turnFrame: new CNodeMunge({inputs: {t:"fleetTurnStart"}, frames:0, munge: function(f) {return 30*(this.in.t.v(0)+1.2)}}),   // when do we start to turn
            offX: -1, offY:0, offZ: -2, // offset in NM
        })

        new CNodeFleeter({id:"fleeter03",
            ...fleetDefaults,
            turnFrame: new CNodeMunge({inputs: {t:"fleetTurnStart"}, frames:0, munge: function(f) {return 30*(this.in.t.v(0)-1.2)}}),   // when do we start to turn
            offX: 0, offY:0, offZ: -3, // offset in NM
        })

        new CNodeFleeter({id:"fleeter04",
            ...fleetDefaults,
            turnFrame: new CNodeMunge({inputs: {t:"fleetTurnStart"}, frames:0, munge: function(f) {return 30*(this.in.t.v(0)-2.1)}}),   // when do we start to turn
            offX: 1, offY:0, offZ: -2, // offset in NM
        })

        new CNodeFleeter({id:"fleeter05",
            ...fleetDefaults,
            turnFrame: new CNodeMunge({inputs: {t:"fleetTurnStart"}, frames:0, munge: function(f) {return 30*(this.in.t.v(0))}}),   // when do we start to turn
            offX: 2, offY:0, offZ: -1, // offset in NM
        })

        const fleetDisplayDefaults = {
           // color: new CNodeConstant({value:new Color(0.5,0.5,0.5)}),
            width: 1,
            autoSphere: 100,
            color: 0xc0c000
        }

        new CNodeDisplayTrack({
            ...fleetDisplayDefaults,
            id:"fleeter01Display",
            track: "fleeter01",
        })
        new CNodeDisplayTrack({
            ...fleetDisplayDefaults,
            id:"fleeter02Display",
            track: "fleeter02",
        })
        new CNodeDisplayTrack({
            ...fleetDisplayDefaults,
            id:"fleeter03Display",
            track: "fleeter03",
        })
        new CNodeDisplayTrack({
            ...fleetDisplayDefaults,
            id:"fleeter04Display",
            track: "fleeter04",
        })
        new CNodeDisplayTrack({
            ...fleetDisplayDefaults,
            id:"fleeter05Display",
            track: "fleeter05",
        })


        var SA = ViewMan.get("SAPage")
        SA.addHAFU(NodeMan.get("LOSTraverseSelect"),"Hostile","Hostile",0)

//    ["fleeter01","fleeter02"]
//        .forEach(f=>SA.addHAFU(NodeMan.get(f),"Unknown","None",10))

        SA.addHAFU(NodeMan.get("fleeter01"),"Friendly","Friendly",10)
        SA.addHAFU(NodeMan.get("fleeter02"),"Friendly","Friendly",10)
        SA.addHAFU(NodeMan.get("fleeter03"),"Friendly","Friendly",20)
        SA.addHAFU(NodeMan.get("fleeter04"),"Friendly","Friendly",15)
        SA.addHAFU(NodeMan.get("fleeter05"),"Friendly","Friendly",5)

        SetupTrackLOSNodes()
        SetupCloudNodes()

        // angular speed of the traversal at the horizon
        NodeMan.get("cloudSpeedEditor").editorView.addInput("compare",
            new CNodeGraphSeries({
                inputs: {
                    source: new CNodeTraverseAngularSpeed({
                        inputs: {
                            track: "jetTrack",
                            traverse: "LOSHorizonTrack",
                            wind: "cloudWind",
                        },
                    })
                },
                name: "Cloud Speed",
                //    min: -.5, max: .5,
                color: "green",
//                lines: [{y: 0, color: "#000000"}]


            })
        )

        // blue = actual turn rate
        NodeMan.get("cloudSpeedEditor").editorView.addInput("compare1",
            new CNodeGraphSeries({
                inputs: {source: "turnRate"},
                name: "Sim Turn Rate",
                color: "#8080F0",
                min: -2.5, max: -1,

            })
        )

        NodeMan.get("cloudSpeedEditor").editorView.recalculate()

        var azEditorNode = NodeMan.get("azEditor")

        azEditorNode.editorView.addInput("compare",
            new CNodeGraphSeries({
                inputs: {
                    source: new CNodeMunge({
                        inputs: {az: "azMarkus"}, munge: function (f) {
                            return this.in.az.getValueFrame(f)
                        }
                    })
                },
                name: "Markus Az",
                color: "#008000",

            }))

        azEditorNode.editorView.addInput("compare1",
            new CNodeGraphSeries({
                inputs: { source: "azSources"},
                name: "Selected Az",
                color: "#8080F0",
            }),
        )


        azEditorNode.editorView.addInput("compare2",
            new CNodeGraphSeries({
                inputs: {
                    source: new CNodeMunge({
                        inputs: {az: "azSources"}, munge: function (f) {
                            if (f==0) f=1;
                            return (this.in.az.v(f)-this.in.az.getValue(f-1))*10
                        }
                    })
                },
                name: "Delta Az",
                color: "#0080FF",
                lines: [{y: 0, color: "#0000FF"}],
                min: -10, max: 10,

            }))
        azEditorNode.editorView.recalculate()


        AddGenericNodeGraph("Acceleration","Object g-force", [
                [ "black", 1, new CNodeGForce("LOSTraverseSelect",[1,1,1])],
                // the blue line will be the same as the green line if wind is constant
                // which it is, so I'm currently not drawing it.
                //[ "blue", 1, new CNodeGForce("LOSTraverseSelect",[1,0,1],"targetWind")],
                [ "green", 1, new CNodeGForce("LOSTraverseSelect",[1,0,1])],
                [ "red", 1, new CNodeGForce("LOSTraverseSelect",[0,1,0])],
                //[ "red", 1, "glareAngle" ],
                // [ "black", 1, new CNodeMunge({inputs:{source:"bank"},munge:function(f) {
                //     return (this.in.source.v(f)+40)/60
                //     }}) ],
        ],
            {
                left: 0.0, top: 0.0, width: 0.5 * 9 / 16, height: 0.5,
            },
            [
                {x: 716, x2:725, color: "#FF00ff40"},
                {x: 813,x2:828, color: "#ff00ff40"},
                {x: 861,x2:943, color: "#ff00ff40"},
                {x: 978,x2:984, color: "#ff00ff40"},

            ]
        )

        new CNodeTrackAir({
            id:"airTrack",
            source:"LOSTraverseSelect",
            wind:"targetWind"
        })

        new CNodeDisplayTrack({
            id:"AirTrackDisplay",
            track: "airTrack",
            color: new CNodeConstant({value: new Color(0, 0.5, 1)}),
       //     secondColor:    new CNodeConstant({value: new Color(0, 0, 0.75)}),

            width: 1,
            visibleCheck: (()=> {return ViewMan.get("SAPage").buttonBoxed(16)}),
        })


        // END OF SETUP
    }



}


export const SitGimbal = {
    ...GimbalDefaults,
    menuName: "Gimbal (Far)",

    fleetTurnStart: 0,
    fleetTurnRate: 8,
    fleetAcceleration: 2,
    fleetSpacing:0.7,
    fleetX: 20,
    fleetY:-5.27,

    showGlare:true,


    startDistance: 32,
  //  startDistanceMax: 1000,


    targetSpeed: 340,
    defaultTraverse: "Const Air Spd",

    mainCamera: {
        startCameraPosition: [45827.79, 51645.36, 17968.72],
        startCameraTarget: [44976.22, 51163.57, 17762.06],
    },

    lookCamera: { fov:0.35 },

    cloudWindFrom: 240,
    cloudWindKnots: 17,
    targetWindFrom: 274,
    targetWindKnots:65,
    localWindFrom: 270,
    localWindKnots: 120,

    files: {
        FA18Model: 'models/FA-18F.glb',
        GimbalCSV: 'gimbal/GimbalData.csv',
        GimbalCSV2: 'gimbal/GimbalRotKeyframes.csv',
        GimbalCSV_Pip: 'gimbal/GimbalPIPKeyframes.csv',
        TargetObjectFile: 'models/FA-18F.glb',
        ATFLIRModel: 'models/ATFLIR.glb',
    },


    setup2: function () {

        new CNodeDisplayTargetModel({
            inputs: {
                track: "LOSTraverseSelect",
                // the size node has the UI in feet, but returns meters
                // we use it to scale a 1m diameter (0.5m radius) sphere
                // so If the UI shows 1 foot, the sphere with had a 1 foot diameter.
                size: new CNodeScale("sizeScaled", scaleF2M,
                    new CNodeGUIValue({
                        value: Sit.targetSize,
                        start: 0,
                        end: 2000,
                        step: 0.1,
                        desc: "Target size ft"
                    }, gui)
                )
            },

            wind:"targetWind",
            airTrack: "airTrack",

            //  model: FA182,
        })

        new CNodeDisplayTargetSphere({
            inputs: {
                track: "LOSTraverseSelect",
                size: "sizeScaled",
            },

        })




    },

}


export const SitGimbalNear = {
    ...GimbalDefaults,

    name: "gimbalnear",
    menuName: "Gimbal (Near)",

    fleetTurnStart: 0,
    fleetTurnRate: 8,
    fleetAcceleration: 4,
    fleetSpacing:0.99,
    fleetX: -5.57,
    fleetY:1.6,

    showGlare:false,


    files: {
        GimbalCSV: 'gimbal/GimbalData.csv',
        GimbalCSV2: 'gimbal/GimbalRotKeyframes.csv',
        GimbalCSV_Pip: 'gimbal/GimbalPIPKeyframes.csv',

        TargetObjectFile: './models/saucer01a.glb',
        ATFLIRModel: 'models/ATFLIR.glb',
        FA18Model: 'models/FA-18F.glb',

    },

    startDistance: 6,
    targetSpeed: 320,
    targetSize: 1,   // diameter of sphere, around 22 feet.


    defaultTraverse:"Straight Line",

    mainCamera: {
        startCameraPosition: [22361.77, 19855.62, 1055.93],
        startCameraTarget: [21400.39, 19583.24, 1095.64],
    },

    lookCamera: { fov:0.35 },

    cloudWindFrom: 240,
    cloudWindKnots: 17,
    targetWindFrom: 280,
    targetWindKnots: 120,
    localWindFrom: 280,
    localWindKnots: 120,

    relativeHeading: 10,

    altitudeLabelFar:      { kind: "MeasureAltitude",position: "FARLOSTraverseConstantSpeed", defer: true },

    setup2: function () {

        new CNodeLOSTraverseConstantSpeed({
            id: "FARLOSTraverseConstantSpeed",
            inputs: {
                LOS: "JetLOS",
                startDist: new CNodeConstant({value: 55560}),
                speed: "speedScaled",
                wind: "targetWind"
            },
            airSpeed:false,
        })



        new CNodeDisplayTrack({
            track: "FARLOSTraverseConstantSpeed",
            color: new CNodeConstant({value: new Color(1, 1, 0)}),
            secondColor:    new CNodeConstant({value: new Color(0.75, 0.75, 0)}),
            width: 3,
            depthFunc:AlwaysDepth,
            toGround:60,
        })


        new CNodeDisplayTargetModel({
            inputs: {
                track: "LOSTraverseSelect",
                airTrack: "airTrack",
                size: new CNodeScale("sizeScaled", scaleF2M,
                    new CNodeGUIValue({
                        value: Sit.targetSize,
                        start: 1,
                        end: 2000,
                        step: 0.1,
                        desc: "Target size ft"
                    }, gui)
                )
            },
            tiltType: "glareAngle",
            wind:"targetWind",

            //  model: FA182,
        })


        new CNodeDisplayTargetSphere({
            inputs: {
                track: "LOSTraverseSelect",
                size: "sizeScaled",
            },

        })


        //  new CNodeDisplayTargetSphere({
        //     inputs: {
        //         track: "LOSTraverseSelect",
        //         size: "sizeScaled",
        //     },
        //
        //     layers: LAYER.MASK_LOOK,
        // })


    },

}


export function SetupGimbal() {

    console.log("+++ azEditor Node")
    var azEditorNode = new CNodeCurveEditor({
            id: "azEditor",
            visible: false,
            left: 0.25, top: 0.0, width: -1, height: 0.5,
            draggable: true, resizable: true, shiftDrag: true, freeAspect: true,
            editorConfig: {
                useRegression: true,
                minX: 0, maxX: Sit.frames - 1, minY: -60, maxY: 10,
                xLabel: "Frame", xStep: 1, yLabel: "Azimuth", yStep: 10,
                points: [0, -54, 592.475, -27.197, 226.259, -43.677, 226.259, -47.601, 496.834, -28.925, 496.834, -32.848, 732.43, -13.232, 732.43, -17.156, 891.048, -1.614, 891.048, -5.538, 1031, 7, 902.711, -2.243], // for regression
            },
            frames: Sit.frames,
        }
    )
    azEditorNode.editorView.visible = false;


    new CNodeArray({id: "azMarkus", array: Sit.CSV.map(row => -row[5])})

    console.log("+++ azSources Node")
    new CNodeSwitch({
        id: "azSources",
        inputs: {
            'Az Markus Smoothed': "azMarkus",
            'Az Editor': "azEditor",
            'Az Unsmoothed': new CNodeArray({array: Sit.CSV.map(row => -row[4])}),
            //    'Cue Dot smoothed': new CNodeArray({array: Sit.CSV_Pip}),
            'Linear': new CNodeInterpolate({
                start: -54, startFrame: 18,
                end: 7, endFrame: 1023,
                frames: Sit.frames,
            })
        },
        onChange: function () {
            calculateGlareStartAngle()
            curveChanged()
        },
        desc: "Azimuth Type"

    }, guiJetTweaks)

    console.log("+++ jetTAS Node")
    makeCNodeGUIValue("jetTAS", 351, 320, 360, 0.1, "TAS", guiJetTweaks)
    var elStartNode = makeCNodeGUIValue("elStart", -2.01, -4, 0, 0.001, "el Start", guiTweaks, curveChanged)
    var elRiseNode = makeCNodeGUIValue("elRise", 0.025, -0.1, 0.1, 0.00001, "el Rise", guiTweaks, curveChanged)

    new CNodeMunge({
        id: "el",
        inputs: {start: elStartNode, rise: elRiseNode},
        frames: Sit.frames,
        munge: function (f) {
            return this.in.start.v(f) + this.in.rise.v(f) * f / this.frames
        }
    })

    console.log("+++ bankNode")
    new CNodeSwitch({
            id: "bank",
            inputs: {
                "Recorded Angle": new CNodeArray({array: Sit.CSV.map(row => -parseFloat(row[3]))}),
                "User Bank Angle": new CNodeGUIValue({ id: "userBankAngle",
                    value: -35, desc: "User Bank Angle", start: -40, end: -20, step: 0.1
                }, guiJetTweaks),
            },
            onChange: curveChanged,
            desc: "Bank Angle Type"
        },
        guiJetTweaks)

    console.log("+++ glareAngle node")
    new CNodeSwitch({
        id: "glareAngle",
        inputs: {
            "Unsmoothed": new CNodeNegate({node: new CNodeArray({array: Sit.CSV.map(row => parseFloat(row[1]))})}),
            "Moving Average": new CNodeNegate({node: new CNodeArray({array: Sit.glareAngleSmooth})}),
            "Markus Smoothed": new CNodeNegate({node: new CNodeArray({array: Sit.CSV.map(row => parseFloat(row[6]))})}),
            "MickKeyframe": new CNodeArray({array: Sit.CSV2}),
            "Markus Keyframe": new CNodeNegate({node: new CNodeArray({array: Sit.CSV.map(row => parseFloat(row[13]))})}),
        },
        desc: "NEW Glare Angle",
        default: "Markus Keyframe",
        onChange: function () {
            calculateGlareStartAngle()
            curveChanged()
        },
    }, guiJetTweaks)


    new CNodeNegate({id: "recordedCueAz", node: new CNodeArray({array: Sit.CSV.map(row => parseFloat(row[9]))})}),

        console.log("+++ turnRateBS Node")
    new CNodeTurnRateBS({
        id: "turnRateBS",
        inputs: {
            speed: new CNodeWatch({ob: par, watchID: "TAS"}),
            bank: "bank"
        }
    })


    console.log("+++ cloudSpeedEditor Node")
    const cloudSpeedEditor = new CNodeCurveEditor({
            id: "cloudSpeedEditor",
//        left:0, top:0.5, width:-1,height:0.5,
            left: 0.0, top: 0.0, width: -1, height: 0.5,
            draggable: true, resizable: true, shiftDrag: true, freeAspect: true,
            editorConfig: {
                minX: 0, maxX: 1031, minY: -0.30, maxY: 0.1,
                xLabel: "Frame", xStep: 1, yLabel: "Cloud Speed", yStep: 0.02,
                //        points:[0,-0.139,454.256,-0.129,746.435,-0.052,657.793,-0.07,1030,-0.023,900,-0.025],
                // trying to match TheCholla's measurements of cloud speed.
                // incorporate a particular set of wind
                points: [0, -0.155, 181.334, -0.132, 433.866, -0.091, 354.555, -0.102, 718.438, -0.055, 632.133, -0.069, 1030, -0.013, 897.667, -0.023],
            },
            frames: Sit.frames,
            visible: true,
        }
    )

    var turnRateFromCloudsNode = new CNodeTurnRateFromClouds({
        inputs: {
            cloudAlt: "cloudAltitude",
            speed: "jetTAS",
            altitude: "jetAltitude",
            radius: "radiusMiles",
            az: "azSources",
            cloudSpeed: "cloudSpeedEditor",
        }
    })

    console.log("+++ turnRateNode")
    new CNodeSwitch({
        id: "turnRate",
        inputs: {
            "Match Clouds": turnRateFromCloudsNode,
            //      "Curve Editor": turnRateEditorNode,
            "From Bank and Speed": "turnRateBS",
            "User (fine)": new CNodeGUIValue({
                value: -1.6,
                desc: "User Turn Rate",
                start: -2,
                end: -1.64,
                step: 0.001
            }, guiJetTweaks),
            "User (large)": new CNodeGUIValue({
                value: -1.6,
                desc: "User Turn Rate",
                start: -3,
                end: 1,
                step: 0.01
            }, guiJetTweaks)
        },
        desc: "Turn Rate Type"
    }, guiJetTweaks)


    new CNodeWind({
        id: "cloudWind",
        from: Sit.cloudWindFrom,
        knots: Sit.cloudWindKnots,
        name: "Cloud",
        arrowColor: "white",
        radius: "radiusMiles",

        pos: "jetTrack",

    }, gui)

    new CNodeWind({
        id: "targetWind",
        from: Sit.targetWindFrom,
        knots: Sit.targetWindKnots,  // 90
        name: "Target",
        arrowColor: "yellow",
        radius: "radiusMiles",
        pos: "LOSTraverseSelect",


    }, gui)

    new CNodeWind({
        id: "localWind",
        from: Sit.localWindFrom,
        knots: Sit.localWindKnots,  // 120 knots from the west
        name: "Local",
        arrowColor: "cyan",
        radius: "radiusMiles",
        pos: "jetTrack",


    }, gui)


    new CNodeHeading({
        id: "initialHeading",
        heading: 315,
        name: "Initial",
        arrowColor: "green"

    }, gui)

    console.log("+++ jetTrack Node")
    var jetTrack = new CNodeJetTrack({
        id: "jetTrack",
        inputs: {
            speed: "jetTAS",
            altitude: "jetAltitude",
            turnRate: "turnRate",
            radius: "radiusMiles",
            wind: "localWind",
            heading: "initialHeading"
        },
        frames: Sit.frames,
    })

    console.log("vvvv CNodeSAPage")
    // this goes where the Cloud Speed Editor was before
    new CNodeSAPage({
        id: "SAPage",
        jetTrack: "jetTrack",
        windLocal: "localWind",
        windTarget: "targetWind",
        left: 0.0, top: 1 - 0.5, width: -1, height: 0.5,
        background: new Color().setRGB(0.0, 0.0, 0.0),
        draggable: true, resizable: true,

    })
    LocalFrame.position.copy(jetTrack.v0.position.clone())
    console.log("Setting LocalFrame Position to " + LocalFrame.position.x + "," + LocalFrame.position.y + "," + LocalFrame.position.z)
    console.log("+++ JetLOS Node")
    new CNodeLOSTrackAzEl({
        id: "JetLOS",
        inputs: {
            jetTrack: "jetTrack",
            az: "azSources",
            el: "el",
        }
    })

}
