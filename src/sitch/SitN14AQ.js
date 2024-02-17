import {SitKML} from "./SitKML";
import {commonKMLTrackToTrack} from "./CommonSitch";

export const SitN14AQ = Object.assign(Object.assign({},SitKML),{
    name: "n14aq",
    menuName: "N14AQ Reddit UFO",


    targetSize: 200, // in feet
    tilt: 2.6,



    frames: 84,
    terrain: {lat: 32.226890, lon: -82.940488, zoom: 9, nTiles: 8},
    files: {
        cameraFile: 'n14aq/FlightAware_N14AQ_KDVK_KLAL_20220808.kml',
        KMLTarget: "n14aq/FlightAware_DAL2369_KEYW_KATL_20220808.kml",
        TargetObjectFile: './models/737_MAX_8_White.glb',
    },
    startTime: "2022-08-08T12:16:15.800Z",

    videoFile: "../sitrec-videos/private/n14aq-reddit.mp4",
    skyColor: 'skyblue',

    mainCamera: {
        startCameraPosition: [-45363.5216949528, 55163.527660652966, -178916.8365339594],
        startCameraTarget: [-45322.06031147982, 54883.94200386166, -177957.61142263407],
    },
    lookCamera:{ fov: 23},
    cameraTrack: {},


    lookView: { left: 0.75, top: 0.35, width: -540/720, height: 0.65,},
    videoView: { left: 0.5, top: 0.35, width: -540/720, height: 0.65,},
    mainView:{left:0.0, top:0, width:.50,height:1},

    ...commonKMLTrackToTrack,
    //targetSizedSphere: { size:200 },
    targetObject: {file: "TargetObjectFile"},
    targetSizedSphere: { size:200 },

})