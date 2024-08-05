// AA2292 Cruise Missile
// A KML plane-to-plane Sitch
// No video


export const SitAA2292 = {
    include_kml: true,
    name: "aa2292",
    menuName: "AA2292 Cruise Missile",
    isTextable: true,


    targetSize: 85, // in feet

    frames:2000,
    terrain: {lat: 37.001324, lon: -102.717053, zoom: 9, nTiles: 8},
    files: {
        cameraFile: 'aa2292/FlightAware_AAL2292_KCVG_KPHX_20210221.kml',
        TargetTrack: "aa2292/FlightAware_N738RJ_KSLC_KBCT_20210221.kml"
    },
    videoFile: null,
    videoView: null,
    startTime: "2021-02-21T19:10:10.800Z",


    skyColor: 'skyblue',

    mainCamera: {
        fov:  32,
        startCameraPositionLLA:[37.039114,-102.504946,14385.043681],
        startCameraTargetLLA:[37.035931,-102.514934,14097.502965],
    },

    lookCamera: {
        fov: 32,
        addFOVController: true,
    },
    cameraTrack: {},
    lookView: { left: 0.5, top: 0.0, width: 0.5, height: 1,},
    mainView:{left:0.0, top:0, width:0.50,height:1},
//    focusTracks: {},
    ptz: {az: -111.8, el: 9.5, fov: 13, roll:0, showGUI: true},

    include_TrackAndCameraLabeled: true,

  //  targetSizedSphere: { size:100 },

    // targetObject: {model: "Lear 75"},

    targetObject: { kind: "3DObject", model: "Lear 75"},
    include_MoveAlongTrack: true,




}