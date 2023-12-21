import {SitKML} from "./SitKML";

export const SitLakeMichiganTicTac = Object.assign(Object.assign({},SitKML),{
    name: "lakemichigan",
    menuName: "Lake Michigan Tic-Tac",

    planeCameraFOV: 5,
    targetSize: 200, // in feet
    tilt: 0,

    frames: 1200,
    terrain: {lat: 42.933424, lon: -86.129730, zoom: 9, nTiles: 8},
    files: {
        cameraFile: 'lakemichigan/FlightAware_UAL267_KBOS_KDEN_20211017.kml',
        KMLTarget: "lakemichigan/FlightAware_DAL2474_KORD_KDTW_20211017.kml"
    },
    startTime: "2021-10-17T15:50:27.766Z",

    videoFile: "../sitrec-videos/private/118963_submitter_file1__IMG2065_opt.mp4",
    brightness: 100,
    skyColor: 'skyblue',
    startCameraPosition:[-34182.50,33412.62,14293.62],
    startCameraTarget:[-33633.28,32831.80,13692.80],

})