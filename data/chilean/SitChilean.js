export const SitChilean = {
    include_kml: true,
    name: "chilean",
    menuName: "Chilean Navy IB 6830",
    isTextable: true,

    frames: 17969,
    terrain: {lat: -33.2611, lon: -71.192388, zoom: 9, nTiles: 8},

    // note files are automatically loaded into a data structure
    // that varies based on the extension
    // e.g. a .csv file will be loaded by FileMan.loadCSV
    files: {
        cameraFile: 'chilean/Chile Chopper Track from video GPSTime.kml',
        TargetTrack: "chilean/IB6830 - Incorporating Radar Positions.kml",
//        TargetObjectFile: 'models/A340-600-F18Engine.glb',
        TargetObjectFile: 'models/A340-600.glb',
        DataFile: 'chilean/Chilean Navy Extracted Data 720.csv', // 720p version as videos have slight differences
    },
    videoFile: "../sitrec-videos/public/Chilean Navy 13-51-55 from HD 720p.mp4",
    startTime: "2014-11-11T16:51:55Z",

    mainCamera: {
        fov:30,
        startCameraPositionLLA:[-34.781951,-73.204317,80696.379925],
        startCameraTargetLLA:[-34.776516,-73.196683,80342.826209],
    },
    cameraTrack: {},

    // single sold color of the sky.
    skyColor: 'skyblue',

    // The three views are the main view, the look view, and the video view
    // The look view is the view from the camera to the target
    // note it has an effect of FLIRShader to make it look like an IR camera
    lookView: { left:0.5, top:0.5, width: -1.77777, height: 0.5,
        effects: {FLIRShader: {},},},

    // The video view is the view of the original video
    videoView:{ left:0.5, top:0,   width:-1.77777, height: 0.5,},

    // The main view is the view of the 3D scene where the user can move the camera around
    mainView: { left:0.0, top:0,   width:0.625,    height: 1},

    // setup of common tracks, cameras, labels, etc
    include_TrackToTrack: true,

    // // Wind is needed to adjust the target planes heading relative to motion in the TailAngleGraph and for the model angle
    targetWind: {from: 270, knots: 0, name: "Target", arrowColor: "cyan"},

    // the target object is the model of the plane, as specified by the file
    // tiltType of "banking" will cause the model to bank in turns
    // wind is used to adjust the model's orientation (i.e it has to head more into the wind)
    targetObject:{file: "TargetObjectFile", tiltType: "banking", wind: "targetWind",},

    // wesCamFOV replicates the field of view of the camera that took the video
    // This is specific to this case in that there's adjustments for the "mode" (IR or EOW/EON)
    // but the generic calculation takes a reference focal length and the fov at that focal length
    // then calculates vFOV based on that.
    wescamFOV: {file: "DataFile", focalIndex: 2, modeIndex: 1, len: 675, fov: 0.915},

    // Smooth the target track by the default amount
    smoothTrack: {track: "targetTrack"},

    // Adds a graph of the tail angle of the target plane
    // this is relative to the line of sight from the camera to the target
    tailAngleGraph: {targetTrack: "targetTrack", cameraTrack: "cameraTrack", wind: "targetWind",
                     left: 0.0, top: 0, width: .15, height: .25,},

    // Adds a graph of the distance from the camera to the target
    targetDistanceGraph: {targetTrack: "targetTrack", cameraTrack: "cameraTrack",
                          left: 0.0, top: 0.25, width: .15, height: .33,},

    // Adds a sphere of selectable size at the target's position
    targetSizedSphere: { track: "targetTrack", size: 3, color: "#000000",},

}