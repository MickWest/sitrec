// SitCustom.js is a sitch that lets the user drop in
// a track file and a video file, and then displays the track
// the initial location and time are extracted from the track file
// a track file can be any of the following:
// - a CSV file with columns for time, lat, lon, alt, heading
// - a KLV file with the same columns
// existing sitches that resemble this are:
// - SitFolsom.js (DJI drone track)
// - SitPorterville.js (DJI Drone track)
// - SitMISB.js (MISB track)
// - SitJellyfish (simple user spline track) (MAYBE)


sitch = {
    name: "custom",
    menuName: "Custom (Drag and Drop)",
    isCustom: true,
    canMod: false, // this is a custom sitch, so does not use the "modding" system, instead exports all of this
    isTool: true,

    centerOnLoadedTracks: true, // likely unique to SitCustom. When true, the camera will center on the loaded track(s) when they are loaded.


    initialDropZoneAnimation: true,

    startDistance: 1,
    startDistanceMin: 0.01,
    startDistanceMax: 25,  // this might need to be adjusted based on the terrain per sitch

    startTime: "2012-09-19T20:50:26.970Z",
    // default terrain covers some of the local area
    TerrainModel: {kind: "Terrain", lat: 31.5, lon: -118, zoom: 8, nTiles: 6},
    terrainUI: {kind: "TerrainUI", terrain: "TerrainModel"},

    // default to 30 seconds. Loading a video will change this (also need manual, eventually)
    frames: 900,
    fps: 30,

    ambientLight: 0.0,

    // if we are loading a video, then we want to extract frames from it
    framesFromVideo: true,

    lat: 32, lon: -118,

    targetSize: 100,

    lookCamera: {fov: 5, near: 1, far: 8000000},
    mainCamera: {fov: 30, near: 1, far: 60000000,
        startCameraPositionLLA:[28.732768,-117.711797,242274.849513],
        startCameraTargetLLA:[28.740680,-117.712652,241879.049676],
    },

    videoView: {left: 0.5, top: 0, width: -1.7927, height: 0.5, autoClear:false},
    mainView: {left: 0.0, top: 0, width: 0.5, height: 1, background: '#408080'},

    focus: {kind: "GUIValue", value: 0.00, start: 0.0, end: 5.0, step: 0.01, desc: "Defocus", gui:"effects"},

    canvasResolution: {kind: "GUIValue", value: 1600, start: 10, end: 2000, step: 1, desc: "Resolution", gui:"effects"},

    lookView: {left: 0.5, top: 0.5, width: -1.7927, height: 0.5,

        canvasWidth: "canvasResolution", canvasHeight: "canvasResolution",

        effects: {
            //Copy:{},



            // initial blurs are for focus
            hBlur: { inputs: {
                    h: "focus",
                }},
            vBlur: {inputs:{
                    v: "focus",
                }},
            // Noise comes AFTER focus, becuase it's on the sensor
            StaticNoise: {inputs:{
                    amount: {kind: "GUIValue", value: 0.01, start: 0.0, end: 1.0, step: 0.01, desc: "Noise Amount", gui:"effects"},
                }},
            Greyscale:{id:"Custom_GreyScale", enabled: false},
            Invert: {id:"Custom_Invert", enabled: false},

            Custom_Levels: {
                kind: "Levels",
                inputs: {
                    inputBlack:  {kind: "GUIValue", value: 0.00, start: 0.0, end: 1.0, step: 0.01, desc: "TV In Black", gui:"effects"},
                    inputWhite:  {kind: "GUIValue", value: 1.00, start: 0.0, end: 1.0, step: 0.01, desc: "TV In White", gui:"effects"},
                    gamma:       {kind: "GUIValue", value: 1.00, start: 0.0, end: 4.0, step: 0.01, desc: "TV Gamma", gui:"effects"},
                    outputBlack: {kind: "GUIValue", value: 0.00, start: 0.0, end: 1.0, step: 0.01, desc: "Tv Out Black", gui:"effects"},
                    outputWhite: {kind: "GUIValue", value: 1.00, start: 0.0, end: 1.0, step: 0.01, desc: "Tv Out White", gui:"effects"},

                },
                enabled: true,
                },


            // digitalZoom: {inputs:{
            //         magnifyFactor: {id: "digitalZoomGUI", kind:"Constant", value: 100},
            //     }},

            // these blurs are for the video conversion


            JPEGArtifacts: {
                filter: "Linear",
                inputs: {
                    size: 8,
                    amount: {kind: "GUIValue", value: 0.07, start: 0.0, end: 1.0, step: 0.01, desc: "JPEG Artifacts", gui: "effects"},
                }
            },

            // 2x2 pixelation is for the video being later resized to 242 size from 484


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
    },

    dragDropHandler: true,
    useGlobe: true,

    nightSky: {
        showEquatorialGrid: false,
        showConstellations: false,
        useDayNight: true,
    },


    fixedCameraPosition: {kind: "PositionLLA", LLA: [31.980814,-118.428486,63604.652928]},

    cameraTrackSwitch: {kind: "Switch",
        inputs: {
           "fixedCamera": "fixedCameraPosition",
        },
        desc: "Camera Track"
    },

    fixedTargetPosition: {kind: "PositionLLA", LLA: [32.5,-118.428486,30000]},

    targetTrackSwitch: {
        kind: "Switch",
        inputs: {
            "fixedTarget": "fixedTargetPosition",
        },
        desc: "Target Track"
    },

    swapTargetAndCameraTracks: {},

    ptzAngles: {kind: "PTZUI", az: 0, el: 0, roll: 0, fov: 90, showGUI: true},

    // angels controllers
    angelsSwitch: {
        kind: "Switch",
        inputs: {
            "Manual PTZ": "ptzAngles",
            // when we add tracks, if they have angles, then we'll add a losTrackMISB node and
            // then a matrixController
        },
        desc: "Angles Source"
    },

    fovUI: {kind: "GUIValue", value: 30, start: 0.1, end: 170, step: 0.001, desc: "vFOV"},

    fovSwitch: {
        kind: "Switch",
        inputs: {
            "userFOV": "fovUI",
        },
        desc: "Camera FOV"
    },


    fovController: {
        kind: "fovController",
        object: "lookCamera",
        source: "fovSwitch",
    },

    trackPositionController: {kind: "TrackPosition", sourceTrack: "cameraTrackSwitch"},

    // These are the types of controller for the camera
    // which will reference the cameraTrackSwitch for source data
    CameraPositionController: {
        kind: "Switch",
        inputs: {
            "Follow Track": "trackPositionController",
        },
        desc: "Camera Position",
    },


    trackToTrackController: {kind: "TrackToTrack", sourceTrack: "cameraTrackSwitch", targetTrack: "targetTrackSwitch",},

    // The LOS controller will reference the cameraTrackSwitch and targetTrackSwitch
    // for source data
    // can be track-to-track, fixed angles, Az/El/Roll track, etc.
    CameraLOSController: {kind: "Switch",
        inputs: {
            "To Target": "trackToTrackController",
            "Use Angles": "angelsSwitch",
        },
        desc: "Camera Heading"
    },

    // Since we are controlling the camera with the LOS controller, we can extract the LOS
    // for other uses, such as a target track generated for LOS traversal

    recordLos: {kind: "RecordLOS"},
    JetLOS: {kind: "LOSFromCamera", cameraNode: "lookCamera", useRecorded: true},
//    JetLOS: {kind: "LOSFromCamera", cameraNode: "lookCamera"},

    // Wind is needed to adjust the target planes heading relative to motion in the TailAngleGraph and for the model angle
    targetWind: {from: 270, knots: 0, name: "Target", arrowColor: "cyan"},

    // The "Track" traverse node uses the ground track
    LOSTraverseSelectTrack: {
        kind: "traverseNodes",
        // idExtra: "Track",
        los: "JetLOS",
        menu: {
            "Target Object": "targetTrackSwitch",
            "Constant Speed": "LOSTraverseConstantSpeed",
            "Constant Altitude": "LOSTraverseConstantAltitude",
            "Straight Line": "LOSTraverseStraightLine",
        },
        default: "Constant Altitude",
        exportable: true,
    },

    // display the traverse track (Track)
    traverseDisplayTrack: {
        kind: "DisplayTrack",
        track: "LOSTraverseSelectTrack",
        color: [0,0,1],
        width: 1,
    },


    // WHY does smoothing lose the heading info for ObjectTilt
    // smoothTrack: {track: "LOSTraverseSelectTrack", method:"moving"},


    traverseSmoothedTrack: {
        kind: "SmoothedPositionTrack",
        source: "LOSTraverseSelectTrack",
        method: "moving",
        window: {
            kind: "GUIValue",
            value: 50,
            start: 1,
            end: 1000,
            step: 1,
            desc: "Target Smooth Window",
            gui: "traverse"
        },
    },


    smoothedDisplayTrack: {
        kind: "DisplayTrack",
        track: "traverseSmoothedTrack",
        color: [0,1,0],
        width: 1,
    },



    targetObject: { kind: "3DObject",
        geometry: "box",
        layers: "TARGETRENDER",
        size: 1,
        radius: 10,

        width: 10,
        height: 10,
        depth: 10,

        material: "lambert",
        color: "#FFF00",
        emissive: '#404040',
        widthSegments:20,
        heightSegments:20,
    },
    moveTargetAlongPath: {kind: "TrackPosition", object: "targetObject", sourceTrack: "traverseSmoothedTrack"},
    orientTarget: {kind: "ObjectTilt", object: "targetObject", track: "traverseSmoothedTrack", tiltType: "banking"},


    displayLOS: {kind: "DisplayLOS", LOS: "JetLOS", color: "red", width: 0.5},


    focusTracks:{
        "Ground (no track)": "default",
        "Sensor (camera) track": "cameraTrackSwitch",
        "Traverse Path (UFO)": "LOSTraverseSelectTrack"
    },


    // for each type of files that is dropped (e.g. KLV, CSV, video)
    // specify what switch nodes will be updated with this new option
    // and what kind of data will be extracted from the file
    // TODO: add support for focus tracks, which are currently using
    // a direct GUI, and should be a CNodeSwitch
    dropTargets: {
        "track": ["cameraTrackSwitch", "targetTrackSwitch", "zoomToTrack"],
//        "track": ["cameraTrackSwitch", "targetTrackSwitch"],
        "fov": ["fovSwitch"],
        "angles": ["angelsSwitch"],
    },


// Standard useful things, eventually have them more configurable

    mirrorVideo: { transparency: 0.0, autoClear:false},
    DisplayCameraFrustum: {radius: 500000, lineWeight: 1.0, color: "white"},

    altitudeLabel: {kind: "MeasureAltitude", position: "lookCamera"},
    altitudeLabel2: {kind: "MeasureAltitude", position: "LOSTraverseSelectTrack"},
    distanceLabel: {kind: "MeasureAB", A: "cameraTrackSwitch", B: "targetTrackSwitch", defer: true},



    shakeLookCamera: {kind: "CameraShake", object: "lookCamera",
        frequency: {kind: "GUIValue", value: 0.0, start: 0.0, end: 1, step: 0.001, desc: "Shake Freq", gui:"effects"},
        decay: {kind: "GUIValue",     value: 0.708, start: 0.0, end: 1, step: 0.001, desc: "Shake Decay", gui:"effects"},
        multiply: {kind: "GUIValue",  value: 10, start: 1, end: 100, step: 1, desc: "Shake Multiply", gui:"effects"},
        xScale: {kind: "GUIValue",    value: 0.35, start: 0.0, end: 10, step: 0.01, desc: "Shake X Scale", gui:"effects"},
        yScale: {kind: "GUIValue",    value: 0.652, start: 0.0, end: 10, step: 0.01, desc: "Shake Y Scale", gui:"effects"},
        spring: {kind: "GUIValue",    value: 0.719, start: 0.0, end: 1, step: 0.001, desc: "Shake Spring", gui:"effects"},
    },


    targetDistanceGraph: {
        targetTrack: "LOSTraverseSelectTrack",
        cameraTrack: "cameraTrackSwitch",
        left: 0.0, top: 0.0, width: .25, height: .25,
        maxY: 30,
    },


    altitudeGraphForTarget: { kind: "altitudeGraph",
        track: "LOSTraverseSelectTrack",
        min: 0, max: 60000,
        left:0.40, top:0, width:.15, height:-1, xStep: 500, yStep:5000
    },

    speedGraphForTarget: { kind: "speedGraph",
        label: "Target Speed",
        track: "LOSTraverseSelectTrack",
        min:0, max:1000,
        left: 0.25, top:0, width: .15, height:-1},


    // // The moving average smoothed jet track
    // targetTrackSwitchSmooth: {
    //     kind: "SmoothedPositionTrack",
    //     method: "moving",
    //     source: "targetTrackSwitch",
    //     window: {kind: "GUIValue", value: 200, start:1, end:1000, step:1, desc:"Target Smooth Window", gui:"traverse"},
    //     // iterations: {kind: "GUIValue", value: 6, start:1, end:100, step:1, desc:"Target Smooth Iterations", gui:"traverse"}
    // },
    //
    // speedGraphMoving: { kind: "speedGraph",
    //     label: "Moving Speed",
    //     track: "targetTrackSwitchSmooth",
    //     min:0, max:1000,
    //     left: 0.70, top:0, width: .15, height:-1},
    //
    // // The Camull spline smoothed jet track
    // targetTrackSwitchSmoothSliding: {
    //     kind: "SmoothedPositionTrack",
    //     method: "catmull",
    //     source: "targetTrackSwitch",
    //     intervals: {kind: "GUIValue", value: 20, start:1, end:200, step:1, desc:"Catmull Intervals", gui:"traverse"},
    //     tension:{kind:"GUIValue", value: 0.5, start:0, end:5, step:0.001, desc:"Catmull Tension", gui:"traverse"},
    // },
    //
    //
    //
    // speedGraphSliding: { kind: "speedGraph",
    //     label: "Sliding Speed",
    //     track: "targetTrackSwitchSmoothSliding",
    //     min:0, max:1000,
    //     left: 0.85, top:0, width: .15, height:-1},
    //


    include_Compasses: true,

    // labelView defaults to adding an overlay to lookView, and adds the time and date
    labelView: {},

}