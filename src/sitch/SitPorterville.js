import {SitKML} from "./SitKML";

export const SitPorterville = Object.assign(Object.assign({},SitKML),{
    name: "porterville",
    menuName: "Porterville Black Sphere",


    targetSize: 200, // in feet
    tilt: 2.6,


    planeCameraFOV: 23,

    frames: 84,
    terrain: {lat: 36.0584, lon: -119.018, zoom: 15, nTiles: 6},
    files: {
        cameraFile: 'n14aq/FlightAware_N14AQ_KDVK_KLAL_20220808.kml',
//        cameraFile: 'porterville/DJI_20231217152755_0007_D.SRT',
        KMLTarget: "n14aq/FlightAware_DAL2369_KEYW_KATL_20220808.kml"
    },
    startTime: "2022-08-08T12:16:15.800Z",

    videoFile: "../sitrec-videos/private/DJI_20231217152755_0007_D-720p.mp4",
    brightness: 100,
    skyColor: 'skyblue',

    startCameraPosition:[-149.90,376.99,-553.64],
    startCameraTarget:[240.84,69.77,314.08],

    videoView: {left: 0.5, top: 0, width: -1280 / 714, height: 0.5},

    narView: {left: 0.5, top: 0.5, width: -1280 / 714, height: 0.5},
    mainView:{left:0.0, top:0, width:0.5,height:1},

})