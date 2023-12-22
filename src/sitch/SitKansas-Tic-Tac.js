import {SitKML} from "./SitKML";

export const SitKansasTicTac = Object.assign(Object.assign({},SitKML),{
    name: "kansas",
    menuName: "Kansas Tic-Tac",


    planeCameraFOV: 22.25,

    targetSize: 200, // in feet
    tilt: 4.63,


    frames: 569,
    terrain: {lat: 38.890803, lon: -101.874630, zoom: 9, nTiles: 8},
    files: {
        cameraFile:   'kansas/N615UX-track-EGM96.kml',
        KMLTarget: 'kansas/N121DZ-track-EGM96.kml'
    },
    startTime: "2022-09-01T20:07:32.3Z",

    videoFile: "../sitrec-videos/private/124984_Kansas.mp4",
    brightness: 100,
    skyColor: 'skyblue',

    videoView: { left: 0.5, top: 0.1, width: 0.25, height: -1280/720,},
    lookView: { left: 0.75, top: 0.1, width: 0.25, height: -1280/720,},

    startCameraPosition: [-85066.7462608161,39944.94770769397,89579.86841298439],
    startCameraTarget: [-84544.13436719228,39639.19461613414,88784.00921963136],

})