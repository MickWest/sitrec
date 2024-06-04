// This file is a Sit definition file for the FLIR1/Nimitz/Tic-Tac video.
export const SitFlir1 = {
    name:"flir1",
    menuName: "FLIR1/Nimitz/Tic-Tac",
    isTextable: true,


    fps: 29.97,
    frames: 2289,
    aFrame: 0,
    bFrame: 2288,
    startDistance:10,
    azSlider:{defer:true},

    mainCamera: {
        startCameraPosition: [-126342.63, 56439.02, 101932.66],
        startCameraTarget: [-126346.69, 56137.48, 100979.21],
    },

    terrain: {lat:   31.605, lon:-117.870, zoom:7, nTiles:6},

    files: {
        Flir1Az: 'flir1/FLIR1 AZ.csv',
        DataFile: 'flir1/Flir1 FOV Data.csv',
        TargetObjectFile: './models/FA-18F.glb',
        ATFLIRModel: 'models/ATFLIR.glb',
        FA18Model: 'models/FA-18F.glb',
    },
    videoFile: "../sitrec-videos/public/f4-aspect-corrected-242x242-was-242x216.mp4",


    lookCamera: {},

    canvasResolution: {kind: "GUIValue", value: 484, start: 10, end: 1000, step: 1, desc: "Resolution", gui:"tweaks"},

    focus: {kind: "GUIValue", value: 0.90, start: 0.0, end: 2.0, step: 0.01, desc: "Defocus", gui:"tweaks"},


    mainView: {left: 0, top: 0, width: 1, height: 1, background: [0.05, 0.05, 0.05]},
//    lookView: {left: 0.653, top: 0.6666, width: -1, height: 0.3333,
      lookView: {left: 0.653, top: 0.625, width: -1, height: 0.375,
        canvasWidth: "canvasResolution", canvasHeight: "canvasResolution",
        // effects: [ "StaticNoise", "hBlur", "vBlur", "digitalZoom", "PixelateNxN", "pixelZoom"],
        // inputs: {
        //     hBlur: {kind: "GUIValue", value: 0.90, start: 0.0, end: 2.0, step: 0.01, desc: "Blur Horizontal"},
        //     vBlur: {kind: "GUIValue", value: 0.60, start: 0.0, end: 2.0, step: 0.01, desc: "Blur Vertical"},
        //     pixelZoom: {id: "pixelZoom", kind: "GUIValue", value: 100, start: 10, end: 2000, step: 0.01, desc: "Pixel Zoom %", hidden:true},
        //     //blockSize: {kind: "GUIValue", value: 2, start: 0, end: 10, step: 1, desc: "Block Size"},
        //     digitalZoom: 100,
        //     blockSize: 2,
        //
        // },

          // effects are nodes
          // they are specified per view
          // and have their auto ids prependend with the view
          // or you can specify the id in the normal way
        effects: {

          // initial blurs are for focus
            hBlur: { inputs: {
                 h: "focus",
            }},
            vBlur: {inputs:{
                v: "focus",
            }},
            // Noise comes AFTER focus, becuase it's on the sensor
            StaticNoise: {inputs:{
                amount: {kind: "GUIValue", value: 0.06, start: 0.0, end: 1.0, step: 0.01, desc: "Noise Amount"},
                }},
            Greyscale:{},
            Invert: {id:"FLIR1_Invert"},

            IRW_Levels: {
                id: "FLIR1_IRW_Levels",
                kind: "Levels",
                inputs: {
                    inputBlack: {kind: "GUIValue", value: 0.21, start: 0.0, end: 1.0, step: 0.01, desc: "IR In Black"},
                    inputWhite: {kind: "GUIValue", value: 1.0, start: 0.0, end: 1.0, step: 0.01, desc: "IR In White"},
                    gamma: {kind: "GUIValue", value: 2.27, start: 0.0, end: 4.0, step: 0.01, desc: "IR Gamma"},
                    outputBlack: {kind: "GUIValue", value: 0.0, start: 0.0, end: 1.0, step: 0.01, desc: "IR Out Black"},
                    outputWhite: {kind: "GUIValue", value: 1.0, start: 0.0, end: 1.0, step: 0.01, desc: "IR Out White"},

                }},

            TV_Levels: {
                id: "FLIR1_TV_Levels",
                kind: "Levels",
                inputs: {
                    inputBlack:  {kind: "GUIValue", value: 0.00, start: 0.0, end: 1.0, step: 0.01, desc: "TV In Black"},
                    inputWhite:  {kind: "GUIValue", value: 0.68, start: 0.0, end: 1.0, step: 0.01, desc: "TV In White"},
                    gamma:       {kind: "GUIValue", value: 2.75, start: 0.0, end: 4.0, step: 0.01, desc: "TV Gamma"},
                    outputBlack: {kind: "GUIValue", value: 0.00, start: 0.0, end: 1.0, step: 0.01, desc: "Tv Out Black"},
                    outputWhite: {kind: "GUIValue", value: 1.00, start: 0.0, end: 1.0, step: 0.01, desc: "Tv Out White"},

                }},


            digitalZoom: {inputs:{
                magnifyFactor: {id: "digitalZoomGUI", kind:"Constant", value: 100},
            }},
            // these blurs are for the video conversion
            hBlur2: { kind: "hBlur", inputs: {
                    h: {kind: "GUIValue", value: 0.90, start: 0.0, end: 2.0, step: 0.01, desc: "Video Blur H"},
                }},
            vBlur2: {kind: "vBlur", inputs:{
                    v: {kind: "GUIValue", value: 0.60, start: 0.0, end: 2.0, step: 0.01, desc: "Video Blur V"},
                }},


            JPEGArtifacts: {
                filter: "Linear",
                inputs: {
                    size: 16,
                    amount: {kind: "GUIValue", value: 0.0, start: 0.0, end: 1.0, step: 0.01, desc: "JPEG Artifacts"},
                }
            },

            // 2x2 pixelation is for the video being later resized to 242 size from 484
            Pixelate2x2: {inputs:{
                //blockSize: 2,
            }},

            // final zoom to match the video zoom (scaling up pixels)
            pixelZoom: {
                id: "pixelZoomNode",
                inputs: {
                magnifyFactor: {
                    id: "pixelZoom",
                    kind: "GUIValue",
                    value: 100,
                    start: 10,
                    end: 2000,
                    step: 0.01,
                    desc: "Pixel Zoom %",
                    hidden: true
                },
            }},
        },

          syncPixelZoomWithVideo: true,
          background: "#78747a",
    },

    videoView: {left: 0.653, top: 0.25, width: -1, height: 0.375,},
//    videoView: {left: 0.8250, top: 0.6666, width: -1, height: 0.3333,},



    focusTracks:{
        "Ground (no track)": "default",
        "Jet track": "jetTrack",
        "Traverse Path (UFO)": "LOSTraverseSelect"
    },

    include_JetLabels: true,

    jetTAS:     {kind: "GUIValue", value: 333, start: 320, end: 360, step: 0.1, desc: "TAS"},
    elStart:    {kind: "GUIValue", value:5.7, start:4.5,  end: 6.5,  step: 0.001,  desc:"el Start"},
    elEnd:      {kind: "GUIValue", value: 5,  start:4.5,  end: 6.5,   step:0.001,  desc: "el end"},
    elNegate:   {kind: "GUIFlag",  value:false, desc: "Negate Elevation"},

    elNormal:   {kind: "Interpolate",  start:"elStart", end:"elEnd"},
    el:         {kind: "Math", math: "$elNormal * ($elNegate ? -1 : 1)"},

    azRawData:  {kind: "arrayFromKeyframes", file: "Flir1Az", stepped: true},
    azData:     {kind: "arrayFromKeyframes", file: "Flir1Az"},

    azEditor: { kind: "CurveEditor",
        visible: true,
        left:0, top:0.5, width:-1,height:0.5,
        draggable:true, resizable:true, shiftDrag: true, freeAspect: true,
        editorConfig: {
            useRegression:true,
            minX: 0, maxX: "Sit.frames", minY: -10, maxY: 10,
            xLabel: "Frame", xStep: 1, yLabel: "Azimuth", yStep: 5,
            points:[0,4.012,352.26,4.779,360.596,3.486,360.596,2.354,999.406,1.259,999.406,0.138,1833.796,-4.44,1833.796,-5.561,2288,-8.673,2189,-8.673],        },
        frames: -1, // -1 will inherit from Sit.frames
    },

    azLinear: { kind: "Interpolate", start: 5, end: -8,},

    azSources: { kind: "Switch",
        inputs: {
            'Az Editor': "azEditor",
            'Az FLIR Video': "azData",
            'Linear': "azLinear",
        },
        desc: "Azimuth Type"
    },

    userBank: {kind: "GUIValue",value: 0, desc: "User Bank Angle", start: -5, end: 5, step: 0.1},

    bank: { kind: "Switch",
        inputs: {
            "User Bank Angle": "userBank",
        },
        desc: "Bank Angle Type"
    },

    turnRateBS: {kind: "TurnRateBS",
        inputs: {
            speed: { id: "watchTAS", kind: "parWatch", watchID: "TAS"},
            bank: "bank"
        }
    },

    // Green line is the original smoothed data
    azDataSeries:{kind:"addGraphSeries", graph: "azEditor", source: "azData", color: "#008000"},

    // red line is raw data
    azRawDataSeries:{kind:"addGraphSeries", graph: "azEditor", source: "azRawData", color: "#800000"},

    // blue line is the value of az that is actually uses, i.e. the output of the switch "azSources"
    azSourcesSeries:{kind:"addGraphSeries", graph: "azEditor", source: "azSources", color: "#008080"},

    // blue stepped line is the final value, but rounded to the nearest integer
    // so it's the value displayed as Az in the ATFLIR UI
    azStepsSeries:{kind:"addGraphSeries", graph: "azEditor", color: "#008080", source:
            {id: "roundAZ", kind: "Math", math: "round($azSources)"},
    },


    // jetLat: 31.205,
    // jetLon:-117.870,
    jetLat: {kind: "Constant", value: 31.205},
    jetLon: {kind: "Constant", value: -117.870},
    jetAltitude: {kind: "inputFeet",value: 20000, desc: "Altitude", start: 19500, end: 20500, step: 1},

    // JetOrigin uses the above three nodes to set the initial position of the jet
    jetOrigin: {kind: "TrackFromLLA", lat: "jetLat", lon: "jetLon", alt: "jetAltitude"},



    targetWind: { kind: "Wind",from: 0, knots: 100, name: "Target", arrowColor: "cyan", lock: "localWind"},
    localWind:  { kind: "Wind", from: 0, knots: 70,  name: "Local",  arrowColor: "cyan", lock: "targetWind"},
    lockWind: {kind: "GUIFlag", value: false, desc: "Lock Wind"},

    initialHeading: { kind: "Heading", heading: 227, name: "Initial", jetOrigin: "jetOrigin", arrowColor: "green" },

    userTurnRate: { kind: "GUIValue", value: 0, desc: "User Turn Rate", start: -3, end: 3, step: 0.001},

    turnRate: {kind: "Switch",
        inputs: {
            //        "Curve Editor": turnRateEditorNode,
            "User Constant": "userTurnRate",
            "From Bank and Speed": "turnRateBS",
        },
        desc: "Turn Rate Type"
    },



    jetTrack: { kind: "JetTrack",
        inputs: {
            speed: "jetTAS",
            altitude: "jetAltitude",
            turnRate: "turnRate",
            radius: "radiusMiles",
            wind: "localWind",
            heading: "initialHeading",
            origin: "jetOrigin",
        },
    },

    JetLOS: { kind: "LOSTrackAzEl",
        inputs: {
            jetTrack: "jetTrack",
            az: "azSources",
            el: "el",
        }
    },

    LOSTraverseSelect: { kind : "traverseNodes",
        menu: {
            "Constant Air Speed": "LOSTraverseConstantAirSpeed",
            "Constant Ground Speed": "LOSTraverseConstantSpeed",
            "Constant Altitude": "LOSTraverseConstantAltitude",
            "Constant Vc (closing vel)": "LOSTraverse1",
            "Straight Line": "LOSTraverseStraightLine",
            "Fixed Line": "LOSTraverseStraightLineFixed",
        },
        default: "Constant Air Speed",
    },


    jetTrackDisplay: { kind: "DisplayTrack",
        track: "jetTrack",
        color:        [0, 1, 1],
        secondColor:  [0, 0.75, 0.75],
        width:         3,
        depthFunc:      "AlwaysDepth",
        toGround:60,
    },

    LOSTraverseSelectDisplay: { kind: "DisplayTrack",
        track: "LOSTraverseSelect",
        color:          [0, 1, 0],
        secondColor:    [0, 0.75, 0],
        width:          3,
        depthFunc: "AlwaysDepth",
    },

    trackToTrackController: {
        kind: "TrackToTrack",
        sourceTrack: "JetLOS",
        targetTrack: "LOSTraverseSelect",
    },


    focalMode: {kind: "arrayFromKeyframes", file: "DataFile", dataCol: 2, string: true},
   // sensorMode:{kind: "arrayFromKeyframes", file: "DataFile", dataCol: 1, stepped: true},
    zoomMode:  {kind: "arrayFromKeyframes", file: "DataFile", dataCol: 3, stepped: true},

    ATFLIRCamera: {object: "lookCamera", focalMode: "focalMode", zoomMode: "zoomMode"},

    shakeLookCamera: {kind: "CameraShake", object: "lookCamera",
        frequency: {kind: "GUIValue", value: 0.276, start: 0.0, end: 1, step: 0.001, desc: "Frequency", gui:"tweaks"},
        decay: {kind: "GUIValue",     value: 0.708, start: 0.0, end: 1, step: 0.001, desc: "Decay", gui:"tweaks"},
        xScale: {kind: "GUIValue",    value: 0.35, start: 0.0, end: 10, step: 0.01, desc: "X Scale", gui:"tweaks"},
        yScale: {kind: "GUIValue",    value: 0.652, start: 0.0, end: 10, step: 0.01, desc: "Y Scale", gui:"tweaks"},
        spring: {kind: "GUIValue",    value: 0.719, start: 0.0, end: 1, step: 0.001, desc: "Spring", gui:"tweaks"},
    },


    ATFLIRUIOverlay: { kind: "ATFLIRUI",
        jetAltitude: "jetAltitude",
        overlayView: "lookView",
        defaultFontSize: 3.5,
        defaultFontColor: '#E0E0E0',
        defaultFont: 'sans-serif',
        timeStartMin: 41,
        timeStartSec: 35,
        altitude: 20000,
        syncVideoZoom: true,

    },

    TargetObjectModel: { kind: "DisplayTargetModel",
        track: "LOSTraverseSelect",
        TargetObjectFile: "TargetObjectFile",
        wind:"targetWind",
        tiltType: "banking",
    },

    targetSphere: { kind: "DisplayTargetSphere",
        inputs: {
            track: "LOSTraverseSelect",
            size: {kind:"sizeFeet", value: 0, start: 0, end: 500,step: 0.1,desc: "Target size ft"},
        },
        layers: "LOOK",
    },

    tailAngleGraph:{
            targetTrack: "LOSTraverseSelect",
            cameraTrack: "jetTrack",
            wind: "targetWind",
            left: 0.0, top: 0, width: .25, height: .25,
    //        visible: true, draggable: true, resizable: true, shiftDrag: false, freeAspect: true,
            maxY: 90
        },

    targetDistanceGraph: {
        targetTrack: "LOSTraverseSelect",
        cameraTrack: "jetTrack",
        left: 0.0, top: 0.25, width: .25, height: .25,
        maxY: 30,
    },

    displayLOSForJet: { kind: "DisplayLOS",
        LOS: "JetLOS",
        clipSeaLevel: false,
        color: "#308080",
        spacing: 120,
    },

    altitudeGraphForTarget: { kind: "altitudeGraph",
        track: "LOSTraverseSelect",
        min: 20000, max: 35000,
        left:0.73, top:0, width:-1, height:.25, xStep: 500, yStep:5000
    },

    speedGraphForTarget: { kind: "speedGraph",
        label: "Target Speed",
        track: "LOSTraverseSelect",
        min:0, max:500,
        left: 0.6, top:0, width: -1, height:0.25},

    flir1LegacyCode: {},

}