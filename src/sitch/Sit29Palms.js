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

    files: {
        threePlanes: "29palms/210420-M-ET234-1036-bright.jpg",
        // KMLTarget1: "29palms/N891UA-track-EGM96.kml",
        // KMLTarget2: "29palms/N8564Z-track-EGM96.kml",
        // KMLTarget3: "29palms/N279SY-track-EGM96.kml",
    },

    units: "Imperial",

    startTime: "2021-04-21T03:23:53.000Z",

    // discussion thread, not currently used, but could be displayed in the GUI
    // Most sitches have a metabunk thread.
    threadURl: "https://www.metabunk.org/threads/twentynine-palms-camp-wilson-triangle-uap-flares.12967/page-3#post-293744",

    terrain: {lat: 34.366222, lon: -115.975800, zoom: 12, nTiles: 8},

    mainCamera: {
        fov: 30,
        startCameraPosition: [-7888.59, 6602.16, -30715.32],
        startCameraTarget: [-7324.29, 6493.84, -29896.89],
    },
    mainView: {left: 0.0, top: 0, width: 0.5, height: 1, fov: 50, background: '#132d44',},

    lookCamera: {fov: 10,},
    lookView: {left: 0.5, top: 0.5, width: -1.7927, height: 0.5, background: '#132d44',},

    cameraTrack: {LLA: [34.399060162,-115.858257450, 1402]},
    followTrack: {}, // will default to lookCamera and cameraTrack

    // PTZ is used to set the camera position and fov, but after that it's not needed
    // to be part of the UI (it's just setup). So you could set showGUI to false.
    // which would simplify the menues.
    ptz: {az: 141.9, el: 9.8, fov: 25.4, showGUI: true}, // << good for photo match

    // A CNodeImage acts like a CNode View
   imageThreePlanes: { kind: "Image",
        filename: 'threePlanes',
       // smooth: new CNodeGUIValue({id: "smooth", value: 20, start: 1, end: 200, step: 1, desc: "Filter"}, gui),
        draggable: true, resizable: true,
        left: 0.5, top: 0, width: -1.7927, height: 0.5,
    },

    labelView: {},

//    addKMLTracks: { tracks: ["KMLTarget1", "KMLTarget2", "KMLTarget3"], sphereMask:"WORLD"},
    addKMLTracks: { tracks: [ "29palms/N891UA-track-EGM96.kml",
            "29palms/N8564Z-track-EGM96.kml",
            "29palms/N279SY-track-EGM96.kml",], sphereMask:"WORLD"},

    DisplayCameraFrustum: {radius:100000},

    nightSky: true,
    useGlobe: true,
    useDayNightGlobe: true,
}
