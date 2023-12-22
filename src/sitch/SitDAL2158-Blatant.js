import {SitKML} from "./SitKML";

export const SitDAL2158 = Object.assign(Object.assign({},SitKML),{
    name: "dal2158",
    menuName: "Blatant's DAL2158",

    planeCameraFOV: 30,

    targetSize: 200, // in feet

    tilt: 0,

    frames: 1200,
    terrain: {lat: 38.230849, lon: -76.558613, zoom: 9, nTiles: 8},
    files: {
        cameraFile: 'dal2158/FlightAware_DAL2158_KCHS_KBOS_20230218.kml',
        KMLTarget: "dal2158/FlightAware_EDV5291_KRIC_KJFK_20230218.kml"
    },
    startTime: "2023-02-18T22:34:56.8Z",

    videoFile: "../sitrec-videos/private/Blatant-enhanced.mp4",
    skyColor: 'skyblue',
    startCameraPosition:[-475.76,83065.85,-135001.17],
    startCameraTarget:[-585.88,82459.73,-134213.45],

})