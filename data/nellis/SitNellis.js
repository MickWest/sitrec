// This file is a Sit definition file for the Nellis/Tonopah video.

export const SitFlir1 = {
    name: "nellis",
    menuName: "Nellis/Tonopah",
    isTextable: true,

    fps: 29.97,
    frames: 9068,

    aFrame: 0,
    bFrame: 9067,

    startDistance:1,
    startDistanceMin: 0.01,
    startDistanceMax: 3,

    files: {
        FileAz: "nellis/AZ.csv",
        FileEl: "nellis/EL.csv",
        FileRng: "nellis/RNG.csv",
    },

    videoFile: "../sitrec-videos/public/BEST QUALITY Nellis Test Range UFO Video - with frame numbers - LOW.mp4",

    terrain: {lat:37.4886978, lon:-116.3992968, zoom:12, nTiles:6},

    lookCamera: {
        fov: 10,
        addFOVController: true,
    },

    mainCamera: {
        fov: 40,
        startCameraPositionLLA:[37.372979,-116.673935,17707.137068],
        startCameraTargetLLA:[37.376120,-116.664834,17232.419792],
    },


    cameraTrack: {LLA: [37.4886978,-116.3992968, 5100]},


    mainView: {left: 0, top: 0, width: 1, height: 1, background: [0.05, 0.05, 0.05]},
    lookView: {left: 0.653, top: 0.6666, width: -1, height: 0.3333,},
    videoView: {left: 0.8250, top: 0.6666, width: -1, height: 0.3333,},


  //  azRawData:  {kind: "arrayFromKeyframes", file: "FileAz", degrees: true, stepped: true},
    azData:     {kind: "arrayFromKeyframes", file: "FileAz", degrees: true, exportable: true},

  //  elRawData:  {kind: "arrayFromKeyframes", file: "FileEl", degrees: true, stepped: true},
    elData:     {kind: "arrayFromKeyframes", file: "FileEl", degrees: true},

  //  rngRawData:  {kind: "arrayFromKeyframes", file: "FileRng", stepped: true},
    rngData:     {kind: "arrayFromKeyframes", file: "FileRng"},

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

    targetWind: { kind: "Wind",from: 0, knots: 100, name: "Target", arrowColor: "cyan"},


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

    speedGraph: {track: "LOSTraverseSelect", label: "Target Speed", max: 300,},
    altitudeGraph: {track: "LOSTraverseSelect", max: 25000, left: 0.25},

}
