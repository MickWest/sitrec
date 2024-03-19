export const SitChilean = {
    include_kml: true,
    name: "chilean",
    menuName: "Chilean Navy IB 6830",
    isTextable: true,

    planeCameraFOV: 0.75    ,
    targetSize: 1, // in feet

    tilt: 0,

    frames: 17969,
    terrain: {lat: -33.2611, lon: -71.192388, zoom: 9, nTiles: 8},

   // note files are automatically loaded into a data structure
    // that varies based on the extension
    // e.g. a .csv file will be loaded by FileMan.loadCSV
    files: {
        cameraFile: 'chilean/Chile Chopper Track from video GPSTime.kml',
        KMLTarget: "chilean/IB6830 - Incorporating Radar Positions.kml",
//        TargetObjectFile: 'models/A340-600-F18Engine.glb',
        TargetObjectFile: 'models/A340-600.glb',
        DataFile: 'chilean/Chilean Navy Extracted Data 720.csv',
    },
    videoFile: "../sitrec-videos/public/Chilean Navy 13-51-55 from HD 720p.mp4",
    startTime: "2014-11-11T16:51:55Z",

    mainCamera: {
        fov:30,
        startCameraPosition: [-126967.77, 61278.38, 196946.50],
        startCameraTarget: [-126503.73, 61040.85, 196093.13],
    },
    cameraTrack: {},

    skyColor: 'skyblue',

    lookView: {             left: 0.5, top: 0.5, width: -1.77777, height: 0.5,
        effects: {FLIRShader: {},},},

    videoView: {             left: 0.5, top: 0, width: -1.77777, height: 0.5,},
    mainView:{left:0.0, top:0, width:0.625,height:1},

    include_KMLTrackToTrack: true,

    // // Wind is needed to adjust the target planes heading relative to motion in the TailAngleGraph and for the model angle
    targetWind: {from: 270, knots: 0, name: "Target", arrowColor: "cyan"},

    targetObject:{file: "TargetObjectFile", tiltType: "banking", wind: "targetWind",},

    wescamFOV: {file: "DataFile", focalIndex: 2, modeIndex: 1, len: 675, fov: 0.915},

    smoothTrack: {track: "targetTrack"},

    tailAngleGraph: {targetTrack: "targetTrack", cameraTrack: "cameraTrack", wind: "targetWind",
                     left: 0.0, top: 0, width: .15, height: .25,},

    targetDistanceGraph: {targetTrack: "targetTrack", cameraTrack: "cameraTrack",
                          left: 0.0, top: 0.25, width: .15, height: .33,},

    targetSizedSphere: { track: "targetTrack", size: 3, color : 0x000000,},

}