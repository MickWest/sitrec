export const SitSWR = {
    name: "swr",                    // the name of the sitch, which we can use with "include_"
    menuName: "Skinwalker Ranch",   // Name displayed in the menu
    isTextable: true,               // true if we can export and edit this sitch as a custom sitch

    // Terrain Lat/Lon is the center of the map
    // zoom is the zoom level of the map (1-15 for Mapbox)
    // nTiles is the size of the square region to load (in tiles, so here 4x4)
    // tileSegments is optional in the range 1..256 and is the resolution of the height map
    terrain: {lat: 40.2572028, lon: -109.893759, zoom: 14, nTiles: 4, tileSegments: 256},

    // a single camera, with the position and heading define by two LLA points
    mainCamera: {
        startCameraPositionLLA:[40.254018,-109.880925,1685.104643],
        startCameraTargetLLA:[40.257957,-109.891099,1439.697690],
    },

    canvasResolution: {kind: "GUIValue", value: 1600, start: 10, end: 2000, step: 1, desc: "Resolution"},

    // a full screen view. The size and position are fractions of the window size
    // background is the color of the sky.
    mainView: {left:0.0, top:0, width:1,height:1, background: [0.53, 0.81, 0.92],
        canvasWidth: "canvasResolution", canvasHeight: "canvasResolution",
      //   effects: ["FLIRShader", "hBlur", "vBlur", "zoom"],
      // //   effects: ["FLIRShader", "hBlur"],
      //    inputs: {
      //       hBlur: {kind: "GUIValue", value: 0.2, start: 0.0, end: 1.0, step: 0.01, desc: "Blur Horizontal"},
      //       vBlur: {kind: "GUIValue", value: 0.2, start: 0.0, end: 1.0, step: 0.01, desc: "Blur Vertical"},
      //       zoom: {kind: "GUIValue", value: 100, start: 20, end: 2000.0, step: 0.01, desc: "Pixel Zoom"},
      //   },
    effects: {
        // these are nodes, but simplifed setup
        // so we have the shader name, and the uniforms
        // note some shaders nodes require extra calculations, like for resolution
//        FLIRShader: {},
        hBlur: {
            inputs: {
                h: {kind: "GUIValue", value: 0.2, start: 0.0, end: 1.0, step: 0.01, desc: "Blur Horizontal"}
            }
        },
        Copy: {},
    }


    },
}
