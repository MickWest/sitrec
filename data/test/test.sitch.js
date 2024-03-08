sitch = {
    include_pvs14: true,  // NOTE - this has files in it that are not used with the new system
    name: "test",
    menuName: "TEST",
    files: {
  //      starLink: "westjet/starlink-2023-12-18.tle",
  //      cameraFile: "westjet/FlightAware_WJA1517_KPHX_CYYC_20231219.kml",
    },


    // So here we've rehosted the video file, and the camera track file, and the starlink file
    // all via the "Import File" button
    // which now copies the URL to the clipboard on upload

 //  videoFile: "../sitrec-videos/private/UAP Sighting by WestJet Passengers 12-18-23 16-05 clip.mp4",
    videoFile: "http://localhost/sitrec-upload/99999999/Ring_FrontDoor_20240307_2213%20slow-5ec1b66d9c38665cbc57c898f358fe86.mp4",
    startTime: "2023-12-19T03:56:12.560Z",
    frames: 782,

    mainCamera: {
        fov: 30, near: 1, far: 60000000,
        startCameraPositionLLA: [38.602145, -86.506588, 4159762.165337],
        startCameraTargetLLA: [38.603456, -86.509621, 4158895.037381],
    },
    lookCamera: {fov: 10, far: 8000000},
//    cameraTrack: {file: "westjet/FlightAware_WJA1517_KPHX_CYYC_20231219.kml"},
    cameraTrack: {file: "http://localhost/sitrec-upload/99999999/FlightAware_WJA1517_KPHX_CYYC_20231219-fd9db08be9e57b71b32791a40bcb0fb7.kml"},
//    cameraTrack: {file: "99999999/FlightAware_WJA1517_KPHX_CYYC_20231219-fd9db08be9e57b71b32791a40bcb0fb7.kml"},
    ptz: {az: -79.6, el: 0.6, fov: 25.7, showGUI: true},
    altitudeLabel: {kind: "MeasureAltitude", position: "lookCamera"},

    nightSky: {starLink: "westjet/starlink-2023-12-18.tle",},
//    nightSky: true,

}

