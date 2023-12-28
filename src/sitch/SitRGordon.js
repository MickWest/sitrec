import {SitPVS14} from "./SitPVS14";

export const SitRGordon = {
    ...SitPVS14,
    name: "rgordon",
    menuName: "RGordon Starlink",
    simSpeed: 1,
    fps:24,

    starScale: 0.19,
    satScale: 0.36,
    satCutOff: 0.0125,

    files: {
        starLink: "rgordon/starlink-2023-12-23.tle",
        cameraFile: "rgordon/FlightAware_N711WS_KSNA_CYYZ_20231223.kml",
    },

    videoFile: "../sitrec-videos/private/RGordon UAP video  -  taken by me in Dec 23 at 3-53am .mp4",
    startTime: "2023-12-23T08:54:32.300Z",
    frames: 3050,

    ptz: {az: 83.2, el: 0.9, fov: 7.3, showGUI: true},

    startCameraPositionLLA:[42.957372,-84.432317,49840.021007],
    startCameraTargetLLA:[42.959455,-84.420653,49671.778230],

}