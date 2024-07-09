export const SitArea6 = {
    name: "area6",
    menuName: "Area 6",
    isTextable: true,


    files: {
        starLink: "area6/starlink-area6.txt",
    },
    videoFile: "../sitrec-videos/private/Area6-1x-speed-08-05-2023 0644UTC.mp4",

    units: "Imperial",

    fps: 29.97,
    frames: 19480, // (10*60+50)*29.97,
    startTime: "2023-08-05T07:39:13.000Z",

    starScale: 1,

    terrain: {lat: 36.208582, lon: -115.984598, zoom: 12, nTiles: 8},
    targetSpeedMax: 100,

    marks: [
        //       {LL: {lat:50.197944,lon:-5.428180}, width: 1, color:0xffff00},
    ],
    mainCamera: {
        far:    80000000,
        startCameraPosition: [41177.15, 35874.31, 182331.95],
        startCameraTarget: [40980.64, 35831.97, 181352.36],
    },

    mainView:{left:0.0, top:0, width:0.50,height:1,background:'#132d44',},

    lookCamera: {fov: 10, far: 80000000, },
    lookView: {left:0.5, top:0.5, width:-1.792,height:0.5,background:'#132d44',},
    lookPosition: { fromLat: 36.208582, fromLon: -115.984598, fromAltFeet: 2700, fromAltMin: 0, framAltMax: 55000,},

    ptz: {az: -6.2, el: 9.8, fov: 11.8, showGUI: true},

    videoView: {left: 0.5, top: 0, height: 0.5, width: -1.777777 },
    labelView: {id:"labelVideo", overlay: "lookView"},
    DisplayCameraFrustum: {radius:100000},

    nightSky: true,
    useGlobe: true,

    compassMain: {kind: "CompassUI", camera: "mainCamera", left: 0.0, top: 0.90, width: -1, height: 0.1},

    lighting: {
        kind: "Lighting",
        ambientIntensity: 0.17,
    },

}
