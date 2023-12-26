import {SitPVS14} from "./SitPVS14";

export const SitWestJet = {
    ...SitPVS14,
    name: "westjet",
    menuName: "WestJet Triangle",

    files: {
        starLink: "westjet/starlink-2023-12-18.tle",
        cameraFile: "westjet/FlightAware_WJA1517_KPHX_CYYC_20231219.kml",
    },

    videoFile: "../sitrec-videos/private/UAP Sighting by WestJet Passengers 12-18-23 16-05 clip.mp4",
    startTime: "2023-12-19T03:56:12.560Z",
    frames: 782,

    ptz: {az: -79.6, el: 3.7, fov: 25.7, showGUI: true},

    startCameraPositionLLA:[38.602145,-86.506588,4159762.165337],
    startCameraTargetLLA:[38.603456,-86.509621,4158895.037381],

}