
sitch = {

    name: "custom",
    menuName: "MISB",


    files: {
        //   misb: "https://sitrec.s3.us-west-2.amazonaws.com/misb2-agua.csv",
        klv: "misb/Truck.klv",
        videoFile: "../sitrec-videos/public/Truck.mp4",
    },
    units: "metric",

    // temporary hard wired, but we want to get these from the data
    startTime: "2012-09-19T20:50:26.970Z",  // start time maybe not from track data, as we might want a portion

    fps: 29.97,

    frames: 4438,  // from video

    startDistance: 1,
    startDistanceMin: 0,
    startDistanceMax: 100,

    terrain: {lat: 41.0957, lon: -104.8702, zoom: 14, nTiles: 8},

    // mainCamera is the camera used for the God's eye view of the 3D world, typically on the left.
    mainCamera: {
        fov: 30, near: 1, far: 60000000,
//        startCameraPositionLLA:[41.066436,-104.905044,4514.047550],
//        startCameraTargetLLA:[41.070221,-104.895292,4124.752328],
    },

    // lookCamera is the camera used for the look view, typically on the right
    // i.e. the view  used to replicate a video
    lookCamera: {fov: 10, far: 8000000},

    // here we get the camera track from a MISB file
    // using SensorLatitude, SensorLongitude, SensorAltitude
    cameraTrack: {file: "klv"},

    // later.... get start time from track
  // startTime: {misbTrack: "cameraTrack", column: "SensorTime", frame: 0},

    // added back the smoothing
    smoothTrackCamera: {kind: "smoothTrack", method:"moving", track: "cameraTrack", window: 20},

    followTrack: {},            // camera follows the camera track

    targetTrack: {
        kind: "TrackFromMISB",
        misb: "cameraTrackData",
        columns: ["FrameCenterLatitude", "FrameCenterLongitude", "FrameCenterElevation"]
    },
    //   smoothTrack: {track: "targetTrack", smooth: 20},
    targetTrackDisplay: {kind: "DisplayTrack", track: "targetTrack", color: [1, 0, 0], width: 4,},

    lookAtTrack: {},  // and look at targetTrack
    fovController:    {source: "cameraTrack"},

    // This is all for the second view, angles
    lookCamera2:  {kind: "lookCamera", fov:10, far:8000000},
    followTrack2: {kind: "followTrack", object: "lookCamera2"},            // camera follows the camera track
    losTrackMISB: {arrayNode: "cameraTrack", smooth:120},
    matrixController: {object: "lookCamera2", source: "losTrackMISB"},
    fovController2:    {kind: "fovController", object: "lookCamera2", source: "cameraTrack"},
    lookView2: {kind:"lookView", camera:"lookCamera2", left: 0.0, top: 0.5, width: -1.7927, height: 0.5, background: '#000030'},



    mainView: {left: 0.0, top: 0, width: 0.5, height: 0.5, background: '#000000'},
    lookView: {left: 0.5, top: 0.5, width: -1.7927, height: 0.5, background: '#000000'},
    videoView: {left: 0.5, top: 0, width: -1.7927, height: 0.5, autoClear:false},

//    videoView2: {kind: "videoView", left: 0.4, top: .25, width: -1.7927, height: 0.5, transparency: 0.5 },
//    videoView2: {kind: "videoView", overlayView: "lookView", transparency: 0.15 },

    //  MirrorVideoView:{id: "mirrorView", mirror: "video", overlayView: "lookView", transparency: 0.15},

    mirrorVideo: { transparency: 0.15, autoClear:false},
    mirrorVideo2: { kind: "mirrorVideo", overlayView:"lookView2", transparency: 0.15, autoClear:false},

    // startTime:  "auto", // auto means we get it from the data file, ie, the first frame of the camera track
    // location:   "auto",
    // frames:     "auto", // auto mean use the length of the video file
    // we'd also want to get the fps from the video file


    altitudeLabel: {kind: "MeasureAltitude", position: "lookCamera"},
    distanceLabel: {kind: "MeasureAB", A: "cameraTrack", B: "targetTrack", defer: true},


//    DisplayCameraFrustum: {targetTrack: "targetTrack"},


//    targetWind:{from:270, knots: 20}, // can we get this from the MISB? It's in a differnt location

    // fromX: {kind:"math", math: "270 - 15"},
    // Wind1: {kind: "Wind", from: "fromX", knots: 20},
    Wind1: {kind: "Wind", from: 270, knots: 20},

    Wind2: {kind: "Wind", from: 90, knots: 20},
    targetWind: {
        kind: "Switch", gui: "main", desc: "Target Wind", inputs: {
            "Wind from West": "Wind1",
            "Wind from East": "Wind2",
        }
    },

    // will need a displayOrigin
    DisplayWindArrow: {source: "targetWind"},


    JetLOS: {kind: "LOSTrackTarget", cameraTrack: "cameraTrack", targetTrack: "targetTrack"},

    // The "Track" traverse node uses the ground track
    LOSTraverseSelectTrack: {
        kind: "traverseNodes",
        idExtra: "Track",
        los: "JetLOS",
        menu: {
            "Constant Speed": "LOSTraverseConstantSpeed",
            "Constant Altitude": "LOSTraverseConstantAltitude",
            "Straight Line": "LOSTraverseStraightLine",
        },
        default: "Constant Altitude"
    },


    // The "Angles" traverse node uses the platform + sensor angles
    LOSTraverseSelectAngles: {
        kind: "traverseNodes",
        idExtra: "Angles",
        los: "losTrackMISB",
        menu: {
            "Constant Speed": "LOSTraverseConstantSpeed",
            "Constant Altitude": "LOSTraverseConstantAltitude",
            "Straight Line": "LOSTraverseStraightLine",
        },
        default: "Constant Altitude"
    },

    // here we are smoothing the generated traversal tracks

    // WHY IS THE GREEN SPHere moving around if the camera should fixed on it????
    smoothTrackTrack: {kind: "smoothTrack", method:"moving", track: "LOSTraverseSelectTrack", window: 100},
    smoothTrackAngles: {kind: "smoothTrack", method:"moving", track: "LOSTraverseSelectAngles", window: 100},

    //    frustum2: {kind: "DisplayCameraFrustum", camera: "lookCamera2", radius: 1000, color: "yellow"},
    frustum1: {kind: "DisplayCameraFrustum", camera: "lookCamera", targetTrack: "LOSTraverseSelectTrack", color: "magenta"},
    frustum2: {kind: "DisplayCameraFrustum", camera: "lookCamera2", targetTrack: "LOSTraverseSelectAngles" , color: "yellow"},

    focusTracks: {
        "Ground (No Track)": "default",
        "Camera track": "cameraTrack",
        "Ground track": "targetTrack",
        "Traverse Track (Track)":  "LOSTraverseSelectTrack",
        "Traverse Track (Angles)":  "LOSTraverseSelectAngles",
    },

    // display the traverse track (Angles)
    traverseDisplayAngles: {
        kind: "DisplayTrack",
        track: "LOSTraverseSelectAngles",
        color: [0,1,0],
        width: 1,
    },

    // display the traverse track 9(Track)
    traverseDisplayTrack: {
        kind: "DisplayTrack",
        track: "LOSTraverseSelectTrack",
        color: [0,0,1],
        width: 1,
    },


    sphereAngles: { kind: "DisplayTargetSphere",
        track: "LOSTraverseSelectAngles",
        size: 5,
        layers: "MAINRENDER",
        color: [0,1,0],
    },

    // sphereTrack: { kind: "DisplayTargetSphere",
    //     track: "LOSTraverseSelectTrack",
    //     size: 5,
    //     layers: "MAINRENDER",
    //     color: [0,0,1],
    // },

    sphereCamera: { kind: "DisplayTargetSphere",
        track: "cameraTrack",
        size: 5,
        layers: "MAINRENDER",
        color: [1,1,0],
    },

    sphereCameraOld: { kind: "DisplayTargetSphere",
        track: "cameraTrack_old",
        size: 5,
        layers: "MAINRENDER",
        color: [1,0,1],
    },

    useGlobe: true,

    dragDropHandler: {}

}