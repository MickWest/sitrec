// 29 Palms Back Photo
// Has:
//  - A static Camera - essentially a track with one location
//  - A static image (a photo)
//  - Three KML tracks (three planes which appear in the photo)
//  - Terrain
//
// The purpose of this Sitch was to verify the time the photo was taken, using
// the positions of the planes in the photo and the known positions of the planes from ADS-B data.
// It was set up with the approximate time, then the start time was adjusted until the planes
// matched the positions in the photo.
export const Sit29Palms = {
    name: "29palms",
    menuName: "29 Palms Back Photo",
    isTextable: true,

    frames: 180,  // 6 seconds at 30fps

    // files used in the sitch. If there's a forward slash in it
    // then we assume it's relative to the sitrec/data folder
    // if it starts with http(s) then it's a URL
    // otherwise it's a local file in a local sitch folder
    // ("local" meaning on the user's computer, and they have to give permission)
    files: {
//        threePlanes: "29palms/210420-M-ET234-1036-bright.jpg",
        threePlanes: "29palms/210420-M-ET234-1036-Pink.jpg",
        KMLTarget1: "29palms/N891UA-track-EGM96.kml",
        KMLTarget2: "29palms/N8564Z-track-EGM96.kml",
        KMLTarget3: "29palms/N279SY-track-EGM96.kml",
    },

    starScale: 0.69,        // to match the visiblity of stars in the photo
    targetSize: 600,        // size of the target spheres, in feet. Brighter than photo, as we are interested in location

    units: "Imperial",      // Imperial, Metric, or Nautical

    startTime: "2021-04-21T03:23:51.000Z",  // Exact start time of the photo (corrected)

    // discussion thread, not currently  used, but could be displayed in the GUI
    // Most sitches have a metabunk thread.
    threadURl: "https://www.metabunk.org/threads/twentynine-palms-camp-wilson-triangle-uap-flares.12967/page-3#post-293744",

    // Terrain Lat/Lon is the center of the map
    // zoom is the zoom level of the map (1-15 for Mapbox)
    // nTiles is the size of the square region to load (in tiles, so 8x8)
    terrain: {lat: 34.366222, lon: -115.975800, zoom: 12, nTiles: 8},

    mainCamera: {
        fov: 30, // fov will default to 30° if not specified (vertical)
        // delete the following two lines to use the default start position
        // which you'll want to do if the sitch is in a different location
        // then look in the console output for the LLA start positions
        // and copy them here.
        startCameraPositionLLA:[34.946185,-117.021467,46923.760411],
        startCameraTargetLLA:[34.940799,-117.013381,46636.128158],
    },

    mainView: {left: 0.0, top: 0, width: 0.5, height: 1, fov: 50, background: '#132d44',},

    lookCamera: {fov: 10,},
    lookView: {left: 0.5, top: 0.5, width: -1.5, height: 0.5, background: '#132d44',},

    cameraTrack: {LLA: [34.399060162,-115.858257450, 1380]},
    followTrack: {}, // will default to lookCamera and cameraTrack

    // PTZ is used to set the camera position and fov, but after that it's not needed
    // to be part of the UI (it's just setup). So you could set showGUI to false.
    // which would simplify the menus.
    ptz: {az: 141.7, el: 7.3, fov: 30.5, roll: -2.1, showGUI: true}, // << good for photo match

    // A CNodeImageView is a like a static VideoView
   imageThreePlanes: { kind: "ImageView",
        filename: 'threePlanes',
        draggable: true, resizable: true,
        left: 0.5, top: 0, width: -1.5, height: 0.5,
    },


    // Here a CNodeImageView is an overlay, and it's a mirror (duplicate)of the above image
    imageMirror: { kind: "ImageView", mirror: "imageThreePlanes", overlayView: "lookView", transparency: 0.50 , autoClear:false},

    // labelView defaults to adding an overlay to lookView, and adds the time and date
    labelView: {},

    addKMLTracks: { tracks: ["KMLTarget1", "KMLTarget2", "KMLTarget3"], sphereMask:"WORLD", sphereColor: [1,1,0]},
//     addKMLTracks: { tracks: [ "29palms/N891UA-track-EGM96.kml",
//             "29palms/N8564Z-track-EGM96.kml",
//             "29palms/N279SY-track-EGM96.kml",], sphereMask:"WORLD"},

    // a bit of a patch to get all three tracks labeled
    altLabel1: {kind: "MeasureAltitude", position: "KMLTargetKMLTarget1"},
    altLabel2: {kind: "MeasureAltitude", position: "KMLTargetKMLTarget2"},
    altLabel3: {kind: "MeasureAltitude", position: "KMLTargetKMLTarget3"},

    distLabel1: {kind: "MeasureAB", A:"cameraTrack", B: "KMLTargetKMLTarget1"},
    distLabel2: {kind: "MeasureAB", A:"cameraTrack", B: "KMLTargetKMLTarget2"},
    distLabel3: {kind: "MeasureAB", A:"cameraTrack", B: "KMLTargetKMLTarget3"},

    DisplayCameraFrustum: {radius:100000},

    nightSky: true,
    useGlobe: true,
    useDayNightGlobe: true,
}
