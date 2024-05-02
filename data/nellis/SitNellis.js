// This file is a Sit definition file for the Nellis/Tonopah video.

export const SitNellis = {
    name: "nellis",
    menuName: "Nellis/Tonopah",
    isTextable: true,

    fps: 24,
    frames: 3992,

    // aFrame: 0,
    // bFrame: 9067,

    startDistance:1,
    startDistanceMin: 0.01,
    startDistanceMax: 10,

    files: {
        FileAz: "nellis/AZ-S-30.csv",
        FileEl: "nellis/EL-S-30.csv",
        FileRng: "nellis/RNG-S-30.csv",
    },

//    videoFile: "../sitrec-videos/public/BEST QUALITY Nellis Test Range UFO Video - with frame numbers - LOW.mp4",
    videoFile: "../sitrec-videos/public/BEST QUALITY Nellis Test Range UFO Video - with frame numbers - LOW - S-30.mp4",


    terrain: {lat:37.3892, lon:-116.5543, zoom:12, nTiles:7},

    lookCamera: {
        fov: 2,
        addFOVController: true,
    },

    mainCamera: {
        fov: 40,
        // startCameraPositionLLA:[37.372979,-116.673935,17707.137068],
        // startCameraTargetLLA:[37.376120,-116.664834,17232.419792],

        // view of path
        startCameraPositionLLA:[37.569310,-116.238502,6397.351959],
        startCameraTargetLLA:[37.566960,-116.249286,6241.443987],

        // focus on radomes
        // startCameraPositionLLA:[37.357151,-116.568025,8101.966010],
        // startCameraTargetLLA:[37.351637,-116.575903,7734.377154],
    },


    cameraTrack: {LLA: [37.521000,-116.399833, 5100]},


    mainView: {left: 0, top: 0, width: 1, height: 1, background: [0.05, 0.05, 0.05]},
    lookView: {left: 0.70, top: 0.3333, width: -1.6666, height: 0.3333,},
    videoView: {left: 0.70, top: 0.6666, width: -1.6666, height: 0.3333,},


  //  azRawData:  {kind: "arrayFromKeyframes", file: "FileAz", degrees: true, stepped: true},
    azData:     {kind: "arrayFromKeyframes", file: "FileAz", degrees: true, exportable: true, frameOffset:-5077, smooth:100},

  //  elRawData:  {kind: "arrayFromKeyframes", file: "FileEl", degrees: true, stepped: true},
    elData:     {kind: "arrayFromKeyframes", file: "FileEl", degrees: true, frameOffset:-5077, smooth:100},

  //  rngRawData:  {kind: "arrayFromKeyframes", file: "FileRng", stepped: true},
    rngData:     {kind: "arrayFromKeyframes", file: "FileRng", frameOffset:-5077},

    azSources: { kind: "Switch",
        inputs: {
            'Video': "azData",
        },
        desc: "Azimuth Type"
    },

    elSources: { kind: "Switch",
        inputs: {
            'Video': "elData",
        },
        desc: "Elevation Type"
    },

    JetLOS: { kind: "LOSTrackAzEl",
        inputs: {
            jetTrack: "cameraTrack",
            az: "azSources",
            el: "elSources",
        },
        absolute: true, // absolute is relative to north, not a jet's boresight
    },

    DisplayLOS: { LOS: "JetLOS", width: 0.5, spacing:120, color: [0, 0.1, 0] },

    targetWind: { kind: "Wind",from: 0, knots: 0, name: "Target", arrowColor: "cyan"},


    LOSTraverseRNG: {kind: "LOSTraverse",
        LOS: "JetLOS",
        range: "rngData",
        units: "meters",
    },

    LOSTraverseSelect: { kind : "traverseNodes",
        menu: {
            "RNG Values": "LOSTraverseRNG",
            "Constant Air Speed": "LOSTraverseConstantAirSpeed",
            "Constant Ground Speed": "LOSTraverseConstantSpeed",
            "Constant Altitude": "LOSTraverseConstantAltitude",
            "Constant Vc (closing vel)": "LOSTraverse1",
            "Straight Line": "LOSTraverseStraightLine",
            "Fixed Line": "LOSTraverseStraightLineFixed",
        },
        default: "RNG Values",
    },

    LOSTraverseSelectDisplay: { kind: "DisplayTrack",
        track: "LOSTraverseSelect",
        color:          [0, 1, 0],
        secondColor:    [0.2, 0.2, 0.2],
        width:          3,
        depthFunc: "AlwaysDepth",
    },


    trackToTrackController: {
        kind: "TrackToTrack",
        sourceTrack: "JetLOS",
        targetTrack: "LOSTraverseSelect",
    },

    DisplayCameraFrustum: {targetTrack: "LOSTraverseSelect"},

    segmentSelectAB: {kind: "segmentSelect",
    menu: {
        "All": [0,9067],
        "First 0-4404": [0,4404],
        "Middle 4405-6571": [4405,6571],
        "Sweep around": [4442, 6000],
        "Full Object": [5188, 9067],
        "Last 6572-9067": [6572, 9067]
    },
    default: "All",
    },

    speedGraph: {track: "LOSTraverseSelect", label: "Target Speed", max: 500,},
    altitudeGraph: {track: "LOSTraverseSelect", max: 25000, left: 0.25},

    compassMain: {kind: "CompassUI", camera: "mainCamera", left: 0.0, top: 0.90, width: -1, height: 0.1},
   // compassLook: {kind: "CompassUI", camera: "lookCamera", left: 0.653, top: 0.93, width: -1, height: 0.07},

    radome1: {kind: "LLASphere", LLA: [ 37.283008,-116.645823, 2190], radius: 10, color: "cyan", layers: "LOOKRENDER"},
    radome2: {kind: "LLASphere", LLA: [ 37.283670,-116.646272, 2190], radius: 10, color: "yellow", layers: "LOOKRENDER"},

}
