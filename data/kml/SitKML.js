
export const SitKML = {
    name: "kml",
   // it's a root Sitch, not meant to be used alone, but we can't flag it as "hidden"
    // because that would get inherited - so, we just leave menuName undefined
    // which has the same effect
    fps: 30,
    isSitKML: true,

    terrain: {},

    lookCamera: {
        fov: 10, // this is the default, but we can override it with a new lookCamera object
    },

    // we add empty defintions to define the order of in which things are created
    // other sitches that uses this as a base class must override these
    // we need mainView specifically as some things use it when created
    mainCamera: {},
    mainView: {},  // Mainview is first, as it's often full-screen
    lookView: {},

    videoView: {left: 0.5, top: 0, width: -0.5625, height: 1,},

    focusTracks: {
        "Ground (No Track)": "default",
        "Jet track": "cameraTrack",
        "Target Track": "targetTrack",
//        "Other Track": "KMLOtherTarget",
    },

    showAltitude: true,
    defaultCameraDist: 3000000,  // for SitKML stuff we generalyl want a large camera distance for defaults
    targetSize: 10000,
    skyColor: "rgb(0%,0%,10%)",

    labelView: {id:"labelVideo", overlay: "lookView"},

    include_Compasses: true,

}
