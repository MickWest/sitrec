import {SitKML} from "./SitKML";
import {Vector3} from "../../three.js/build/three.module";

export const SitAA2292 = Object.assign(Object.assign({},SitKML),{
    extends: "SitKML", // ????????????????
    name: "aa2292",
    menuName: "AA2292 Cruise Missile",

    targetSize: 85, // in feet
    tilt: 13,

    planeCameraFOV: 32,

    frames:2000,
    terrain: {lat: 37.001324, lon: -102.717053, zoom: 9, nTiles: 8},
    files: {
        cameraFile: 'aa2292/FlightAware_AAL2292_KCVG_KPHX_20210221.kml',
        KMLTarget: "aa2292/FlightAware_N738RJ_KSLC_KBCT_20210221.kml"
    },
    videoFile: undefined,
    startTime: "2021-02-21T19:10:10.800Z",


    brightness: 100,
    skyColor: 'skyblue',

    startCameraPosition: [94142.74587419331,13402.067238703776,-27360.90061964375],
    startCameraTarget: [93181.8523901133,13269.122270956876,-27117.982222227354],

    narView: { left: 0.5, top: 0.0, width: 0.5, height: 1,},
 //   videoView: { left: 0.5, top: 0.35, width: -540/720, height: 0.65,},


})