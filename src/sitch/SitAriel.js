export const SitAriel = {
    name: "ariel",
    menuName: "Ariel School",
    isTextable: true,

    fps: 29.97,
    frames: 7027,
    aFrame: 0,
    bFrame: 6000,

    lookCamera: {
        fov: 10,
    },

    mainCamera: {
        startCameraPosition: [-350.3905323693817, 1759.7688109547591, 1046.7086472689589],
        startCameraTarget: [-302.94075973211767, 1451.3044752321168, 96.65692622222502],
    },
    mainView: {left:0.0, top:0, width:1,height:1,background:[0.53, 0.81, 0.92]},

    startDistance: 1,
    startDistanceMax: 6,
    startDistanceMin: 0.1,

    targetSpeed: 10,
    targetSpeedMin: 0,
    targetSpeedMax: 100,

    // Ariel
     terrain: {lat: -17.863574, lon: 31.290858, zoom: 15, nTiles: 3, tileSegments: 256},

}
