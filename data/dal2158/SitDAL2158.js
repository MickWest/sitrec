export const SitDAL2158 = {
    include_kml: true,
    name: "dal2158",
    menuName: "Blatant's DAL2158",
    isTextable: true,


    tilt: 0,

    frames: 1200,
    terrain: {lat: 38.230849, lon: -76.558613, zoom: 9, nTiles: 8},
    files: {
        cameraFile: 'dal2158/FlightAware_DAL2158_KCHS_KBOS_20230218.kml',
        TargetTrack: "dal2158/FlightAware_EDV5291_KRIC_KJFK_20230218.kml"
    },
    startTime: "2023-02-18T22:34:57.057Z",

    videoFile: "../sitrec-videos/private/Blatant-enhanced.mp4",
    skyColor: 'skyblue',
    mainCamera: {
        startCameraPositionLLA:[38.489577,-76.801253,29169.575490],
        startCameraTargetLLA:[38.483602,-76.795820,28597.349958],
    },
    lookCamera:{ fov: 30},

    mainView:{ left:0.0, top:0, width:0.50,height:1},
    lookView:{ left: 0.75, top: 0, width: .25, height: 1,fov:2,},
    include_TrackToTrack: true,
  //  targetSizedSphere: { size:200 },

    useRealisticLights: true,

    // DAL is a good test case for lighting, as it's very low sun, but not zero!
    lighting: {
        kind: "Lighting",
        ambientIntensity: 0.85,
    },

    include_Compasses: true,

    targetObject: { kind: "3DObject", model: "737 MAX 8 BA"},
    include_MoveAlongTrack: true,

}