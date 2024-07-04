// AFR179 Fly-by
// A plane-to-plane
// fixed view
// video
// 8x speed


export const SitAFR179 = {
    include_kml: true,
    name: "afr179",
    menuName: "AFR179 Fly-by",
    isTextable: true,

    nightsky:true,

    frames: 1248, // 156 * 8, // currently needs manual setting
    videoSpeed: 8,

    terrain: {lat: 37.897411, lon: -84.402051, zoom: 9, nTiles: 8},
    files: {
        cameraFile: 'afr179/FlightAware_AFR179_MMMX_LFPG_20221108.kml',
        TargetTrack: "afr179/FlightAware_FDX1273_KBOS_KMEM_20221108.kml",
        TargetObjectFile: './models/737 MAX 8 BA.glb',
    },
    videoFile: "../sitrec-videos/private/001 - passenger_films_unknown_object.mp4",
    startTime: "2022-11-08T05:20:55.700Z",

    mainCamera: {
        fov: 30,
        startCameraPosition: [51932.24, 32612.20, 98754.72],
        startCameraTarget: [51817.84, 32302.32, 97810.85],
    },

    mainView:{left:0.0, top:0, width:0.9,height:1},
    lookView: { left: 0.75, top: 0.35, width: -0.75, height: 0.65,},
    videoView: { left: 0.5, top: 0.35, width: -0.75, height: 0.65,},

    skyColor: '#AFBDD1',  // grey from the video

    include_TrackAndCameraLabeled: true,
    targetObject: {file: "TargetObjectFile",},
    ptz: {az: -36.2, el: 1.98, fov: 62, showGUI: true},

}