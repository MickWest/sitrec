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

    // temporary hard wired time and terrain for testing MISB truck track
    startTime: "2012-09-19T20:50:26.970Z",
    terrain: {lat: 41.0957, lon: -104.8702, zoom: 14, nTiles: 8},

    // default to 30 seconds. Loading a video will change this (also need manual, eventually)
    frames: 900,
    fps: 30,

    lat: 40, lon: -100,

    targetSize: 100,

    lookCamera: {fov: 10, near: 1, far: 8000000},
    mainCamera: {fov: 30, near: 1, far: 60000000,
        startCameraPositionLLA:[28.908829,-113.996881,24072381.100864],
        startCameraTargetLLA:[28.908812,-113.996897,24071381.163374],
    },

    videoView: {left: 0.5, top: 0, width: -1.7927, height: 0.5, autoClear:false},
    mainView: {left: 0.0, top: 0, width: 0.5, height: 1, background: '#200000'},
    lookView: {left: 0.5, top: 0.5, width: -1.7927, height: 0.5, background: '#000020'},

    dragDropHandler: true,
    useGlobe: true,


    cameraTrackSwitch: {kind: "Switch",
        inputs: {
           "fixedCamera": {kind:"PositionLLA", LLA: [34.399060162,-115.858257450, 1380]},
        },
        desc: "Camera Track"
    },

    targetTrackSwitch: {
        kind: "Switch",
        inputs: {
            "fixedTarget": {kind:"PositionLLA", LLA: [34.5,-115.858257450, 0]},
        },
        desc: "Target Track"
    },

    fovSwitch: {
        kind: "Switch",
        inputs: {
            "userFOV": {kind: "GUIValue", value:30, start:0.1,  end: 170,  step: 0.001,  desc:"vFOV"},
        },
        desc: "Camera FOV"
    },


    fovController: {
        kind: "fovController",
        object: "lookCamera",
        source: "fovSwitch",
    },

    // These are the types of controller for the camera
    // which will reference the cameraTrackSwitch for source data
    CameraPositionController: {
        kind: "Switch",
        inputs: {
            "Follow Track": {kind: "TrackPosition", sourceTrack: "cameraTrackSwitch"},
        },
        desc: "Camera Position",
    },

    // The LOS controller will reference the cameraTrackSwitch and targetTrackSwitch
    // for source data
    // can be track-to-track, fixed angles, Az/El/Roll track, etc.
    CameraLOSController: {kind: "Switch",
        inputs: {
            "To Target": {kind: "TrackToTrack", sourceTrack: "cameraTrackSwitch", targetTrack: "targetTrackSwitch",},
        },
        desc: "Camera Angles/LOS"
    },

    // Since we are controlling the camera with the LOS controller, we can extract the LOS
    // for other uses, such as a target track generated for LOS traversal

    JetLos: {kind: "LOSFromCamera", cameraNode: "lookCamera"},


    displayLOS: {kind: "DisplayLOS", LOS: "JetLos", color: "red", width: 1.0},


    focusTracks:{},

    // for each type of files that is dropped (e.g. KLV, CSV, video)
    // specify what switch nodes will be updated with this new option
    // and what kind of data will be extracted from the file
    // TODO: add support for focus tracks, which are currently using
    // a direct GUI, and should be a CNodeSwitch
    dropTargets: {
        "track": ["cameraTrackSwitch", "targetTrackSwitch"],
        "fov": ["fovSwitch"],
    },



    DisplayCameraFrustum: {radius: 500000, lineWeight: 1.0, color: "white"},

}