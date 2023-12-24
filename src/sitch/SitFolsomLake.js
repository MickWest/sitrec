import {SitKML} from "./SitKML";

//export const SitPorterville = Object.assign(Object.assign({},SitKML),{
export const SitFolsomLake = {
    ...SitKML,
    name: "folsomlake",
    menuName: "Folsom Lake Test",

    tilt: 0,

    targetSize: 1, // in feet
    displayFrustum: true,
    frustumRadius: 2000,
    frustumColor: 0xff0000,
    frustumLineWeight: 1.5,


    planeCameraFOV: 5,

    frames: 1156,
    fps: 29.97,

    terrain: {lat: 38.722270, lon: -121.1694455, zoom: 15, nTiles: 12},

    startAltitude: 145, // if a track is relative (like Mini DJI SRT files), then need an initial altitude
    adjustAltitude: 5, // and if not, then we might want to bring it up above the ground
    files: {
        //cameraFile: 'folsomlake/MICK folsomake DJI_0031 - 01.srt',
        cameraFile:'folsomlake/Dec-22nd-2023-11-56AM-Flight-Airdata.csv',
    },
    startTime: "2023-12-22 20:00:18.000Z",  // start time of video, the cameraFile might start before this.

    videoFile: "../sitrec-videos/public/MICK folsomlake DJI_0031 - 01.mp4",
    skyColor: 'skyblue',

    startCameraPositionLLA:[38.719864,-121.172311,265.103926],
    startCameraTargetLLA:[38.725176,-121.163979,-90.574624],

    videoView: {left: 0.5, top: 0, width: -1280 / 714, height: 0.5},

    lookView: {left: 0.5, top: 0.5, width: -1280 / 714, height: 0.5},
    mainView:{left:0.0, top:0, width:0.5,height:1},

    cameraSphereSize: 2,
    targetSphereSize: 2,

    // instead of a target KML file, we define a simple spline
    // in this case just two points, linear interpolation (a line)
    targetSpline: {
        type: "linear",
        initialPoints: [
            [0, -245.83437878094787, 309.22659885812095, -3866.285249383911],
            [21191, -344.31725947256325, 304.0173135915461, -4129.776316201121]
        ]
        // initialPointsLLA: [
        //     [0, 36.05717639406794, -119.01762411981093, 310.40310754440725],
        //     [21191, 36.05954325940758, -119.01871851160264, 305.36353635508567]
        // ]
    },
    showAltitude: true,


}