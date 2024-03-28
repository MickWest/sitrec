
export const SitLAXUAP = {
    include_kml: true,
    name: "laxuap",
    menuName: "LAX Balloon-Likes",
    isTextable: true,


    showAltitude:false,
    showAz:false,

    starScale: 0, // 0.09,

    venusArrow: true,

    files: {
        KMLTarget: "laxuap/82-0193-track-press_alt_uncorrected.kml", // this is the one that goes overhead at 19:08
        TargetObjectFile: "./models/DC-10.glb",
    },

    videoFile: "../sitrec-videos/private/LAXUAP 11-08-37 - 720P.mp4",
    startTime: "2023-12-10T19:08:37.480Z",
    frames: 90,

    tilt: 0,

    lat:  33.953748, //
    lon: -118.412243,

    terrain: {lat:  33.948, lon:-118.43, zoom:11, nTiles:8},

    mainCamera: {
        startCameraPositionLLA: [35.017412, -118.249314, 36660.825660],
        startCameraTargetLLA: [35.008685, -118.250429, 36474.428565],
    },
    lookCamera:{ fov: 1.61},
    cameraTrack: {LLA: [33.953748, -118.412243, 36]},

    include_KMLTarget: true,

    followTrack:{},
    lookAtTrack:{},

    videoView: {left: 0.5, top: 0, width: -1.7927, height: 0.5},

    lookView: {left: 0.5, top: 0.5, width: -1.7927, height: 0.5},
    mainView:{left:0.0, top:0, width:0.5,height:1},


    cameraSphereSize: 2,
    targetSphereSize: 2,

    targetSize: 150, // in feet

    skyColor: '#4264ab',

    targetWind:{from:295, knots: 23},
    //targetWind:{from:300, knots: 13},
    objectWind:{from:60, knots: 7},

    smoothTrack: {track: "targetTrack"},

    targetObject: {file: "TargetObjectFile", wind: "targetWind"},

    // losTarget is a sphere that sits on a LOS at a certain frame
    // and is at a certain altitude
    // offset is the angle of the target from the LOS, perpendicular to the track
    // i.e. it would be to the side of a plane
    losTarget:{track: "targetTrack", camera: "lookCamera", frame: 50, altitude: 10000, size:1, offset: 0.26 },

    DisplayCameraFrustum: {targetTrack:"targetTrack"},

    nightSky: true,

}
