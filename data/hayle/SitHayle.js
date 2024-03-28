export const SitHayle = {
    name: "hayle",
    menuName: "Hayle Beach / St. Ives",
    isTextable: true,

    files: {
        hayleCSV: "hayle/hayle-track.csv",
    },
    videoFile: "../sitrec-videos/private/Hayle Beach UFO.mp4",

    units: "Imperial",

    fps: 29.97,
    frames: 2780,

    terrain: {lat: 50.197944, lon: -5.428180, zoom: 15, nTiles: 8},

    mainCamera: {
        startCameraPosition: [278.4748110392168, 64.40911042728831, -205.77524399028982],
        startCameraTarget: [374.9433739111792, -41.17793070506451, -1195.4949988311907],
    },

    lookCamera: {},

    mainView: {left: 0.0, top: 0, width: 0.53, height: 1, background: "#989fa7"},
    lookView: {left: 0.53, top: 0.5, width: -1.7927, height: 0.5,},
    videoView: {left: 0.53, top: 0, width: -1.7927, height: 0.5,},

    // with a ptz setup, add showGUI:true to allow changing it
    // then can set it to false once the settings are locked in
    ptz: {az: -37.4, el: -4.3, fov: 45, showGUI: false},

    lookPosition: { fromLat: 50.197944, fromLon: -5.428180, fromAltFeet: 64, fromAltFeetMin: 0, fromAltFeetMax: 100,},
//    lookTarget: { toLat: 50.222085, toLon: -5.468553, toAlt: 0, }, // not needed with ptz


    LOSConstantCamera: {id: "cameraTrack", camera: "lookCamera"},

    motionTrackLOS: { kind: "LOSMotionTrack",
        cameraTrack: "cameraTrack",
        csv: "hayleCSV",

        // This specifies the dimensions of the video that the motion tracking was done on.
        // fov is the vertical FOV in degrees
        width: 1280, height: 714, fov: 45,

        // This specifies the columns in the CSV file that contain
        // the frame number, and the x and y
        // were x and y are pixel coordinates of the target in the video
        // relative to the top left corner.
        frameCol: 0, xCol: 1, yCol: 2,

        // Window for Rolling Average smoothing
        window: 30,
    },

    DisplayLOS: { LOS: "motionTrackLOS", width: 3},

    startDistanceFeet: {value: 300, start: 0, end: 20000, step: 1, desc: "Tgt Start Dist (Ft)"},


    LOSTraverseConstantDistance: { kind: "LOSTraverse",
        LOS: "motionTrackLOS", startDist: "startDistance",
    },

    // Wind is only relevant in calculating the air speed
    targetWind: { from: 270, knots: 0, max: 50},

    speedGraph: {track: "LOSTraverseConstantDistance", label: "Target Speed", max: 100, width:0.5},

    targetSizedSphere: { track: "LOSTraverseConstantDistance", size: 3},

    DisplayTargetSphere: {track: "LOSTraverseConstantDistance", size: 10, },

    DisplayTrack: {
        track: "LOSTraverseConstantDistance",
        color: [0,1,1],
        width: 1,
    },

    // setup2: function () {
    //     //
    //     // // the red line that joins the camera track to the target - i.e. the current LOS.
    //     // new CNodeDisplayTrackToTrack({
    //     //     id: "DisplayLOS",
    //     //     cameraTrack: "motionTrackLOS",
    //     //     targetTrack: "LOSTraverseConstantDistance",
    //     //     color: new CNodeConstant({value: new Color(1, 0, 0)}),
    //     //     width: 2,
    //     // })
    //
    // }
}
