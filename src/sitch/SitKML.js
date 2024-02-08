import {par} from "../par";
import {Sit} from "../Globals";
import * as LAYER from "../LayerMasks";
import {CNodeDisplayTargetSphere, CNodeLOSTargetAtDistance} from "../nodes/CNodeDisplayTargetSphere";
import {CNodeScale} from "../nodes/CNodeScale";
import {
    atan,
    degrees,
    getArrayValueFromFrame,
    radians,
    scaleF2M,
    tan,
} from "../utils";
import {CNodeGUIValue, makeCNodeGUIValue} from "../nodes/CNodeGUIValue";
import {CNodeDisplayLandingLights} from "../nodes/CNodeDisplayLandingLights";
import {GlobalScene} from "../LocalFrame";
import {gui} from "../Globals";
import {NodeMan} from "../Globals";
import {initKeyboard} from "../KeyBoardHandler";
import {V3} from "../threeExt";
import {addDefaultLights} from "../lighting";
import {CNodeDisplayTargetModel} from "../nodes/CNodeDisplayTargetModel";
import {pointAltitude} from "../SphericalMath";


export const SitKML = {
    name: "kml",
   // it's a root Sitch, not meant to be used alone, but we can't flag it as "hidden"
    // because that would get inherited - so, we just leave menuName undefined
    // which has the same effect
    azSlider: false,
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

 //   tilt: -15,  //Not a good default!

    defaultCameraDist: 3000000,  // for SitKML stuff we generalyl want a large camera distance for defaults

    targetSize: 10000,


    skyColor: "rgb(0%,0%,10%)",

    labelView: {id:"labelVideo", overlay: "lookView"},

    setup: function() {

        addDefaultLights(Sit.brightness)
        initKeyboard();

        Sit.setupWind()

        const view = NodeMan.get("mainView");

        // displaying the target model or sphere
        // model will be rotated by the wind vector
        if (!Sit.landingLights) {

            let maybeWind = {};
            if (NodeMan.exists("targetWind")) {
                maybeWind = {
                    wind: "targetWind",
                }
            }

            if (NodeMan.exists("targetTrackAverage")) {
                // optional target model, like a plane
                if (Sit.targetObject) {
                    new CNodeDisplayTargetModel({
                        track: "targetTrackAverage",
                        TargetObjectFile: Sit.targetObject.file,
                        ...maybeWind,
                    })
                } else {
                // no target model, just a sphere, of adjustable size
                    new CNodeDisplayTargetSphere({
                        inputs: {
                            track: "targetTrackAverage",
                            cameraTrack: "cameraTrack",
                            size: new CNodeScale("sizeScaled", scaleF2M,
                                new CNodeGUIValue({
                                    value: Sit.targetSize,
                                    start: 1,
                                    end: 1000,
                                    step: 0.1,
                                    desc: "Target size ft"
                                }, gui)
                            )
                        },
                        layers: LAYER.MASK_LOOK,
                    })
                }
            }

        } else {
            // Has landingLights
            // landing lights are just a sphere scaled by the distance and the view angle
            // (i.e. you get a brighter light if it's shining at the camera
            if (NodeMan.exists("targetTrackAverage")) {
                new CNodeDisplayLandingLights({
                    inputs: {
                        track: "targetTrackAverage",
                        cameraTrack: "cameraTrack",
                        size: new CNodeScale("sizeScaled", scaleF2M,
                            new CNodeGUIValue({
                                value: Sit.targetSize,
                                start: 1000,
                                end: 20000,
                                step: 0.1,
                                desc: "Landing Light Scale"
                            }, gui)
                        )
                    },
                    layers: LAYER.MASK_LOOK,
                })
            }
        }

        // // Much larger HELPER spheres in the main view for target track and camera track
        // if (NodeMan.exists("targetTrackAverage")) {
        //     // Spheres displayed in the main view (helpers)
        //     new CNodeDisplayTargetSphere({
        //         track: "targetTrackAverage",
        //         size: this.cameraSphereSize, color: "blue", layers: LAYER.MASK_HELPERS,
        //     })
        // }
        //
        // new CNodeDisplayTargetSphere({
        //     track: "cameraTrack",
        //     size: this.cameraSphereSize, color: "yellow", layers: LAYER.MASK_HELPERS,
        // })


        if (NodeMan.exists("lookCamera")) {

            // right now everything has a look camera

            const cameraNode = NodeMan.get("lookCamera")

            if (this.ptz) {
                cameraNode.addController("TrackPosition",{
                        sourceTrack: "cameraTrack",
                    })

            } else {

                if (NodeMan.exists("targetTrackAverage")) {

                    cameraNode.addController("TrackToTrack", {
                        sourceTrack: "cameraTrack",
                        targetTrack: "targetTrackAverage",
                    })
                } else {
                    cameraNode.addController("TrackPosition", {
                        sourceTrack: "cameraTrack",
                    })
                }
            }

            // if there's a focal length field in the camera track, then use it
            const cameraTrack = NodeMan.get("cameraTrack")
            const focal_len = cameraTrack.v(0).focal_len;
            if (focal_len !== undefined) {
                console.warn("Skipping legacy focal length controller generation")
                // NodeMan.get("lookCamera").addController("FocalLength", {
                //     focalLength: "cameraTrack",
                // })
            }

            if (Sit.toLat !== undefined) {
                NodeMan.get("lookCamera").addController("LookAtLLA", {
                  lat: Sit.toLat,
                  lon: Sit.toLon,
                  alt: Sit.toAlt,
                })
            }

       }



        var viewNar = NodeMan.get("lookView");

        if (this.ptz) {

        } else {

            // patch in the FLIR shader effect if flagged, for Chilean
            // Note this has to be handled in the render function if you override it
            // See Chilean for example
            viewNar.effects = this.useFLIRShader ? {FLIRShader: {},} : undefined,


            viewNar.renderFunction = function (frame) {

                // THERE ARE THREE CAMERA MODIFIED IN HERE - EXTRACT OUT INTO Camera Nodes
                // MIGHT NEEED SEPERATE POSITION, ORIENTATION, AND ZOOM MODIFIERS?

                // bit of a patch to get in the FOV
                if (Sit.chileanData !== undefined) {
                    // frame, mode, Focal Leng
                    var focalLength = getArrayValueFromFrame(Sit.chileanData, 0, 2, frame)
                    const mode = getArrayValueFromFrame(Sit.chileanData, 0, 1, frame);

                    // See: https://www.metabunk.org/threads/the-shape-and-size-of-glare-around-bright-lights-or-ir-heat-sources.10596/post-300052
                    var vFOV = 2 * degrees(atan(675 * tan(radians(0.915 / 2)) / focalLength))

                    if (mode !== "IR") {
                        vFOV /= 2;  /// <<<< TODO - figure out the exact correction. IR is right, but EOW/EON is too wide
                    }
                    this.camera.fov = vFOV;
                    this.camera.updateProjectionMatrix()
                }

                // extract camera angle
                var _x = V3()
                var _y = V3()
                var _z = V3()
                this.camera.matrix.extractBasis(_x, _y, _z)  // matrix or matrixWorld? parent is GlobalScene, so

                var heading = -degrees(Math.atan2(_z.x, _z.z))
                if (heading < 0) heading += 180;
                par.az = heading;

                if (this.visible) {
                    if (this.effectsEnabled)
                        this.composer.render();
                    else
                        this.renderer.render(GlobalScene, this.camera);
                }
                //this.renderer.render(GlobalScene, this.camera);
            }

        }


        if (this.losTarget !== undefined) {

            let control = {};
            if (this.losTarget.distance) {
                new CNodeScale("controlLOS", scaleF2M,
                    new CNodeGUIValue({
                        value: this.losTarget.distance,
                        start: 1,
                        end: 100000,
                        step: 0.1,
                        desc: "LOS Sphere dist ft"
                    }, gui))
                control = { distance: "controlLOS" }
            } else if (this.losTarget.altitude) {
                new CNodeScale("controlLOS", scaleF2M,
                    new CNodeGUIValue({
                        value: this.losTarget.altitude,
                        start: 1,
                        end: 40000,
                        step: 0.1,
                        desc: "LOS Sphere alt ft"
                    }, gui))
                control = {altitude: "controlLOS"}
            }


            new CNodeLOSTargetAtDistance ({
                id:"LOSTargetTrack",
                track:this.losTarget.track,
                camera:this.losTarget.camera,
                ...control,
                frame:this.losTarget.frame,
                offsetRadians:radians(this.losTarget.offset),
            })

            new CNodeLOSTargetAtDistance ({
                id:"LOSTargetWithWindTrack",
                track:this.losTarget.track,
                camera:this.losTarget.camera,
//                distance:this.losTarget.distance,
                ...control,
                frame:this.losTarget.frame,
                offsetRadians:radians(this.losTarget.offset),
                wind:"objectWind",
            })

            new CNodeDisplayTargetSphere({
                track:"LOSTargetTrack",
                size: new CNodeScale("sizeScaledLOS", scaleF2M,
                    new CNodeGUIValue({value: this.losTarget.size, start: 0, end: 200, step: 0.01, desc: "LOS Sphere size ft"}, gui)
                ),
                layers: LAYER.MASK_LOOK,
                color: "#00c000"  // green fixed relative to ground
            })

            new CNodeDisplayTargetSphere({
                track:"LOSTargetWithWindTrack",
                size: "sizeScaledLOS",
                layers: LAYER.MASK_LOOK,
                color: "#00ffff"  // cyan = with wind
            })



        }

    },

    update: function(f) {
        const lookCamera = NodeMan.get("lookCamera")
        const lookPos = lookCamera.camera.position;
        const altMeters = pointAltitude(lookPos)

        par.cameraAlt = altMeters;
    }


}
