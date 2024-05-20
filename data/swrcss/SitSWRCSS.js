export const SitSWRCSC = {
    name: "swrcss",                    // the name of the sitch, which we can use with "include_"
    menuName: "Skinwalker Ranch - CSS",   // Name displayed in the menu
    isTextable: true,               // true if we can export and edit this sitch as a custom sitch


    startTime: "2021-10-25T02:05:16.000Z",

    fps: 29.97,
    frames: 3000,

    files: {
        starLink: "swrcss/swr-css.txt",
    },

    // TEST
    lat: 40.2572028, lon: -109.893759,

    // Terrain Lat/Lon is the center of the map
    // zoom is the zoom level of the map (1-15 for Mapbox)
    // nTiles is the size of the square region to load (in tiles, so here 4x4)
    // tileSegments is optional in the range 1..256 and is the resolution of the height map
    terrain: {lat: 40.2572028, lon: -109.893759, zoom: 14, nTiles: 4, tileSegments: 256},

    // a single camera, with the position and heading define by two LLA points
    mainCamera: {
        far:    80000000,
        startCameraPositionLLA:[40.254018,-109.880925,1685.104643],
        startCameraTargetLLA:[40.257957,-109.891099,1439.697690],
    },

    // a full screen view. The size and position are fractions of the window size
    // background is the color of the sky.
    mainView: {left:0.0, top:0, width:0.5,height:1, background:'#132d44',},

    lookCamera: {fov: 10, far: 80000000, },
    lookView: {left:0.5, top:0.5, width:-1.792,height:0.5,background:'#132d44',},
    lookPosition: { fromLat: 40.2572028, fromLon: -109.893759, fromAltFeet: 5700, fromAltMin: 0, framAltMax: 55000,},

    labelView: {id:"labelVideo", overlay: "lookView"},
    DisplayCameraFrustum: {radius:100000},




    ptz: {az: -70.773, el: 56.8872, fov: 38, showGUI: true},

    nightSky: true,
    useGlobe: true,
    starScale: 0.3,

    // CSSTrack: {kind: "DataTrackFromSat", sat: "CSS (TIANHE-1)", secsBefore: 1000, secsAfter: 1000,},
    // displayCSSTrack: {kind: "DisplayTrack", track: "CSSTrack"}



}
