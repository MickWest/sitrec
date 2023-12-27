import {SitKML} from "./SitKML";

export const SitLAXUAP = {
    ...SitKML,
    name: "laxuap",
    menuName: "LAX Balloon-Likes",
    nightSky: true,
  //  useGlobe: true,


    files: {
//        starLink: "westjet/starlink-2023-12-18.tle",
//        cameraFile: "westjet/FlightAware_WJA1517_KPHX_CYYC_20231219.kml",
        KMLTarget: "laxuap/82-0193-track-press_alt_uncorrected.kml",
        TargetObjectFile: "./models/DC-10.glb",
    },

    targetObject: {file: "TargetObjectFile"},

    videoFile: "../sitrec-videos/private/LAXUAP 11-08-37 - 720P.mp4",
    startTime: "2023-12-10T19:08:37.480Z",
    frames: 782,


    fromLat:  33.953748, //
    fromLon: -118.412243,

    fromAlt: 36,
    fromAltMin: 0,
    fromAltMax: 1000,

    tilt: 0,

    lat:  33.953748, //
    lon: -118.412243,

    terrain: {lat:  33.948, lon:-118.43, zoom:11, nTiles:8},

   // ptz: {az: -79.6, el: 3.7, fov: 25.7, showGUI: true},

    startCameraPositionLLA:[35.017412,-118.249314,36660.825660],
    startCameraTargetLLA:[35.008685,-118.250429,36474.428565],

    videoView: {left: 0.5, top: 0, width: -1280 / 714, height: 0.5},

    lookView: {left: 0.5, top: 0.5, width: -1280 / 714, height: 0.5},
    mainView:{left:0.0, top:0, width:0.5,height:1},

    cameraSphereSize: 2,
    targetSphereSize: 2,

    targetSize: 150, // in feet
    planeCameraFOV: 1.61,

    skyColor: 'skyblue',

}