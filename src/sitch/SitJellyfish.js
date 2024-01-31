import {scaleF2M} from "../utils";
import {NodeMan, Sit} from "../Globals";
import {CNodeGUIValue} from "../nodes/CNodeGUIValue";
import {CNodeDisplayTrackToTrack} from "../nodes/CNodeDisplayTrackToTrack";
import {CNodeDisplayTrack} from "../nodes/CNodeDisplayTrack";
import {CNodeDisplayTargetSphere} from "../nodes/CNodeDisplayTargetSphere";
import {CNodeScale} from "../nodes/CNodeScale";
import {AddAltitudeGraph, AddSpeedGraph} from "../JetGraphs";
import {gui} from "../Globals";
import {SetupGUIFrames} from "../JetGUI";
import {initKeyboard} from "../KeyBoardHandler";
import {addDefaultLights} from "../lighting";
import {CNodeMunge} from "../nodes/CNodeMunge";
import {CNodeLOSTraverseStraightLine} from "../nodes/CNodeLOSTraverseStraightLine";

export const SitJellyfish    = {
    name: "jellyfish",
    menuName: "Jellyfish in Iraq",

    azSlider:false,
    jetStuff:false,
    animated:true,

    simSpeed: 1,
    videoSpeed: 1,

    useFLIRShader: true,

    videoFile: "../sitrec-videos/private/FULL Jellyfish Stab crop LOW BR.mp4",
    fps: 23.976,
    frames: 2982,

    bigUnits:"Miles", // this woudl defauly to NM, but we want to use miles for this situation

    syncVideoZoom: true,

    lookCamera: { fov: 10.6, },
    terrain: {lat:  33.33395, lon: 43.609, zoom:15, nTiles:8},

    // fixed viewpoint
    fromLat: 33.323126,
    fromLon: 43.608689,
    fromAltFeet: 2978,
    fromAltFeetMin: 1000,
    fromAltFeetMax: 4000,

    // the origin
    lat: 33.323126,
    lon: 43.608689,

    targetSpeedMax: 30,   //for the graph

    marks: [
        //       {LL: {lat:50.197944,lon:-5.428180}, width: 1, color:0xffff00},
    ],

    mainCamera: {
        startCameraPositionLLA: [33.273278, 43.647572, 4926.633989],
        startCameraTargetLLA: [33.280159, 43.642938, 4451.060802],
    },
    mainView:{ left:0.0, top:0, width:.50,height:1,background:'#000000'},

    lookView:{ left: 0.5, top: 0.5, width: -1280 / 714, height: 0.5,
        effects: {FLIRShader: {},},
    },
    videoView: {left: 0.5, top: 0, width: -1280 / 714, height: 0.5,},

    // tracks that we can focus on - i.e. the zoom in and out will be relative to the selected track
    focusTracks: {
             "Ground (No Track)": "default",
             "Camera Position": "cameraTrack",
             "Traverse Track": "traverseTrack",
    },

    targetSize:2,

    // instead of a target KML file, we define a simple spline
    // in this case just two points, with linear interpolation
    // (a straight line, at constant speed)
    groundTrack: {
        kind: "targetSpline", // note new way of specifying setup
        type: "linear",
        initialPointsLLA: [
            // NOTE: YOU NEED THE FRAME NUMBERS to match the video
            [0, 33.35468429592996, 43.61248412995273, 81.607023447752],
            [2981, 33.353484155273925, 43.601920332240205, 77.97203777451068],
        ],
    },

    // A "track" that takes its position from a camera node
    // generally the lookCamera
    cameraTrack: {kind:"LOSConstantCamera", camera: "lookCamera"},

    // the green ground track
    groundTrackDisplay: { kind:"DisplayTrack",
        track: "groundTrack",
        color: [0,1,0],
        width: 2,
    },

    // the red line that joins the camera track to the target - i.e. the current LOS.
    motionTrackLOS: { kind: "LOSTrackTarget",
        cameraTrack: "cameraTrack",
        targetTrack: "groundTrack",
    },

    // Lines of sight display
    JetLOSDisplayNode: {kind: "DisplayLOS",
        LOS: "motionTrackLOS",
        spacing: 200,
    },

    // only needed as the speed graph needs it. Fix that in the graph and delete this
    targetWind: {kind: "Wind", from: 270, knots: 0,name: "Target", arrowColor: "cyan", gui: "Tweaks"},

    // the direction of the straight line traversal of the LOS
    initialHeading: {kind: "Heading", heading: 81, name: "Target", arrowColor: "green"},

    // new CNodeScale("startDistance", scaleF2M, new CNodeGUIValue(
    //     {id: "startDistanceFeet", value: 5000, start: 0, end: 12000, step: 1, desc: "Tgt Start Dist (Ft)"}, gui))

    startDistanceFeet: {value: 5000, start: 0, end: 12000, step: 1, desc: "Tgt Start Dist (Ft)"},

    setup2: function() {

        SetupGUIFrames()
        initKeyboard()

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


        new CNodeLOSTraverseStraightLine({
            id: "traverseTrack",
            inputs: {
                LOS: "motionTrackLOS",
                startDist: "startDistance",
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
            layers: "HELPERS",
        })

        new CNodeDisplayTrack({
            track: "traverseTrack",
            color: [0, 1, 1],
            width: 1,
        })


        // the red line that joins the camera track to the target - i.e. the current LOS.
        new CNodeDisplayTrackToTrack({
            id: "DisplayLOS",
            cameraTrack: "motionTrackLOS",
            targetTrack: "traverseTrack",
            color: [1, 0, 0],
            width: 2,
        })

        addDefaultLights(Sit.brightness)

    }

}
