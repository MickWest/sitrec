import {SitKML} from "./SitKML";

export const SitITY621 = Object.assign(Object.assign({},SitKML),{
    name: "ity621",
    menuName: "ITY621 Dark Contrails",


    targetSize: 200, // in feet
    tilt: 1.24,

    frames: 708, // currently needs manual setting
    terrain: {lat: 47.812613, lon: -4.260180, zoom: 9, nTiles: 8},
    files: {
        cameraFile: 'ity621/FlightAware_ITY621_KLAX_LIRF_20221014.kml',
        KMLTarget: "ity621/FlightAware_SAS7487_ENCN_GCLP_20221015.kml",
        KMLOther: "ity621/FlightAware_RYR5580_EGPH_LEAL_20221015.kml",
        TargetObjectFile: './models/737_MAX_8_White.glb',
    },
    startTime: "2022-10-15T08:03:39.000Z",

    videoFile: "../sitrec-videos/private/ITY621Video.mp4",
    skyColor: '#AFBDD1',  // grey from the video

    mainCamera: {
        startCameraPosition: [61967.92, 37073.99, -39378.75],
        startCameraTarget: [61140.05, 36689.14, -38970.70],
    },
    lookCamera:{ fov: 12.5},
    cameraTrack: {},


    lookView: { left: 0.75, top: 0.35, width: -540/720, height: 0.65,},
    videoView: { left: 0.5, top: 0.35, width: -540/720, height: 0.65,},
    mainView:{left:0.0, top:0, width:1,height:1},


})