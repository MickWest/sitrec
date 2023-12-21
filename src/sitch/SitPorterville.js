import {SitKML} from "./SitKML";

//export const SitPorterville = Object.assign(Object.assign({},SitKML),{
export const SitPorterville = {
    ...SitKML,
    name: "porterville",
    menuName: "Porterville Sphere",

    tilt: 0,

    targetSize: 3, // in feet

    planeCameraFOV: 5,

    frames: 21191,     // ful vid is 21207,
    fps: 59.94,
    terrain: {lat: 36.021573, lon: -119.022304, zoom: 14, nTiles: 6},
    files: {
//        cameraFile: 'n14aq/FlightAware_N14AQ_KDVK_KLAL_20220808.kml',
        cameraFile: 'porterville/DJI_20231217152755_0007_D.SRT',
      //  KMLTarget: "n14aq/FlightAware_DAL2369_KEYW_KATL_20220808.kml"
    },
    startTime: "2023-12-17 15:27:55.258",

    videoFile: "../sitrec-videos/private/DJI_20231217152755_0007_D-720p.mp4",
    brightness: 100,
    skyColor: 'skyblue',

    startCameraPosition:[-1341.61,848.22,-6109.46],
    startCameraTarget:[-957.26,543.21,-5238.12],

    videoView: {left: 0.5, top: 0, width: -1280 / 714, height: 0.5},

    narView: {left: 0.5, top: 0.5, width: -1280 / 714, height: 0.5},
    mainView:{left:0.0, top:0, width:0.5,height:1},

    cameraSphereSize: 20,
    targetSphereSize: 20,

    // instead of a target KML file, we define a simple spline
    // in this case just two points, linear interpolation (a line)
    targetSpline: {
        type: "linear",
        initialPoints: [
            [0, -245.83437878094787, 309.22659885812095, -3866.285249383911],
            [21191, -344.31725947256325, 304.0173135915461, -4129.776316201121]
        ]
    }


}