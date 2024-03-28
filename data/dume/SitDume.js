
export const SitDume = {
    name: "dume",
    menuName: "Pt Dume -> Mt Jacinto",
    animated:false,
    isTextable: true,

    fps: 30,
    frames: 100,

    flattening: true,
    terrain: {lat:  34.001856, lon:-118.806196, zoom:9, nTiles:8},

    mainCamera: {
        startCameraPosition: [-43094.29665986946, 3824.242926331847, 422.4154566350642],
        startCameraTarget: [-42114.354308866445, 3638.0780342768676, 351.31256163886894],
    },
    mainView: {left: 0.0, top: 0, width: 0.5, height: 1,fov:50,background: [0.53, 0.81, 0.92]},

    lookCamera: {fov: 10,},
    lookView: {left: 0.5, top: 0, width: 0.5, height: 1,fov: 50, background: [0.53, 0.81, 0.92]},

    cameraTrack: {LLA: [34.001241, -118.806459, 140]},
    followTrack: {}, // will default to lookCamera and cameraTrack
    ptz: {az: 96.4, el: -0.3, fov: 4, showGUI: true},

}
