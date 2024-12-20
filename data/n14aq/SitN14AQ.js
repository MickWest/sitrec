export const SitN14AQ = {
    include_kml: true,
    name: "n14aq",
    menuName: "N14AQ Reddit UFO",
    isTextable: true,

    targetSize: 200, // in feet

    frames: 84,
    terrain: {lat: 32.226890, lon: -82.940488, zoom: 9, nTiles: 8},
    files: {
        cameraFile: 'n14aq/FlightAware_N14AQ_KDVK_KLAL_20220808.kml',
        TargetTrack: "n14aq/FlightAware_DAL2369_KEYW_KATL_20220808.kml",
        TargetObjectFile: './models/737 MAX 8 BA.glb',
    },
    startTime: "2022-08-08T12:16:15.800Z",

    videoFile: "../sitrec-videos/private/n14aq-reddit.mp4",
    skyColor: 'skyblue',

    mainCamera: {
        startCameraPositionLLA:[33.574426,-82.985859,55127.465142],
        startCameraTargetLLA:[33.566191,-82.985950,54746.628234],
    },
    lookCamera:{ fov: 23},
    cameraTrack: {},

    lookView: { left: 0.75, top: 0.35, width: -0.75, height: 0.65,},
    videoView: { left: 0.5, top: 0.35, width: -0.75, height: 0.65,},
    mainView:{left:0.0, top:0, width:0.50,height:1},
    tilt: 2.6,

    include_TrackToTrack: true,
    targetObject: {file: "TargetObjectFile"},
    targetSizedSphere: { size:200 },
}