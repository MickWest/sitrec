import {Color} from "../../three.js/build/three.module";
import {scaleF2M} from "../utils";
import {NodeMan, Sit} from "../Globals";
import {CNodeView3D} from "../nodes/CNodeView3D";
import * as LAYER from "../LayerMasks";
import * as THREE from "../../three.js/build/three.module";
import {CNodeConstant} from "../nodes/CNode";
import {CNodeGUIValue} from "../nodes/CNodeGUIValue";
import {CNodeDisplayTrackToTrack} from "../nodes/CNodeDisplayTrackToTrack";
import {CNodeDisplayTrack} from "../nodes/CNodeDisplayTrack";
import {CNodeDisplayTargetSphere} from "../nodes/CNodeDisplayTargetSphere";
import {CNodeLOSConstantCamera} from "../nodes/CNodeLOSConstantCamera";
import {CNodeScale} from "../nodes/CNodeScale";
import {CNodeWind} from "../nodes/CNodeWind";
import {CNodeHeading} from "../nodes/CNodeHeading";
import {AddAltitudeGraph, AddSpeedGraph} from "../JetGraphs";
import {gui} from "../Globals";
import {SetupGUIFrames} from "../JetGUI";
import {initKeyboard} from "../KeyBoardHandler";
import {CNodeDisplayLOS} from "../nodes/CNodeDisplayLOS";
import {addDefaultLights} from "../lighting";
import {CNodeVideoWebCodecView} from "../nodes/CNodeVideoWebCodecView";
import {CNodeSplineEditor} from "../nodes/CNodeSplineEdit";
import {GlobalScene} from "../LocalFrame";
import {CNodeMunge} from "../nodes/CNodeMunge";
import {CNodeLOSTrackTarget} from "../nodes/CNodeLOSTrackTarget";
import {CNodeLOSTraverseStraightLine} from "../nodes/CNodeLOSTraverseStraightLine";
export const SitJellyfish    = {
    name: "jellyfish",
    menuName: "Jellyfish in Iraq",

    azSlider:false,
    jetStuff:false,
    animated:true,

    simSpeed: 1,
    videoSpeed: 1,

    files: {
  //      hayleCSV: "hayle/hayle-track.csv",
    },
    videoFile: "../sitrec-videos/private/FULL Jellyfish Stab crop LOW BR.mp4",

    bigUnits:"Miles",

    syncVideoZoom: true,


    fps: 23.976,
    frames: 2982,

    lookCamera: {
        fov: 10.6,
    },
    // Pt Dume view
    terrain: {lat:  33.33395, lon: 43.609, zoom:15, nTiles:8},

    // fixed viewpoint
    fromLat: 33.323126,
    fromLon:43.608689,

    // the origin
    lat: 33.323126,
    lon: 43.608689,

    fromAltFeet: 2978,
    fromAltFeetMin: 1000,
    fromAltFeetMax: 4000,

    targetSpeedMax: 30,   //for the graph

    marks: [
        //       {LL: {lat:50.197944,lon:-5.428180}, width: 1, color:0xffff00},
    ],

    mainCamera: {
        startCameraPositionLLA: [33.273278, 43.647572, 4926.633989],
        startCameraTargetLLA: [33.280159, 43.642938, 4451.060802],
    },
    mainView:{left:0.0, top:0, width:.50,height:1},
    focusTracks: {
             "Ground (No Track)": "default",
             "Camera Position": "cameraTrack",
             "Traverse Track": "traverseTrack",
    },

    targetSize:2,


    // instead of a target KML file, we define a simple spline
    // in this case just two points, linear interpolation (a line)
    targetSpline: {
        type: "linear",
        initialPointsLLA: [
            // NOTE: YOU NEED THE FRAME NUMBERS to match the video
            [0, 33.35468429592996, 43.61248412995273, 81.607023447752],
            [2981, 33.353484155273925, 43.601920332240205, 77.97203777451068],
        ],
    },

    LOSSpacing: 200,


    setup2: function() {

        SetupGUIFrames()
        initKeyboard()

        new CNodeLOSConstantCamera({id:"cameraTrack", camera:"lookCamera"})

        // // These want to be replace with the ground track
        // new CNodeLOSMotionTrack({
        //     id:"motionTrackLOS",
        //     cameraTrack:"cameraTrack",
        //     csv:"hayleCSV",
        //     width:1280,
        //     height:714,
        //     fov:45,
        //     frameCol:0,
        //     xCol:1,
        //     yCol:2,
        //     frames:2780,  //DUPLICATED???
        //     smooth:30,
        // })

        new CNodeVideoWebCodecView({
                id: "video",
                inputs: {
                    zoom: new CNodeGUIValue({
                        value: 100, start: 100, end: 1000, step: 1,
                        desc: "Video Zoom x"
                    }, gui)
                },
                visible: true,
                left: 0.5, top: 0, width: -1280 / 714, height: 0.5,
                draggable: true, resizable: true, shiftDrag: false,
                frames: Sit.frames,
                file: Sit.videoFile,
            }
        )

        const view = NodeMan.get("mainView");
        view.addOrbitControls(this.renderer);

        const viewLook = new CNodeView3D({
            id: "lookView",
            draggable:false,resizable:false,
            left: 0.5, top: 0.5, width: -1280 / 714, height: 0.5,
            fov: 50,
            camera: this.lookCamera,
            doubleClickFullScreen: true,
            background: new Color("#989fa7"),
        })
        //     viewLook.camera = this.lookCamera;
        viewLook.addOrbitControls(this.renderer);


        new CNodeSplineEditor({
            id: "groundTrack",
//            type:"linear",   // linear or catmull
            type: this.targetSpline.type,   // chordal give smoother velocities
            scene: GlobalScene,
            camera: "mainCamera",
            renderer: view.renderer,
            controls: view.controls,
            frames: this.frames,
            terrainClamp: "TerrainModel",

            initialPoints: this.targetSpline.initialPoints,
            initialPointsLLA: this.targetSpline.initialPointsLLA,
        })

        new CNodeDisplayTrack({
            track: "groundTrack",
            color: new CNodeConstant({value: new THREE.Color(0, 1, 0)}),
            width: 2,
        //    autoSphere: 5,

            layers: LAYER.MASK_HELPERS,
        })


         new CNodeLOSTrackTarget({
             id: "motionTrackLOS",
             cameraTrack: "cameraTrack",
             targetTrack: "groundTrack",
         })

        NodeMan.get("lookCamera").addController("LookAtTrack", {
            id:"lookAtGroundTrack",
             //sourceTrack: "motionTrackLOS",
             targetTrack: "groundTrack",
        }).addController("FocalLength", {
            focalLength: new CNodeMunge({
                munge:function(f) {
                    // TOTO - abstract this out to a function that takes an array of frames/focal lengths
                    if (f> 745) return {focal_len: 1000}
                    else return {focal_len: 3000};
                },
                frames: this.frames,

            }),
            referenceFOV: 0.6,
            referenceFocalLength: 1000,

        });


// // need a constant position track, and then a CNodeLOSTrackTarget to the ground track
//         // bit of a patch, jsut returing the lookCamera position, when really the lookCamera should come from this!!
//         new CNodeConstant({
//             id: "cameraTrack",
//             value: new CNodeMunge({
//                 inputs: {
//                     camera: "CameraLLA",
//                 },
//                 munge: function (f) {
//                     return {position: this.in.camera.camera.position.clone()}
//                 }
//             })
//         })



         var JetLOSDisplayNode = new CNodeDisplayLOS({
             LOS: "motionTrackLOS",

            clipSeaLevel: true,
            layers: LAYER.MASK_HELPERS,

            width: 3,
        })

//    var nodeStartDistance =  new CNodeScale("startDistance", Sit.big2M,new CNodeGUIValue({value: 0.001, start:0, end:1, step: 0.0001,desc: "Tgt Start Dist "+Sit.bigUnits}, gui))
//    var nodeStartDistance =  new CNodeGUIValue({id:"startDistance", value: 100, start:0, end:1000, step: 0.0001,desc: "Tgt Start Dist "+Sit.bigUnits}, gui)

        var nodeStartDistance = new CNodeScale("startDistance", scaleF2M, new CNodeGUIValue(
            {id: "startDistanceFeet", value: 5000, start: 0, end: 12000, step: 1, desc: "Tgt Start Dist (Ft)"}, gui))

        //
        // new CNodeLOSTraverse({
        //     id: "traverseTrack",
        //     inputs: {
        //         LOS: "motionTrackLOS",
        //         startDist: nodeStartDistance,
        //         //radius: "radiusMiles",
        //     },
        // })



        new CNodeWind({
            id: "targetWind",
            from: 270,
            knots: 0,
            name: "Target",
            arrowColor: "cyan"

        }, gui)

        // zero wind for traversing
        // NOTE, this is not used, and needs setting up so that there's
        // a zero velocity for the balloon, and this wind variable
        // is used to solve the path based on LOS.
        new CNodeWind({id: "localWind", from: 70, knots: 0, name: "Local", arrowColor: "cyan"}, gui)

        new CNodeHeading({
            id: "initialHeading",
            heading: 81,
            name: "Initial",
            arrowColor: "green"

        }, gui)



        new CNodeLOSTraverseStraightLine({
            id: "traverseTrack",
            inputs: {
                LOS: "motionTrackLOS",
                startDist: nodeStartDistance,
                lineHeading: "initialHeading",
            },
        })


        AddSpeedGraph("traverseTrack", "Target Speed", 0, Sit.targetSpeedMax, 0, 0, 0.20, 0.25)
        AddAltitudeGraph(0, 3000, "traverseTrack", 0.25, 0, 0.20, 0.25,500)



        new CNodeDisplayTargetSphere({
            id: "sphereInMainView",
            inputs: {
                track: "traverseTrack",
                size: new CNodeScale("sizeScaled", scaleF2M,
                    new CNodeGUIValue({value: Sit.targetSize, start: 1, end: 50, step: 0.1, desc: "Target size ft"}, gui)
                )
            },

        })


        new CNodeDisplayTargetSphere({
            id: "sphereInLookView",
            track: "traverseTrack",
            size: 10,

            layers: LAYER.MASK_HELPERS,
        })

        new CNodeDisplayTrack({
            track: "traverseTrack",
            color: new CNodeConstant({value: new THREE.Color(0, 1, 1)}),
            width: 1,

            layers: LAYER.MASK_HELPERS,
        })


        // the red line that joins the camera track to the target - i.e. the current LOS.
        new CNodeDisplayTrackToTrack({
            id: "DisplayLOS",
            cameraTrack: "motionTrackLOS",
            targetTrack: "traverseTrack",
            color: new CNodeConstant({value: new THREE.Color(1, 0, 0)}),
            width: 2,

        })

        addDefaultLights(Sit.brightness)

    }

}
