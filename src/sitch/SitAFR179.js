import {SitKML} from "./SitKML";

export const SitAFR179 = Object.assign(Object.assign({},SitKML),{
    name: "afr179",
    menuName: "AFR179 Fly-by",


    targetSize: 200, // in feet
    tilt: -7.61,

    frames: 157 * 8, // currently needs manual setting
    videoSpeed: 8,

    terrain: {lat: 37.897411, lon: -84.402051, zoom: 9, nTiles: 8},
    files: {
        cameraFile: 'afr179/FlightAware_AFR179_MMMX_LFPG_20221108.kml',
        KMLTarget: "afr179/FlightAware_FDX1273_KBOS_KMEM_20221108.kml",
        TargetObjectFile: './models/737_MAX_8_White.glb',
    },
    videoFile: "../sitrec-videos/private/001 - passenger_films_unknown_object.mp4",
    startTime: "2022-11-08T05:20:55.700Z",

    mainCamera: {
        fov: 30,
        startCameraPosition: [51932.24, 32612.20, 98754.72],
        startCameraTarget: [51817.84, 32302.32, 97810.85],
    },

    lookView: { left: 0.75, top: 0.35, width: -540/720, height: 0.65,},
    videoView: { left: 0.5, top: 0.35, width: -540/720, height: 0.65,},
    mainView:{left:0.0, top:0, width:1,height:1},

// point we look at, this is up near Chigago
    toLat:  41.878633,
    toLon: -87.983577,
    toAlt: 3302.2,

    skyColor: '#AFBDD1',  // grey from the video

    targetObject:{file: "TargetObjectFile",},

})