
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

    videoView: {left: 0.5, top: 0, width: -9 / 16, height: 1,},

    focusTracks: {
        "Ground (No Track)": "default",
        "Jet track": "cameraTrack",
        "Target Track": "targetTrack",
        "Other Track": "KMLOtherTarget",
    },

    showAltitude: true,
    defaultCameraDist: 3000000,  // for SitKML stuff we generalyl want a large camera distance for defaults
    targetSize: 10000,
    skyColor: "rgb(0%,0%,10%)",

    labelView: {id:"labelVideo", overlay: "lookView"},

    // setup: function() {
    //     // // displaying the target model or sphere
    //     // // model will be rotated by the wind vector
    //     // if (!Sit.landingLights) {
    //     // } else {
    //     //     // Has landingLights
    //     //     // landing lights are just a sphere scaled by the distance and the view angle
    //     //     // (i.e. you get a brighter light if it's shining at the camera
    //     //     if (NodeMan.exists("targetTrackAverage")) {
    //     //         new CNodeDisplayLandingLights({
    //     //             inputs: {
    //     //                 track: "targetTrackAverage",
    //     //                 cameraTrack: "cameraTrack",
    //     //                 size: new CNodeScale("sizeScaled", scaleF2M,
    //     //                     new CNodeGUIValue({
    //     //                         value: Sit.targetSize,
    //     //                         start: 1000,
    //     //                         end: 20000,
    //     //                         step: 0.1,
    //     //                         desc: "Landing Light Scale"
    //     //                     }, gui)
    //     //                 )
    //     //             },
    //     //             layers: LAYER.MASK_LOOK,
    //     //         })
    //     //     }
    //     // }
    //
    //
    //     // var viewNar = NodeMan.get("lookView");
    //     // viewNar.renderFunction = function (frame) {
    //     //
    //     //     // // extract camera angle
    //     //     // var _x = V3()
    //     //     // var _y = V3()
    //     //     // var _z = V3()
    //     //     // this.camera.matrix.extractBasis(_x, _y, _z)  // matrix or matrixWorld? parent is GlobalScene, so
    //     //     // var heading = -degrees(Math.atan2(_z.x, _z.z))
    //     //     // if (heading < 0) heading += 180;
    //     //     // par.az = heading;
    //     //
    //     //     if (this.visible) {
    //     //         if (this.effectsEnabled)
    //     //             this.composer.render();
    //     //         else
    //     //             this.renderer.render(GlobalScene, this.camera);
    //     //     }
    //     // }
    //
    //
    // },

    // update: function(f) {
    //     const lookCamera = NodeMan.get("lookCamera")
    //     const lookPos = lookCamera.camera.position;
    //     const altMeters = pointAltitude(lookPos)
    //
    //     par.cameraAlt = altMeters;
    // }

}
