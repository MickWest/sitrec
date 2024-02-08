import {SitKML} from "./SitKML";
import {commonKMLCamera, commonKMLTarget, commonKMLTracks, commonKMLTrackToTrack} from "./CommonSitch";

export const SitLAXUAP = {
    ...SitKML,
    name: "laxuap",
    menuName: "LAX Balloon-Likes",
    nightSky: true,
  //  useGlobe: true,

    showAltitude:false,
    showAz:false,

    starScale: 0, // 0.09,

    venusArrow: true,

    files: {
        KMLTarget: "laxuap/82-0193-track-press_alt_uncorrected.kml", // this is the one that goes overhead at 19:08
        TargetObjectFile: "./models/DC-10.glb",
    },


    videoFile: "../sitrec-videos/private/LAXUAP 11-08-37 - 720P.mp4",
    startTime: "2023-12-10T19:08:37.480Z",
    frames: 90,


    // fromLat:  33.953748, //
    // fromLon: -118.412243,
    //
    // fromAltFeet: 36,
    // fromAltFeetMin: 0,
    // fromAltFeetMax: 1000,

    tilt: 0,

    lat:  33.953748, //
    lon: -118.412243,

    terrain: {lat:  33.948, lon:-118.43, zoom:11, nTiles:8},


    mainCamera: {
        startCameraPositionLLA: [35.017412, -118.249314, 36660.825660],
        startCameraTargetLLA: [35.008685, -118.250429, 36474.428565],
    },
    lookCamera:{ fov: 1.61},
    cameraTrack: {LLA: [33.953748, -118.412243, 36]},
    ...commonKMLTarget,
    followTrack:{},
    lookAtTrack:{},

    videoView: {left: 0.5, top: 0, width: -1280 / 714, height: 0.5},

    lookView: {left: 0.5, top: 0.5, width: -1280 / 714, height: 0.5},
    mainView:{left:0.0, top:0, width:0.5,height:1},

    losTarget:{track: "targetTrack", camera: "lookCamera", frame: 50, altitude: 10000, size:1, offset: 0.26 },

    cameraSphereSize: 2,
    targetSphereSize: 2,

    targetSize: 150, // in feet

    skyColor: '#4264ab',



    targetWind:{from:295, knots: 23},
    //targetWind:{from:300, knots: 13},
    objectWind:{from:60, knots: 7},

    targetObject: {file: "TargetObjectFile", wind: "targetWind"},
    displayFrustum: true,


}