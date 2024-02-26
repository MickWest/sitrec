
export const SitMaussan = {
    include_pvs14: true,
    name: "maussan",
    menuName: "Maussan Starlink",

    targetSize: 200, // in feet

    nightSky: true,
    useGlobe: true,
    useDayNightGlobe: true,

    simSpeed: 25,

    starScale: 0.65,

    nearClip: 1,
    farClipLook: 6800*1000,
    nearClipLook: 1,

    frames: 790, // currently needs manual setting

    lat:  27.89,
    lon: -104.69,

    files: {
        cameraFile: 'maussan/VB7083-32eca57a-1.kml',
        starLink: 'maussan/Maussan-Starlink-TLEs.txt'
    },
    videoFile: "../sitrec-videos/private/Maussan-video.mp4",
    startTime: "2023-11-22T02:51:34.000Z",
    mainCamera: {
        far:    50000000,
        startCameraPosition: [2718556.11, 2470980.84, -26052.36],
        startCameraTarget: [2717804.95, 2470341.84, -26217.95],
    },
    lookCamera:{ fov: 62},
    cameraTrack: {},

    lookView: { left: 0.70, top: 0.35, width: -480/852, height: 0.65,background:'#000000'},
    videoView: { left: 0.5, top: 0.35, width: -480/852, height: 0.65},
    mainView:{left:0.0, top:0, width:1,height:1,background:'#000000'},

    skyColor: '#AFBDD1',  // grey from the video
    ptz: {az: -89.2, el: -6.6, fov: 53.2, showGUI: true},


}