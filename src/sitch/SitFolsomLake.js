export const SitFolsomLake = {
    include_kml: true,
    name: "folsomlake",
    menuName: "Folsom Lake Test",
    isTextable: true,

    tilt: 0,

    targetSize: 1, // in feet


    frames: 1156,
    fps: 29.97,

    terrain: {lat: 38.722270, lon: -121.1694455, zoom: 15, nTiles: 12},

    startAltitude: 145, // if a track is relative (like Mini DJI SRT files), then need an initial altitude
    adjustAltitude: 5, // and if not, then we might want to bring it up above the ground
    files: {
        cameraFile:'folsomlake/Dec-22nd-2023-11-56AM-Flight-Airdata.csv',
    },
    startTime: "2023-12-22 20:00:18.000Z",  // start time of video, the cameraFile might start before this.

    videoFile: "../sitrec-videos/public/MICK folsomlake DJI_0031 - 01.mp4",
    skyColor: 'skyblue',

    mainCamera: {
        startCameraPositionLLA: [38.719864, -121.172311, 265.103926],
        startCameraTargetLLA: [38.725176, -121.163979, -90.574624],
    },
    lookCamera:{ fov: 42.15},

    cameraTrack: { id: "cameraTrack", file: "cameraFile"},
   // smoothTrack: {track: "cameraTrack", method:"moving", window: 20},
    followTrack: {},


    focusTracks: {
        "Ground (No Track)": "default",
        "Drone track": "cameraTrack",
    },

    // we don't want an fovController, as it's hard wired to one value, above
   // focalLenController: {source: "cameraTrack", object: "lookCamera", len: 166, fov: 5},
   // fovController: {source: "cameraTrack", object: "lookCamera"},

    videoView: {left: 0.5, top: 0, width: -1.7927, height: 0.5},

    lookView: {left: 0.5, top: 0.5, width: -1.7927, height: 0.5},
    mainView:{left:0.0, top:0, width:0.5,height:1},

    cameraSphereSize: 2,
    targetSphereSize: 2,

    showAltitude: false,

   // arrayDataPTZ: { arrayNode: "cameraTrack", pitch: "gPitch", heading: "heading", labelView: "labelVideo" },
    arrayDataPTZ: { arrayNode: "cameraTrack", pitch: "MISB.PlatformPitchAngle", heading: "MISB.PlatformHeadingAngle", labelView: "labelVideo" },

    DisplayCameraFrustum: {radius: 600},
}