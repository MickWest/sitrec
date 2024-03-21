sitch = {

    name: "misb",
    menuName: "MISB",

    // "files" is a list of files to load with a key for each one
    // so we can reference them later
    // e.g. "misb" is used by both the camera track and the target track
    // Files can also be specified at the object level, this is just a convenience.

    // Using the sitrec server, core app file, URL is relative to the /data/ folder
    //files: {misb: "misb/misb2-agua.csv"},


    // using an external server requires that the server has CORS enabled
    // e.g. for Cloudflare R2 or Amazon S3 you edit the CORS settings
    // note http vs. https is important
    // [
    //     {
    //         "AllowedOrigins": [
    //             "http://localhost",
    //             "https://www.metabunk.org"
    //         ],
    //         "AllowedMethods": [
    //             "GET"
    //         ]
    //     }
    // ]

    // using the Cloudflare R2 server (S3 Compatible)
    //files: {misb: "https://sitrec.metabunk.org/misb2-agua.csv"},

    files: {
     //   misb: "https://sitrec.s3.us-west-2.amazonaws.com/misb2-agua.csv",
        klv: "misb/Truck.klv",
    },

    // video files likewise can be local or remote
    // currently videos are not streamed, just loaded in their entirety

//    videoFile: "../sitrec-videos/public/Aquadilla High Quality Original.mp4",
    videoFile: "../sitrec-videos/public/Truck.mp4",


//    videoFile: "https://sitrec.s3.us-west-2.amazonaws.com/Aquadilla+High+Quality+Original.mp4",

    units: "metric",

    // temporary hard wired, but we want to get these from the data
//    startTime: "2023-03-10T12:29:02.000Z",  // start time maybe not from track data, as we might want a portion
//    startTime: "2012-09-13T20:50:26.970Z",  // start time maybe not from track data, as we might want a portion
    startTime: "2012-09-19T20:50:26.970Z",  // start time maybe not from track data, as we might want a portion
    fps: 29.97,

   // lat: 18.499617, lon: -67.113636, // this gives the origin of the ESU coordinate system, but terrain overrides
    lat: 41.0957, lon: -104.8702,
    frames: 4438,  // from video

    // terrain is the smaller 3D map
    //  lan/lon is the center of the map
    // zoom is the zoom level, 15 is the maximum resolution like 2m/pixel (I think)
    // nTiles is the number of tiles to load in each direction, so 8 will give you an 8x8 grid
    // the 3D world size of a tile is based on the zoom level, so if you decrease the zoom level by 1
    // that will double the length of a tile in meters.
//    terrain: {lat: 18.499617, lon: -67.113636, zoom: 14, nTiles: 8},
    terrain: {lat: 41.0957, lon: -104.8702, zoom: 14, nTiles: 8},

    // mainCamera is the camera used for the God's eye view of the 3D world, typically on the left.
    mainCamera: {
        fov: 30, near: 1, far: 60000000,
        //startCameraPositionLLA: [18.634221, -67.374987, 21503.365608], // agua mockup location
        //startCameraTargetLLA: [18.628870, -67.369038, 21007.002833], // maybe should be auto
        startCameraPositionLLA:[40.945882,-104.918343,16617.205002],
        startCameraTargetLLA:[40.952762,-104.915401,16026.513301],
    },

    // lookCamera is the camera used for the look view, typically on the right
    // i.e. the view  used to replicate a video
    lookCamera: {fov: 10, far: 8000000},

    // here we get the camera track from a MISB file
    // using SensorLatitude, SensorLongitude, SensorAltitude
    cameraTrack: {file: "klv"},
 //   smoothTrackCamera: {kind: "smoothTrack", track: "cameraTrack", smooth: 20},
    followTrack: {},            // camera follows the camera track

    targetTrack: {
        kind: "TrackFromMISB",
        misb: "cameraTrackData",
        columns: ["FrameCenterLatitude", "FrameCenterLongitude", "FrameCenterElevation"]
    },
 //   smoothTrack: {track: "targetTrack", smooth: 20},
    targetTrackDisplay: {kind: "DisplayTrack", track: "targetTrack", color: [1, 0, 0], width: 4,},

    lookAtTrack: {},  // and look at targetTrack
    fovController: {source: "cameraTrack"},

    mainView: {left: 0.0, top: 0, width: 0.5, height: 1, background: '#000000'},
    lookView: {left: 0.5, top: 0.5, width: -1.7927, height: 0.5, background: '#000000'},
    videoView: {left: 0.5, top: 0, width: -1.7927, height: 0.5},

//    videoView2: {kind: "videoView", left: 0.4, top: .25, width: -1.7927, height: 0.5, transparency: 0.5 },
    videoView2: {kind: "videoView", overlayView: "lookView", transparency: 0.15 },


    // startTime:  "auto", // auto means we get it from the data file, ie, the first frame of the camera track
    // location:   "auto",
    // frames:     "auto", // auto mean use the length of the video file
    // we'd also want to get the fps from the video file


    altitudeLabel: {kind: "MeasureAltitude", position: "lookCamera"},
    distanceLabel: {kind: "MeasureAB", A: "cameraTrack", B: "targetTrack", defer: true},


    DisplayCameraFrustum: {targetTrack: "targetTrack"},


//    targetWind:{from:270, knots: 20}, // can we get this from the MISB? It's in a differnt location

    Wind1: {kind: "Wind", from: 270, knots: 20},
    Wind2: {kind: "Wind", from: 90, knots: 20},
    targetWind: {
        kind: "Switch", gui: "main", desc: "Target Wind", inputs: {
            "Wind from West": "Wind1",
            "Wind from East": "Wind2",
        }
    },
    DisplayWindArrow: {source: "targetWind"},


    JetLOS: {kind: "LOSTrackTarget", cameraTrack: "cameraTrack", targetTrack: "targetTrack"},


    traverseNodes: {
        menu: {
            "Constant Speed": "LOSTraverseConstantSpeed",
            "Constant Altitude": "LOSTraverseConstantAltitude",
            "Straight Line": "LOSTraverseStraightLine",
        },
        default: "Constant Speed"
    },

    // display the traverse track
    traverseDisplay: {
        kind: "DisplayTrack",
        track: "LOSTraverseSelect",
        color: [0,1,0],
        width: 4,
    },

    useGlobe: true,

}