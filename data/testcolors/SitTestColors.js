export const SitSWRCSC = {
    name: "testcolors",                    // the name of the sitch, which we can use with "include_"
    menuName: "test colors",   // Name displayed in the menu
    isTextable: true,               // true if we can export and edit this sitch as a custom sitch
    isTool: true,
    localOnly: true,

    startTime: "2021-10-25T02:05:16.000Z",

    fps: 29.97,
    frames: 3000,

    files: {
    },

    // TEST
    lat: 40.2572028, lon: -109.893759,

    // Terrain Lat/Lon is the center of the map
    // zoom is the zoom level of the map (1-15 for Mapbox)
    // nTiles is the size of the square region to load (in tiles, so here 4x4)
    // tileSegments is optional in the range 1..256 and is the resolution of the height map
    terrain: {lat: 40.2572028, lon: -109.893759, zoom: 14, nTiles: 4, tileSegments: 256, mapType: "RGBTest"},

    // this laser shoudld be the same orange-brown color as the two cubes
    laser1: {kind: "LaserMarker", lat:  40.257024, lon: -109.893159, // center of triangle
        height: {kind:"GUIValue", value:50000, start:1, end: 200000, step:100, desc: "Laser Height"},
        color: "#FF8040",
    //    color: [1.0,0.75,0.50],
        weight: 30,
        radius: {kind:"GUIValue", value:38, start:0, end: 100, step:0.1, desc: "Laser Radius"},
        angle: {kind:"GUIValue", value:-27, start:-180, end: 180, step:1, desc: "Laser Angle"},
        sides: {kind:"GUIValue", value:3, start:0, end: 20, step:1, desc: "Number of Lasers"},
        halveColors: true, // a debug test ot halve each laser color
    },


    // a single camera, with the position and heading define by two LLA points
    mainCamera: {
        far:    80000000,
        startCameraPositionLLA:[40.212236,-109.854956,5552.028441],
        startCameraTargetLLA:[40.218933,-109.860489,5081.177911],
    },

    // a full screen view. The size and position are fractions of the window size
    // background is the color of the sky.
    mainView: {left:0.0, top:0, width:0.5,height:1, background:'#132d44',
        // effects:{
        //     Copy:{},
        // }
    },

    lookCamera: {fov: 10, far: 80000000, },
    lookView: {left:0.5, top:0.5, width:-1.792,height:0.5,background:'#132d44', doubleClickFullScreen: true,},
    lookPosition: { fromLat: 40.2576896691347, fromLon: -109.88881130294267, fromAltFeet: 4932, fromAltMin: 4900, framAltMax: 5500,},

    manualPositionController: {kind:"ManualPosition", object: "lookCamera", aboveGround: 3},

    labelView: {id:"labelVideo", overlay: "lookView"},
    DisplayCameraFrustum: {radius:100000},




//    ptz: {az: -70.773, el: 56.8872, fov: 38, roll: 0, showGUI: true},
    ptz: {az: -96.4, el: 80, fov: 72, roll: 0, showGUI: true},


    nightSky: true,
    useGlobe: true,
    starScale: 0.9,
    satScale: 3,
    showSatelliteTracks: true,


    // Maybe later
    // CSSTrack: {kind: "SatDataTrack", sat: "CSS (TIANHE-1)", secsBefore: 1000, secsAfter: 1000,},
    // displayCSSTrack: {kind: "DisplayTrack", track: "CSSTrack"}

    colorCube1: {kind: "textureCube", url:'data/images/colour_bars_srgb-255-128-64.png?v=1',
        size: 1500,
        position:[0,2400,0],
    },

    // three shades of same color, calculated with color.clone().multiplyScalar(0.5) (or 0.25)

    // this is an orange brown one, so the Digital color meter sRGB values should be
    // red: 255, 128, 64 (correct)
    // green: 128, 64, 32 (correct)
    // blue : 64, 32, 16  (is 15, not 16, color meter inaccuracy)
    colorCube2: {kind: "colorCube", color: "#FF8040", size: 500, position:[0,3500,0],},

    // Same colors set manually (with 16 for the last blue, not 15)
    colorCube3: {kind: "colorCube", color: ["#FF8040","#804020","#402010"], size: 500, position:[1000,3500,0],},

}
