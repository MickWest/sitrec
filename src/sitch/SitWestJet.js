// export const SitWestJet = {
//     include_pvs14:true,
//     name: "westjet",
//     menuName: "WestJet Triangle",
//
//     files: {
//         starLink: "westjet/starlink-2023-12-18.tle",
//         cameraFile: "westjet/FlightAware_WJA1517_KPHX_CYYC_20231219.kml",
//     },
//
//     videoFile: "../sitrec-videos/private/UAP Sighting by WestJet Passengers 12-18-23 16-05 clip.mp4",
//     startTime: "2023-12-19T03:56:12.560Z",
//     frames: 782,
//
//     mainCamera: {
//         fov: 30, near:1,  far:60000000,
//         startCameraPositionLLA: [38.602145, -86.506588, 4159762.165337],
//         startCameraTargetLLA: [38.603456, -86.509621, 4158895.037381],
//     },
//     lookCamera:{ fov: 10, far: 8000000 },
//     cameraTrack: {},
//     ptz: {az: -79.6, el: 0.6, fov: 25.7, showGUI: true},
//     altitudeLabel:      { kind: "MeasureAltitude",position: "lookCamera"},
// }

// experiment with text based data
export const SitWestJet =JSON.parse(`
    {
      "include_pvs14": true,
      "name": "westjet",
      "menuName": "WestJet Triangle",
      "files": {"starLink": "westjet/starlink-2023-12-18.tle", "cameraFile": "westjet/FlightAware_WJA1517_KPHX_CYYC_20231219.kml"},
      "videoFile": "../sitrec-videos/private/UAP Sighting by WestJet Passengers 12-18-23 16-05 clip.mp4",
      "startTime": "2023-12-19T03:56:12.560Z",
      "frames": 782,
      "mainCamera": {
        "fov": 30,
        "near": 1,
        "far": 60000000,
        "startCameraPositionLLA": [38.602145, -86.506588, 4159762.165337],
        "startCameraTargetLLA": [38.603456, -86.509621, 4158895.037381]
      },
      "lookCamera": {"fov": 10, "far": 8000000},
      "cameraTrack": {},
      "ptz": {"az": -79.6, "el": 0.6, "fov": 25.7, "showGUI": true},
      "altitudeLabel": {"kind": "MeasureAltitude", "position": "lookCamera"}
    }
`)