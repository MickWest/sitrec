// SitTrackWithAngles.js is a sitch that lets the user drop in
// a track file and a video file, and then displays the track
// the initial location and time are extracted from the track file
// a track file can be any of the following:
// - a CSV file with columns for time, lat, lon, alt, heading
// - a KLV file with the same columns
// existing sitches that resemble this are:
// - SitFolsom.js (DJI drone track)
// - SitPorterville.js (DJI Drone track)
// - SitMISB.js (MISB track)
// - SitJellyfish (simple user spline track) (MAYBE)


sitch = {
    name: "trackwithangles",
    menuName: "Track with Angles",

    lat: 40, lon: -100,

    lookCamera: {fov: 10, near: 1, far: 8000000},
    mainCamera: {fov: 30, near: 1, far: 60000000,
        startCameraPositionLLA:[28.908829,-113.996881,24072381.100864],
        startCameraTargetLLA:[28.908812,-113.996897,24071381.163374],
    },

    videoView: {left: 0.5, top: 0, width: -1.7927, height: 0.5, autoClear:false},
    mainView: {left: 0.0, top: 0, width: 0.5, height: 1, background: '#200000'},
    lookView: {left: 0.5, top: 0.5, width: -1.7927, height: 0.5, background: '#000020'},

    dragDropHandler: true,
    useGlobe: true,

}