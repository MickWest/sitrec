sitch = {

    name: "misb",
    menuName: "MISB",
    files: {
        misb: "misb/misb2-agua.csv"
    },

    videoFile: "../sitrec-videos/public/Aquadilla High Quality Original.mp4",

    units:      "metric",

    // temporary hard wired, but we want to get these from the data
    startTime: "2023-03-10T12:29:02.000Z",  // start time maybe not for data, as we might want a portion
    lat:  18.499617, lon: -67.113636, // this gives the ori
    frames: 7000,  // from video

    terrain: {lat:  18.499617, lon: -67.113636, zoom:15, nTiles:8},

    mainCamera: {
        fov: 30, near: 1, far: 60000000,
        startCameraPositionLLA:[18.634221,-67.374987,21503.365608], // agua mockup location
        startCameraTargetLLA:[18.628870,-67.369038,21007.002833], // maybe should be auto
    },

    cameraTrack: {file: "misb"},
    smoothTrackCamera: {kind: "smoothTrack", track:"cameraTrack", smooth: 20},
    lookCamera: {fov: 10, far: 8000000},
    followTrack: {},            // camera follows the camera track

    targetTrack: {kind: "TrackFromMISB", misb: "cameraTrackData", columns:["FrameCenterLatitude", "FrameCenterLongitude", "FrameCenterElevation"]},
    smoothTrack: {track: "targetTrack", smooth: 20},
    targetTrackDisplay: {kind: "DisplayTrack", track: "targetTrack", color: [1,0,0], width: 4,},

    lookAtTrack: {},  // and look at targetTrack

    mainView:{left:0.0, top:0, width:0.5,height:1,background:'#000000'},
    lookView: {left: 0.5, top: 0.5, width: -1.7927, height: 0.5,background:'#000000'},
    videoView: {left: 0.5, top: 0, width: -1.7927, height: 0.5},

//    displaySmoothedTarget: {kind: "DisplayTrack", track: "cameraTrack", color: [1,0,0], width: 4,},


//    targetTrack: {},


    // startTime:  "auto", // auto means we get it from the data file, ie, the first frame of the camera track
    // location:   "auto",
    // frames:     "auto", // auto mean use the length of the video file
    // we'd also want to get the fps from the video file


    altitudeLabel: {kind: "MeasureAltitude", position: "lookCamera"},
    distanceLabel:      { kind: "MeasureAB",A: "cameraTrack", B: "targetTrack", defer: true},


    DisplayCameraFrustum: {targetTrack: "targetTrack"},

}