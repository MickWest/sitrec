import {SitKML} from "./SitKML";

//export const SitPorterville = Object.assign(Object.assign({},SitKML),{
export const SitPorterville = {
    ...SitKML,
    name: "porterville",
    menuName: "Porterville Sphere",

    tilt: 0,

    targetSize: 1, // in feet
    displayFrustum: true,
    frustumRadius: 2000,
    frustumColor: 0xff0000,
    frustumLineWeight: 1.5,



    frames: 21191,     // ful vid is 21207,
    fps: 59.94,

    terrain: {lat: 36.021573, lon: -119.022304, zoom: 15, nTiles: 12},
    files: {
//        cameraFile: 'n14aq/FlightAware_N14AQ_KDVK_KLAL_20220808.kml',
        cameraFile: 'porterville/DJI_20231217152755_0007_D.SRT',
      //  KMLTarget: "n14aq/FlightAware_DAL2369_KEYW_KATL_20220808.kml"
    },
    startTime: "2023-12-17 15:27:55.258",

    videoFile: "../sitrec-videos/private/DJI_20231217152755_0007_D-720p.mp4",
    skyColor: 'skyblue',

    // TODO -STOP USING EUS COORDINATES IN SIT - USE LLA, OTHERWISE WHEN MAP Resolution changes, it breaks
  //  startCameraPosition:[-1341.61,848.22,-6109.46],
  //  startCameraTarget:[-957.26,543.21,-5238.12],
    mainCamera: {
        startCameraPositionLLA: [36.077341, -119.029799, 851.286742],
        startCameraTargetLLA: [36.069518, -119.025527, 545.430961],
    },
    lookCamera:{ fov: 50},

    videoView: {left: 0.5, top: 0, width: -1280 / 714, height: 0.5},

    lookView: {left: 0.5, top: 0.5, width: -1280 / 714, height: 0.5},
    mainView:{left:0.0, top:0, width:0.5,height:1},

    cameraSphereSize: 20,
    targetSphereSize: 20,

    // instead of a target KML file, we define a simple spline
    // in this case just two points, linear interpolation (a line)
    targetSpline: {
        type: "linear",
        // initialPoints: [
        //     [0, -245.83437878094787, 309.22659885812095, -3866.285249383911],
        //     [21191, -344.31725947256325, 304.0173135915461, -4129.776316201121]
        // ]
        initialPointsLLA: [
            [0, 36.05717639406794, -119.01762411981093, 310.40310754440725],
            [21191, 36.05954325940758, -119.01871851160264, 305.36353635508567]
        ]
    },
    showAltitude: true,


}