import {SitKML} from "./SitKML";
import {SitPVS14} from "./SitPVS14";

export const SitMaussan = Object.assign(Object.assign({},SitPVS14),{
    name: "maussan",
    menuName: "Maussan Starlink",

    targetSize: 200, // in feet
    tilt: -7.61,
    planeCameraFOV: 62,


    azSlider: false,
    jetStuff: false,
    animated: true,
    nightSky: true,
    useGlobe: true,
    useDayNightGlobe: true,
    displayFrustum: true,

    simSpeed: 25,

    starScale: 0.65,

    farClip:    50000*1000,
    nearClip: 1,
    farClipNAR: 6800*1000,
    nearClipNAR: 1,

    frames: 790, // currently needs manual setting

//    terrain: {lat: 37.897411, lon: -84.402051, zoom: 9, nTiles: 8},
    lat:  27.89,
    lon: -104.69,

    files: {
        cameraFile: 'maussan/VB7083-32eca57a-1.kml',
        starLink: 'maussan/Maussan-Starlink-TLEs.txt'
    },
    videoFile: "../sitrec-videos/private/Maussan-video.mp4",
    startTime: "2023-11-22T02:51:34.000Z",
    startCameraPosition:[2718556.11,2470980.84,-26052.36],
    startCameraTarget:[2717804.95,2470341.84,-26217.95],
    narView: { left: 0.70, top: 0.35, width: -480/852, height: 0.65,},
    videoView: { left: 0.5, top: 0.35, width: -480/852, height: 0.65,},
    mainView:{left:0.0, top:0, width:1,height:1},

// point we look at, this is up near Chigago
    toLat:  41.878633,
    toLon: -87.983577,
    toAlt: 3302.2,

    brightness: 100,
    skyColor: '#AFBDD1',  // grey from the video

    targetObject:{file: "TargetObjectFile",},

    ignoreFromLat: true,

    // with a ptz setup, add showGUI:true to allow changing it
    // then can set it to false once the settings are locked in
    ptz: {az: -89.2, el: -6.6, fov: 53.2, showGUI: true},


})