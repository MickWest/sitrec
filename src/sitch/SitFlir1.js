import {DirectionalLight, HemisphereLight} from "../../three.js/build/three.module";
import {ExpandKeyframes, getArrayValueFromFrame,  scaleF2M, tan} from "../utils";
import {Sit, guiJetTweaks, NodeMan, guiTweaks} from "../Globals";
import {CNodeCurveEditor} from "../nodes/CNodeCurveEdit";
import {CNodeArray} from "../nodes/CNodeArray";
import {CNodeGUIValue, makeCNodeGUIFlag, makeCNodeGUIValue} from "../nodes/CNodeGUIValue";
import {CNodeInterpolate} from "../nodes/CNodeInterpolate";
import {CNodeSwitch} from "../nodes/CNodeSwitch";
import {CNodeGraphSeries} from "../nodes/CNodeGraphSeries";
import {CNodeTurnRateBS} from "../nodes/CNodeTurnRateBS";
import {CNodeWatch} from "../nodes/CNodeWatch";
import {par} from "../par";
import {CNodeJetTrack} from "../nodes/CNodeJetTrack";
import {CNodeLOSTrackAzEl} from "../nodes/CNodeLOSTrackAzEl";
import * as LAYER from "../LayerMasks";
import {CNodeWind} from "../nodes/CNodeWind";
import {CNodeHeading} from "../nodes/CNodeHeading";
import {gui} from "../Globals";
import {GlobalScene} from "../LocalFrame";
import {
    curveChanged,
    initJetVariables,
    initViews,
    SetupCommon,
    SetupTrackLOSNodes,
    SetupTraverseNodes
} from "../JetStuff";
import {CNodeDisplayTargetModel} from "../nodes/CNodeDisplayTargetModel";
import {CNodeScale} from "../nodes/CNodeScale";
import {CNodeDisplayTargetSphere} from "../nodes/CNodeDisplayTargetSphere";
import {AddAltitudeGraph, AddSpeedGraph, AddTailAngleGraph, AddTargetDistanceGraph} from "../JetGraphs";
import {CNodeATFLIRUI} from "../nodes/CNodeATFLIRUI";
import {ViewMan} from "../nodes/CNodeView";
import {CNodeDisplayLOS} from "../nodes/CNodeDisplayLOS";
import {V3} from "../threeExt";
import {LLAToEUS} from "../LLA-ECEF-ENU";
import {FileManager} from "../CFileManager";
import {CNodeMunge} from "../nodes/CNodeMunge";

export const SitFlir1 = {
    name:"flir1",
    menuName: "FLIR1/Nimitz/Tic-Tac",

    jetStuff: false,

    fps: 29.97,
    frames: 2289,
    aFrame: 0,
    bFrame: 2288,
    startDistance:15,

    mainCamera: {
        startCameraPosition: [-126342.63, 56439.02, 101932.66],
        startCameraTarget: [-126346.69, 56137.48, 100979.21],
    },
    LOSSpacing:120,


    terrain: {lat:   31.605, lon:-117.870, zoom:7, nTiles:6},

    jetLat: 31.205,
    jetLon:-117.870,

    files: {
        Flir1Az: 'flir1/FLIR1 AZ.csv',
        Flir1El: 'flir1/FLIR1 EL.csv',
        DataFile: 'flir1/Flir1 FOV Data.csv',
        TargetObjectFile: './models/FA-18F.glb',
    },
    videoFile: "../sitrec-videos/public/f4-aspect-corrected-242x242-was-242x216.mp4",


    lookCamera: {},


    mainView: {left: 0, top: 0, width: 1, height: 1, background: [0.05, 0.05, 0.05]},
    lookView: {left: 0.653, top: 1 - 0.3333, width: -1., height: 0.3333,},

    videoView: {left: 0.8250, top: 0.6666, width: -1, height: 0.3333,},

    focusTracks:{
        "Ground (no track)": "default",
        "Jet track": "jetTrack",
        "Traverse Path (UFO)": "LOSTraverseSelect"
    },

    setup: function () {

        SetupCommon(20000)


// Optionally we set the Jet origin to a particular Lat/Lon
// this only makes sense if we have a terrain loaded
// Example usage is in SitFlir1.js
        // TODO - make common for other sitches
        if (Sit.jetLat !== undefined) {

            const jetAltitude = NodeMan.get("jetAltitude").v();
            console.log("Initial jet alitide from jetAltitude node = "+jetAltitude)

            var enu = LLAToEUS(Sit.jetLat, Sit.jetLon, jetAltitude)
            Sit.jetOrigin = V3(enu.x, enu.y, enu.z)
            console.log (" enu.y="+enu.y)

        }

        Sit.flir1Data = FileManager.get("DataFile")

        this.Flir1Az = ExpandKeyframes(FileManager.get('Flir1Az'), Sit.frames)

        //eldata not used, as we do a more manual interpolation
        this.Flir1El = ExpandKeyframes(FileManager.get('Flir1El'), Sit.frames)

        // Stuff from SetupFLIR1

        console.log("+++ azEditorNode")
        var azEditorNode = new CNodeCurveEditor({ id:"azEditor",  // GOFast
                visible: false,
                left:0, top:0.0, width:-1,height:0.5,
                draggable:true, resizable:true, shiftDrag: true, freeAspect: true,
                editorConfig: {
                    useRegression:true,
                    minX: 0, maxX: Sit.frames, minY: -10, maxY: 10,
                    xLabel: "Frame", xStep: 1, yLabel: "Azimuth", yStep: 5,
                    points:[0,4.325,300,4.325,1009.858,1.348,1009.858,0.227,1776.31,-4.17,1776.31,-5.291,2288,-8.675,2189,-8.675],
                },
                frames: Sit.frames,
            }
        )

        this.azData = new CNodeArray({array: this.Flir1Az})

// FLIR1
        new CNodeGUIValue({id: "jetTAS", value: 333, start: 320, end: 360, step: 0.1, desc: "TAS"}, gui)

        makeCNodeGUIValue("elStart", 5.7, 4.5,   6.5,   0.001,  "el Start", gui)
        makeCNodeGUIValue("elEnd", 5, 4.5, 6.5,   0.001,  "el end", gui)

//        gui.add(par, 'negateEl').listen().name("Negate Elevation");
        makeCNodeGUIFlag("elNegate", false, "Negate Elevation", gui);

        new CNodeInterpolate({id:"elNormal", start:"elStart", end:"elEnd", frames:Sit.frames})
        new CNodeMunge({id:"el", inputs:{elNormal:"elNormal", elNegate:"elNegate"}, munge: function (f) {
                if (this.in.elNegate.v(f)) {
                    return this.in.elNormal.v(f) * -1
                } else {
                    return this.in.elNormal.v(f)
                }
            }})


        // FLIR1
        new CNodeSwitch({id:"azSources",
            inputs: {
                'Az Editor': "azEditor",
                'Az FLIR Video': this.azData,
                'Linear': new CNodeInterpolate({
                    start: 5, startFrame: 0,
                    end: -8, endFrame: Sit.frames-1,
                    frames: Sit.frames,
                })
            },
            desc: "Azimuth Type"

        }, gui)

   //     var azEditorNode = NodeMan.get("azEditor")
        // FLIR1
        azEditorNode.editorView.addInput("compare",
            new CNodeGraphSeries({
                source: this.azData,
                color: "#008000",

            })
        )


        azEditorNode.editorView.addInput("compare1",
            new CNodeGraphSeries({
                source: "el",
                color: "#FFFF00",
            })
        )


        azEditorNode.editorView.recalculate()



// FLIR1
        new CNodeSwitch({id:"bank",
                inputs: {
                    "User Bank Angle": new CNodeGUIValue({
                        value: 0, desc: "User Bank Angle", start: -5, end: 5, step: 0.1
                    }, gui),
                },
                desc: "Bank Angle Type"
            },
            gui)


// FLIR1
        new CNodeTurnRateBS({id:"turnRateBS",
            inputs: {
                speed: new CNodeWatch({ob: par, id: "TAS"}),
                bank: "bank"
            }
        })


// FLIR1
        new CNodeSwitch({id:"turnRate",
            inputs: {
                //        "Curve Editor": turnRateEditorNode,
                "User Constant": new CNodeGUIValue({
                    value: 0, desc: "User Turn Rate", start: -3, end: 3, step: 0.001
                }, gui),
                "From Bank and Speed": "turnRateBS",
            },
            desc: "Turn Rate Type"
        }, gui)

// FLIR1

        new CNodeWind({
            id: "targetWind",
            from: 0 ,
            knots: 100,
            name: "Target",
            arrowColor: "cyan"

        }, gui)

        new CNodeWind({
            id: "localWind",
            from: 0 ,
            knots: 70,
            name: "Local",
            arrowColor: "cyan"

        }, gui)



        new CNodeHeading({
            id: "initialHeading",
            heading: 227,
            name: "Initial",
            arrowColor: "green"

        }, gui)

        new CNodeJetTrack({id:"jetTrack",
            inputs: {
                speed: "jetTAS",         // new CNodeWatch({ob:par,id:"TAS"}),
                altitude: "jetAltitude",
                turnRate: "turnRate",
                radius: "radiusMiles",
                wind: "localWind",
                heading: "initialHeading",
            },
            frames:Sit.frames,
        })

// FLIR1
        //JetLOSNode =
        new CNodeLOSTrackAzEl({id:"JetLOS",
            inputs: {
                jetTrack: "jetTrack",
                az: "azSources",
                el: "el",
            }
        })


        SetupTraverseNodes({
            "Constant Air Speed": "LOSTraverseConstantAirSpeed",
            "Constant Ground Speed": "LOSTraverseConstantSpeed",
            "Constant Altitude": "LOSTraverseConstantAltitude",
            "Constant Vc (closing vel)": "LOSTraverse1",
            "Straight Line": "LOSTraverseStraightLine",
            "Fixed Line": "LOSTraverseStraightLineFixed",
                           })

        SetupTrackLOSNodes()

        NodeMan.get("lookCamera").addController("TrackToTrack", {
            sourceTrack: "JetLOS",
            targetTrack: "LOSTraverseSelect",
        })

        NodeMan.get("lookView").renderFunction = function(frame) {

            // bit of a patch to get in the FOV
            if (Sit.flir1Data !== undefined) {
                // frame, mode, Focal Leng
                var focalMode = getArrayValueFromFrame(Sit.flir1Data,0,2,frame)
                var mode = getArrayValueFromFrame(Sit.flir1Data,0,1,frame)
                var zoom = getArrayValueFromFrame(Sit.flir1Data,0,3,frame)

                var vFOV = 0.7;
                if (focalMode === "MFOV") vFOV = 3;
                if (focalMode === "WFOV") vFOV = 6
                if (zoom === "2") vFOV /= 2

                this.camera.fov = vFOV;
                this.camera.updateProjectionMatrix()
            }
            this.renderer.render(GlobalScene, this.camera);
        }

        var ui = new CNodeATFLIRUI({
            id: "ATFLIRUIOverlay",
            jetAltitude: "jetAltitude",

            overlayView: ViewMan.list.lookView.data,
            defaultFontSize: 3.5,
            defaultFontColor: '#E0E0E0',
            defaultFont: 'sans-serif',
            timeStartMin: 41,
            timeStartSec: 35,
            altitude: 20000,
        });

        new CNodeDisplayTargetModel({
            track: "LOSTraverseSelect",
            TargetObjectFile: "TargetObjectFile",
            wind:"targetWind",
        })

          new CNodeDisplayTargetSphere({
             inputs: {
                 track: "LOSTraverseSelect",
                 size: new CNodeScale("sizeScaled", scaleF2M,
                     new CNodeGUIValue({
                         value: Sit.targetSize,
                         start: 0,
                         end: 500,
                         step: 0.1,
                         desc: "Target size ft"
                     }, gui)
                 )
             },

             layers: LAYER.MASK_LOOK,
         })

        AddTailAngleGraph(
            { // mungeInputs
                targetTrack: "LOSTraverseSelect",
                cameraTrack: "jetTrack",
                wind: "targetWind",
            },
            { // windowParams
                left: 0.0, top: 0, width: .3, height: .25,
                visible: true, draggable: true, resizable: true, shiftDrag: false, freeAspect: true,
            },
            { // editor Params
                    maxY: 90
            },
        );

        AddTargetDistanceGraph(
            {
                targetTrack: "LOSTraverseSelect",
                cameraTrack: "jetTrack",
            },
            {
                left: 0.0, top: 0.25, width: .3, height: .33,
            },
            {
                    maxY: 30,
            }

        );

        new CNodeDisplayLOS({
            inputs: {
                LOS: "JetLOS",
            },
            clipSeaLevel: false,
            //     highlightLines:{369:makeMatLine(0xff0000,2)}, // GoFast first frame with RNG

            color: 0x606060,


        })

        AddAltitudeGraph(20000,35000)
        AddSpeedGraph("LOSTraverseSelect","Target Speed",0,500,0.60,0,-1,0.25)

        // Lighting
        var light = new DirectionalLight(0xffffff, 0.8);
        light.position.set(100,300,100);
        light.layers.enable(LAYER.LOOK)
        light.layers.enable(LAYER.MAIN)
        GlobalScene.add(light);

        const hemiLight = new HemisphereLight(
            'white', // bright sky color
            'darkslategrey', // dim ground color
            0.3, // intensity
        );
        hemiLight.layers.enable(LAYER.LOOK)
        hemiLight.layers.enable(LAYER.MAIN)
        GlobalScene.add(hemiLight);

        initJetVariables();

        // initViews relies on some other views setup in the init() fucntion
        // which needs "jetstuff"
        initViews()

        guiTweaks.add(par, 'lockCameraToJet').listen().name("Lock Camera to Jet");


        guiTweaks.add(par, 'jetPitch', -8, 8, 0.01).onChange(function () {
            curveChanged();
           // calculateGlareStartAngle();
            par.renderOne = true;
        }).listen().name('Jet Pitch')

        guiJetTweaks.hide();

        ///////////////////////
    }
}