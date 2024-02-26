
export const SitHulsey = {
    include_kml: true,
    name: "hulsey",
    menuName: "Hulsey Starlink",


    nightSky: true,
    landingLights:true,
    useGlobe: true,

    // maybe have these in CSituation
    nearClip: 1,
    farClipLook: 6800*1000,
    nearClipLook: 1,

    starScale: 0.44,

    frames: 623,
    terrain: {lat: 34.001856, lon: -118.806196, zoom: 9, nTiles: 8},
//    lat: 34.001856, lon: -118.806196,

    files: {
        cameraFile: 'hulsey/N67WV-track-EGM96.kml',
        KMLTarget: "hulsey/FlightAware_N702GH_KSJC_KLAX_20220818.kml",
        starLink: "hulsey/Starlink-2022-08-16 to 17 Hulsey.txt"
    },
    videoFile: "../sitrec-videos/private/19min clip showing land - 01.mp4",
    startTime: "2022-08-18T07:20:52.000Z",

    mainCamera: {
        far:    50000000,
        startCameraPosition: [-29111.506164711383, 68091.7505344188, 149221.43786749756],
        startCameraTarget: [-29082.08960581131, 67711.97280864988, 148296.8279253748],
    },

    // with a ptz setup, add showGUI:true to allow changing it
    // then can set it to false once the settings are locked in
     ptz: {az: -6.5, el: 14.1, fov: 68.2, roll:6.2, showGUI: true},
     lookCamera: {
        fov: 20,
    },
    cameraTrack: {},
    followTrack: {},
    mainView:{left:0.0, top:0, width:.50,height:1},

    DisplayCameraFrustum: {radius:100000},


}