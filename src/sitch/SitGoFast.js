import {
    AlwaysDepth,
    DirectionalLight,
    HemisphereLight,
} from "../../three.js/build/three.module";
import {EarthRadiusMiles, guiJetTweaks, Sit} from "../Globals";
import * as LAYER from "../LayerMasks";
import {
    ExpandKeyframes,
    f2m,
    metersFromNM,
    NMFromMeters,
    RollingAverage,
    scaleF2M
} from "../utils";
import {CNodeCurveEditor} from "../nodes/CNodeCurveEdit";
import {ViewMan} from "../nodes/CNodeView";
import {par} from "../par";
import {CNodeJetTrack} from "../nodes/CNodeJetTrack";
import {closingSpeed, CNodeConstant} from "../nodes/CNode";
import {CNodeWatch} from "../nodes/CNodeWatch";
import {CNodeSwitch} from "../nodes/CNodeSwitch";
import {CNodeArray} from "../nodes/CNodeArray";
import {CNodeGUIValue} from "../nodes/CNodeGUIValue";
import {CNodeMunge} from "../nodes/CNodeMunge";
import {CNodeInterpolate} from "../nodes/CNodeInterpolate";
import {CNodeGraphSeries} from "../nodes/CNodeGraphSeries";
import {CNodeDisplayOcean} from "../nodes/CNodeDisplayOcean";
import {CNodeDisplayTrack} from "../nodes/CNodeDisplayTrack";
import {CNodeDisplayTargetSphere} from "../nodes/CNodeDisplayTargetSphere";
import {CNodeLOSTrackAzEl} from "../nodes/CNodeLOSTrackAzEl";
import {CNodeLOSTraverse} from "../nodes/CNodeLOSTraverse";
import {CNodeLOSTraverseConstantAltitude} from "../nodes/CNodeLOSTraverseConstantAltitude";
import {CNodeTurnRateBS} from "../nodes/CNodeTurnRateBS";
import {CNodeScale} from "../nodes/CNodeScale";
import {CNodeDisplayTrackToTrack} from "../nodes/CNodeDisplayTrackToTrack";
import {CNodeWind} from "../nodes/CNodeWind";
import {CNodeHeading} from "../nodes/CNodeHeading";
import {AddGenericNodeGraph, AddSpeedGraph} from "../JetGraphs";
import {gui, guiTweaks, NodeMan, } from "../Globals";
import {GlobalScene} from "../LocalFrame";
import {initJetVariables, initViews, SetupCommon, SetupTrackLOSNodes, SetupTraverseNodes} from "../JetStuff";
import {GridHelperWorld, MV3, V3} from "../threeExt";
import {CNodeATFLIRUI} from "../nodes/CNodeATFLIRUI";
import {CNodeInterpolateTwoFramesTrack} from "../nodes/CNodeTrack";
import {CNodeDisplayLOS} from "../nodes/CNodeDisplayLOS";
import {makeMatLine} from "../MatLines";
import {CNodeLOSTrackTarget} from "../nodes/CNodeLOSTrackTarget";
import {FileManager} from "../CFileManager";
import {Color, MeshStandardMaterial, TextureLoader} from "three";
import {addControllerTo} from "../nodes/CNodeController";

export var SitGoFast = {
    name: "gofast",
    menuName: "GoFast",

    animate:true,
    azSlider:true,

    fps: 29.97,
    frames: 1031,
    aFrame: 375,  // Overwritten??????? Not any more....
    bFrame: 1030, // but this is
    startDistance: 4,
    startDistanceMin: 0,
    startDistanceMax: 15,
    targetSize: 3,


    heading: 262,   // initial heading of the jet - was 314

    files: {
        GoFastBank: 'gofast/Go Fast Tilt tracking.csv',
        GoFastAz: 'gofast/Go Fast AZ.csv',
        GoFastEl: 'gofast/Go Fast El.csv',
        GoFastRNG: 'gofast/Go Fast RNG.csv',
    },
    videoFile: "../sitrec-videos/public/3 - GOFAST CROP HQ - 01.mp4",

    lookCamera: { fov: 0.7,},
    mainCamera: {
        startCameraPosition: [25034.03, 13882.82, 10206.08],
        startCameraTarget: [24090.07, 13646.05, 9976.13],
    },

    mainView: {left: 0, top: 0, width: 1, height: 1,background:[0.05,0.05,0.05]},
    lookView: {left: 0.64, top: 1 - 0.3333, width: -1, height: 0.333,},
    videoView: {left: 0.8250, top: 0.6666, width: -1, height: 0.3333,},

    focusTracks:{
        "Ground (no track)": "default",
        "Jet track": "jetTrack",
        "Traverse Path (UFO)": "LOSTraverseSelect"
    },

    targetSizedSphere: { defer: true, size:3, targetTrack: "LOSTraverseSelect" },

    updateFunction: function (f) {
        const targetNode = NodeMan.get("LOSTraverseSelect")
        const jetNode = NodeMan.get("JetLOS")
        var A = targetNode.p(f)
        var B = jetNode.p(f)
        var rng = NMFromMeters(B.sub(A).length())
        par.rng = rng;

        var Vc = NMFromMeters(this.fps*60*60*closingSpeed( targetNode, jetNode, f))
        par.Vc = Vc
    },

    setup: function () {

        SetupCommon()

        // NOTE: ADDED SMOOTHING GURERNTLY, MAYBE TOO MUCH?
        // but linear interpolation introduces nasty discontinuities

        this.GoFastBank = RollingAverage(FileManager.get('GoFastBank').map(row => -parseFloat(row[12])),50)
        this.GoFastAz = ExpandKeyframes(FileManager.get('GoFastAz'), Sit.frames)
        this.GoFastEl = RollingAverage(ExpandKeyframes(FileManager.get('GoFastEl'), Sit.frames),50)
        this.GoFastRNG = RollingAverage(ExpandKeyframes(FileManager.get('GoFastRNG'), Sit.frames),50)


    //     var view = new CNodeView3D({id:"mainView",
    //         visible:true,
    //         left: 0, top: 0, width: 1, height: 1,
    //         fov: 10,
    //         doubleClickResizes: false,
    //         draggable: false, resizable: false, shiftDrag: true, freeAspect: true,
    //         camera: "mainCamera",
    //         renderFunction: function() {
    //             this.renderer.render(GlobalScene, this.camera);
    //             //     labelRenderer.render( GlobalScene, this.camera );
    //
    // //            this.div.style.pointerEvents = keyHeld['q']?'auto':'none';
    //         },
    //         defaultTargetHeight: 25000,
    //         background: new Color().setRGB(0.0, 0.0, 0.0),
    //
    //         focusTracks:{
    //             "Ground (no track)": "default",
    //             "Jet track": "jetTrack",
    //             "Traverse Path (UFO)": "LOSTraverseSelect"
    //         },
    //
    //     })
    //     view.addOrbitControls(this.renderer);



        console.log("+++ azEditor Node")
        var azEditorNode = new CNodeCurveEditor({
                id: "azEditor",   // GOFast
                visible: true,
                left: 0, top: 0.0, width: -1, height: 0.5,
                draggable: true, resizable: true, shiftDrag: true, freeAspect: true,
                editorConfig: {
                    useRegression: true,
                    minX: 0, maxX: 1031, minY: -60, maxY: -30,
                    xLabel: "Frame", xStep: 1, yLabel: "Azimuth", yStep: 5,
                    points: [0, -35, 373.215, -35.655, 233.258, -40.092, 233.258, -41.773, 524.826, -47.886, 522.493, -49.007, 835.059, -54.128, 835.059, -55.249, 1031, -58.215, 900, -58.215],
                },
                frames: Sit.frames,
            }
        )

        new CNodeArray({id: "azCSVGoFast", array: this.GoFastAz})

        // GOFAST
        console.log("+++ azSources Node")
        new CNodeSwitch({
            id: "azSources",
            inputs: {
                'Az Editor': "azEditor",
                'Az Gimbal Video': "azCSVGoFast",
                'Linear': new CNodeInterpolate({
                    start: -43, startFrame: 383,
                    end: -57, endFrame: 982,
                    frames: Sit.frames,
                })
            },
            desc: "Azimuth Type"

        }, gui)

// GOFAST (Was 341)
        new CNodeGUIValue({id: "jetTAS", value: 369, start: 320, end: 410, step: 0.1, desc: "TAS"}, gui)
        new CNodeArray({id: "el", array: this.GoFastEl})

// GOFAST
        new CNodeSwitch({
                id: "bank",
                inputs: {
                    "Recorded Angle": new CNodeArray({array: this.GoFastBank}),
                    "User Bank Angle": new CNodeGUIValue({
                        value: -11,
                        desc: "User Bank Angle",
                        start: -20,
                        end: 1,
                        step: 0.1
                    }, gui),
                },
                desc: "Bank Angle Type"
            },
            gui)


// GOFAST
        new CNodeTurnRateBS({
            id: "turnRateBS",
            inputs: {
                speed: new CNodeWatch({ob: par, id: "TAS"}),
                bank: "bank"
            }
        })


// GOFAST
        new CNodeSwitch({
            id: "turnRate",
            inputs: {
                //        "Curve Editor": turnRateEditorNode,
                "From Bank and Speed": "turnRateBS",
                "User Constant": new CNodeGUIValue({
                    value: -1.6,
                    desc: "User Turn Rate",
                    start: -3,
                    end: 3,
                    step: 0.001
                }, gui)
            },
            desc: "Turn Rate Type"
        }, gui)

// GOFAST

        new CNodeWind({
            id: "targetWind",
            from: 274,
            knots: 65,
            name: "Target",
            arrowColor: "cyan"

        }, gui)

        // similar to Gimbal
        new CNodeWind({
            id: "localWind",
            from: 270,
            knots: 120,  // was 120 knots from the west
            name: "Local",
            arrowColor: "cyan"

        }, gui)



        new CNodeHeading({
            id: "initialHeading",
            heading: Sit.heading,
            name: "Initial",
            arrowColor: "green"

        }, gui)

        new CNodeJetTrack({
            id: "jetTrack",
            inputs: {
                speed: "jetTAS",         // new CNodeWatch({ob:par,id:"TAS"}),
                altitude: "jetAltitude",
                turnRate: "turnRate",
                radius: "radiusMiles",
                wind: "localWind",
                heading: "initialHeading",
            },
            frames: Sit.frames,
        })


// GOFAST
        new CNodeLOSTrackAzEl({
            id: "JetLOS",
            inputs: {
                jetTrack: "jetTrack",
                az: "azSources",
                el: "el",
            }
        })

        new CNodeMunge({
            id: "GoFastRNG",
            inputs: {NM: new CNodeArray({array: this.GoFastRNG})},
            munge: function (f) {
                return this.in.NM.v(f)
            }
        }),

// GOFAST
            new CNodeLOSTraverse({
                id: "LOSTraverseRNG",
                LOS: "JetLOS",
                range: "GoFastRNG",
            })


        new CNodeInterpolateTwoFramesTrack({
            id: "LOSTwoPoint",
            source: "LOSTraverseRNG",
            start: new CNodeConstant({value:Sit.aFrame}),
            end: new CNodeConstant({value:Sit.bFrame}),
        })

        SetupTraverseNodes({
            "Two point from RNG": "LOSTwoPoint",
            "Gofast RNG values": "LOSTraverseRNG",
            "Constant Speed": "LOSTraverseConstantSpeed",
            "Constant Altitude": "LOSTraverseConstantAltitude",
            "Constant Vc (closing vel)": "LOSTraverse1",
            "Straight Line": "LOSTraverseStraightLine",
        })

        // NOTE: diplay LOS are wrong if you pick LOSTwoPoint,
        // as it does not actually traverse all the LOS, just start and end

        SetupTrackLOSNodes()

        // So we creata a new LOS set using the selected traverse track as a target
        new CNodeLOSTrackTarget({
            id:"JetLOS2",
            cameraTrack: "jetTrack",
            targetTrack: "LOSTraverseSelect",
        })

        // TODO: Az and El in the display will need updating..

        new CNodeDisplayLOS({
            inputs: {
                LOS: "JetLOS2",
            },
            highlightLines:{
                375:makeMatLine(0xff0000,2), // red start
                1030:makeMatLine(0x00ff00,2), // green end
            },
            color: 0x606060,
        })


        // no clouds in GoFast, but instead of the cloud horizon line we have a ground (sea) track line

         // NodeMan.createNodes({
         //     seaLevel:["Constant",{"value":0}],
         //     groundTrackWidth:["Constant",{"value":3}],
         // })

        NodeMan.createNodesJSON(`[
         {"new":"Constant",      "id":"seaLevel",         "value":0}, 
         {"new":"Constant",      "id":"groundTrackWidth", "value":3}, 
        ]`)

        console.log("+++ LOSGroundTrackNode")
        new CNodeLOSTraverseConstantAltitude({ id: "LOSGroundTrack",
            inputs: {
                LOS: "JetLOS2",
                altitude:"seaLevel",
                radius: "radiusMiles",
            }
        })

        // different comparison nodes in AZ graph
        var azEditorNode = NodeMan.get("azEditor")

        azEditorNode.editorView.addInput("compare",
            new CNodeGraphSeries({
                inputs: {
                    source: "azCSVGoFast",
                },
                name: "AZ CSV ",
                color: "#008000",

            }))

        azEditorNode.editorView.addInput("compare1",
            new CNodeGraphSeries({
                inputs: {source: "azSources"},
                name: "Selected Az",
                color: "#8080F0",
            }),
        )

        azEditorNode.editorView.recalculate()

        // ocean
        const waterTexture = new TextureLoader().load('data/images/28_sea water texture-seamless-dark.jpg?v=1');
        const waterMaterial = new MeshStandardMaterial({
            map: waterTexture,
            transparent: true,
        });

        console.log("+++ oceanDisplay Node")
        new CNodeDisplayOcean({
            id: "oceanDisplay",
            inputs: {
                //     OceanData: OceanDataNode,
                radius: "radiusMiles",
                material: new CNodeConstant({value: waterMaterial})
            },
        })

        console.log("+++ LOSGroundTrackDisplayNode")
        var LOSGroundTrackDisplayNode = new CNodeDisplayTrack({
            inputs: {
                track: "LOSGroundTrack",
                color: new CNodeConstant({value: new Color(1, 0, 1)}),
                //   width: new CNodeConstant({value: 3}),
                width: "groundTrackWidth",
            },
            depthFunc:AlwaysDepth,
        })

/////////////////////////////////////////////////////////////////
// look view is the view from the ATFLIR

        addControllerTo("lookCamera", "TrackToTrack", {
            sourceTrack: "JetLOS",
            targetTrack: "LOSTraverseSelect",
        })

        var ui = new CNodeATFLIRUI({
            id: "ATFLIRUIOverlay",
            jetAltitude: "jetAltitude",
            overlayView: ViewMan.list.lookView.data,
            defaultFontSize: 3.5,
            defaultFontColor: '#E0E0E0',
            defaultFont: 'sans-serif',
            timeStart: 4232,
            timeStartMin: 42,
            timeStartSec: 32,

        });


        // LOS from camera to ground, thin white line
        new CNodeDisplayTrackToTrack({
            id: "DisplayLOStoGround",
            cameraTrack: "JetLOS",
            targetTrack: "LOSGroundTrack",
            color: new CNodeConstant({value: new Color(1, 1, 1)}),
            width: 0.5,

        })

        // LOS from camera to target, thick white line
        new CNodeDisplayTrackToTrack({
            id: "DisplayLOS",
            cameraTrack: "JetLOS",
            targetTrack: "LOSTraverseSelect",
            color: new CNodeConstant({value: new Color(1, 1, 1)}),
            width: 2,

        })

        new CNodeDisplayTargetSphere({
            inputs: {
                track: "LOSTraverseSelect",
                size: new CNodeScale("sizeScaled", scaleF2M,
                    new CNodeGUIValue({value: Sit.targetSize, start: 1, end: 50, step: 0.1, desc: "Target size ft"}, gui)
                )
            },
            
        })

// GRAPHS GRAPHS GRAPHS GRAPHS GRAPHS GRAPHS GRAPHS GRAPHS GRAPHS GRAPHS GRAPHS
        AddGenericNodeGraph("","Turn Rate °/s", [
                [ "red", 1, "turnRate" ],
            ],
            {
                left: 0.28, top: 0.0, width: 0.3 * 9 / 16, height: 0.3,
            },
            // this is the "lines" parameter which does vertical lines at x
            // or bars (x to x2)
            [
                {x: 375, x2:1030, color: "#C0FFC020"}, // coloring in the portion where we have track
            ]
        )

        AddGenericNodeGraph("","El °", [
                [ "red", 1, "el" ],
            ],
            {
                left: 0.45, top: 0.0, width: 0.3 * 9 / 16, height: 0.3,
            },
            [
                {x: 375, x2:1030, color: "#C0FFC020"}, // coloring in the portion where we have track
            ]
        )

        AddGenericNodeGraph("","Bank Angle °", [
                [ "red", 1, "bank" ],
            ],
            {
                left: 0, top: 0.5, width: 0.2 * 9 / 16, height: 0.2,
            },
            // this is the "lines" parameter which does vertical lines at x
            // or bars (x to x2)
            [
                {x: 375, x2:1030, color: "#C0FFC020"}, // coloring in the portion where we have track
            ]
        )


        // add a node that calculates the distance to the target in NM
        new CNodeMunge({
            id: "targetCalculatedDistanceNM",
            inputs: {
                cameraTrack: "jetTrack",
                targetTrack: "LOSTraverseSelect",
            },
            munge: function (f) {
               const cameraPos= this.in.cameraTrack.p(f).clone();
               const targetPos= this.in.targetTrack.p(f).clone();
               const toTarget  = targetPos.clone().sub(cameraPos)
               const d = toTarget.length()
                // const d = this.in.cameraTrack.p(f).clone().sub(this.in.targetTrack.p(f)).length()
                return NMFromMeters(d)
            }
        })

        AddGenericNodeGraph("","RNG NM", [
                [ "red", 1, "GoFastRNG" ],
                [ "black", 1, "targetCalculatedDistanceNM" ],
            ],
            {
                left: 0, top: 0.75, width: 0.2 * 9 / 16, height: 0.2,
            },
            // this is the "lines" parameter which does vertical lines at x
            // or bars (x to x2)
            [
                {x: 375, x2:1030, color: "#C0FFC020"}, // coloring in the portion where we have track
            ]
        )

        AddSpeedGraph("LOSTraverseSelect","Target Speed",0,250,0.62,0,-1,0.3)
        //       AddAltitudeGraph(10000, 45000)

        const gridSquaresGround = 200
        var gridHelperGround = new GridHelperWorld(f2m(0),metersFromNM(gridSquaresGround), gridSquaresGround, metersFromNM(EarthRadiusMiles), 0xffff00, 0xffff00);
        GlobalScene.add(gridHelperGround);

   //     guiTweaks.add(par, 'lockCameraToJet').listen().name("Lock Camera to Jet");

        initJetVariables();
        // initViews relies on some other views setup in the init() fucntion
        // which needs "jetstuff"
        initViews()


    }

}