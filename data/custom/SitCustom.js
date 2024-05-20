// SitCustom.js is a sitch that lets the user drop in
// a track file and a video file, and then displays the track
// the initial location and time are extracted from the track file
// a track file can be any of the following:
// - a CSV file with columns for time, lat, lon, alt, heading
// - a KLV file with the same columns
// existing sitches that resemble this are:
// - SitFolsom.js (DJI drone track)
// - SitPorterville.js (DJI Drone track)
// - SitMISB.js (MISB track)
// - SitJellyfish (simple user spline track) (MAYBE)


sitch = {
    name: "custom",
    menuName: "Custom (Drag and Drop)",
    isCustom: true,


    startDistance: 1,
    startDistanceMin: 0.01,
    startDistanceMax: 25,  // this might need to be adjusted based on the terrain per sitch

    startTime: "2012-09-19T20:50:26.970Z",
    // default terrain covers North America
    TerrainModel: {kind: "Terrain", lat: 41.0957, lon: -104.8702, zoom: 4, nTiles: 6},
    terrainUI: {kind: "TerrainUI", terrain: "TerrainModel"},

    // default to 30 seconds. Loading a video will change this (also need manual, eventually)
    frames: 900,
    fps: 30,

    // if we are loading a video, then we want to extract frames from it
    framesFromVideo: true,

    lat: 40, lon: -100,

    targetSize: 100,

    lookCamera: {fov: 10, near: 1, far: 8000000},
    mainCamera: {fov: 30, near: 1, far: 60000000,
        // startCameraPositionLLA:[28.908829,-113.996881,24072381.100864],
        // startCameraTargetLLA:[28.908812,-113.996897,24071381.163374],

        // close to truck terrain for testing
         startCameraPositionLLA:[40.767657,-105.215694,15862.255512],
         startCameraTargetLLA:[40.774329,-105.208906,15520.851507],
    },

    videoView: {left: 0.5, top: 0, width: -1.7927, height: 0.5, autoClear:false},
    mainView: {left: 0.0, top: 0, width: 0.5, height: 1, background: '#200000'},
    lookView: {left: 0.5, top: 0.5, width: -1.7927, height: 0.5, background: '#000020'},

    dragDropHandler: true,
    useGlobe: true,


    fixedCameraPosition: {kind: "PositionLLA", LLA: [40.767657,-105.215694,15862.255512]},

    cameraTrackSwitch: {kind: "Switch",
        inputs: {
           "fixedCamera": "fixedCameraPosition",
        },
        desc: "Camera Track"
    },

    fixedTargetPosition: {kind: "PositionLLA", LLA: [34.5,-115.858257450, 0]},

    targetTrackSwitch: {
        kind: "Switch",
        inputs: {
            "fixedTarget": "fixedTargetPosition",
        },
        desc: "Target Track"
    },

    ptzAngles: {kind: "PTZUI", az: 0, el: 0, roll: 0, showGUI: true},

    // angels controllers
    angelsSwitch: {
        kind: "Switch",
        inputs: {
            "Manual PTZ": "ptzAngles",
            // when we add tracks, if they have angles, then we'll add a losTrackMISB node and
            // then a matrixController
        },
        desc: "Angles Source"
    },

    fovUI: {kind: "GUIValue", value: 30, start: 0.1, end: 170, step: 0.001, desc: "vFOV"},

    fovSwitch: {
        kind: "Switch",
        inputs: {
            "userFOV": "fovUI",
        },
        desc: "Camera FOV"
    },


    fovController: {
        kind: "fovController",
        object: "lookCamera",
        source: "fovSwitch",
    },

    trackPositionController: {kind: "TrackPosition", sourceTrack: "cameraTrackSwitch"},

    // These are the types of controller for the camera
    // which will reference the cameraTrackSwitch for source data
    CameraPositionController: {
        kind: "Switch",
        inputs: {
            "Follow Track": "trackPositionController",
        },
        desc: "Camera Position",
    },


    trackToTrackController: {kind: "TrackToTrack", sourceTrack: "cameraTrackSwitch", targetTrack: "targetTrackSwitch",},

    // The LOS controller will reference the cameraTrackSwitch and targetTrackSwitch
    // for source data
    // can be track-to-track, fixed angles, Az/El/Roll track, etc.
    CameraLOSController: {kind: "Switch",
        inputs: {
            "To Target": "trackToTrackController",
            "Use Angles": "angelsSwitch",
        },
        desc: "Camera Heading"
    },

    // Since we are controlling the camera with the LOS controller, we can extract the LOS
    // for other uses, such as a target track generated for LOS traversal

    JetLOS: {kind: "LOSFromCamera", cameraNode: "lookCamera"},

    // Wind is needed to adjust the target planes heading relative to motion in the TailAngleGraph and for the model angle
    targetWind: {from: 270, knots: 0, name: "Target", arrowColor: "cyan"},

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
        default: "Constant Altitude",
        exportable: true,
    },

    // display the traverse track (Track)
    traverseDisplayTrack: {
        kind: "DisplayTrack",
        track: "LOSTraverseSelectTrack",
        color: [0,0,1],
        width: 1,
    },

    sphereTraverse: { kind: "DisplayTargetSphere",
        track: "LOSTraverseSelectTrack",
        size: 5,
        layers: "MAINRENDER",
        color: [0,0,1],
    },

    displayLOS: {kind: "DisplayLOS", LOS: "JetLOS", color: "red", width: 1.0},


    focusTracks:{},

    // for each type of files that is dropped (e.g. KLV, CSV, video)
    // specify what switch nodes will be updated with this new option
    // and what kind of data will be extracted from the file
    // TODO: add support for focus tracks, which are currently using
    // a direct GUI, and should be a CNodeSwitch
    dropTargets: {
        "track": ["cameraTrackSwitch", "targetTrackSwitch", "zoomToTrack"],
//        "track": ["cameraTrackSwitch", "targetTrackSwitch"],
        "fov": ["fovSwitch"],
        "angles": ["angelsSwitch"],
    },


// Standard useful things, eventually have them more configurable

    mirrorVideo: { transparency: 0.15, autoClear:false},
    DisplayCameraFrustum: {radius: 500000, lineWeight: 1.0, color: "white"},

    altitudeLabel: {kind: "MeasureAltitude", position: "lookCamera"},
    altitudeLabel2: {kind: "MeasureAltitude", position: "LOSTraverseSelectTrack"},
    distanceLabel: {kind: "MeasureAB", A: "cameraTrackSwitch", B: "targetTrackSwitch", defer: true},


}