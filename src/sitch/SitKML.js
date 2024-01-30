import {par} from "../par";
import {setGlobalPTZ, Sit} from "../Globals";
import {CNodeConstant, makePositionLLA} from "../nodes/CNode";
import {CNodeDisplayTrack} from "../nodes/CNodeDisplayTrack";
import * as LAYER from "../LayerMasks";
import {CNodeDisplayTargetSphere, CNodeLOSTargetAtDistance} from "../nodes/CNodeDisplayTargetSphere";
import {CNodeScale} from "../nodes/CNodeScale";
import {
    abs, assert,
    atan,
    degrees,
    floor,
    getArrayValueFromFrame,
    radians,
    scaleF2M,
    tan,
} from "../utils";
import {CNodeGUIValue, makeCNodeGUIValue} from "../nodes/CNodeGUIValue";
import {CNodeDisplayTrackToTrack} from "../nodes/CNodeDisplayTrackToTrack";
import {CNodeViewUI} from "../nodes/CNodeViewUI";
import {ViewMan} from "../nodes/CNodeView";
import {CNodeDisplayLandingLights} from "../nodes/CNodeDisplayLandingLights";
import {GlobalScene} from "../LocalFrame";
import {gui} from "../Globals";
import {NodeMan} from "../Globals";
import {SetupGUIFrames} from "../JetGUI";
import {initKeyboard} from "../KeyBoardHandler";
import {V3} from "../threeExt";
import {addDefaultLights} from "../lighting";
import {CNodeDisplayTargetModel} from "../nodes/CNodeDisplayTargetModel";
import {CNodeSmoothedPositionTrack, makeTrackFromDataFile} from "../nodes/CNodeTrack";
import {AddTimeDisplayToUI} from "../UIHelpers";
import {PTZControls} from "../PTZControls";
import {pointAltitude} from "../SphericalMath";
import {CNodeSplineEditor} from "../nodes/CNodeSplineEdit";
import {FileManager} from "../CFileManager";
import {Color} from "three";


export const SitKML = {
    name: "kml",
   // it's a root Sitch, not meant to be used alone, but we can't flag it as "hidden"
    // because that would get inherited - so, we just leave menuName undefined
    // which has the same effect
    azSlider: false,
    jetStuff: false,
    animated: true,
    fps: 30,

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

    tilt: -15,  //Not a good default!

    defaultCameraDist: 30000,  // for SitKML stuff we generalyl want a large camera distance for defaults

    targetSize: 10000,

    // this is an override for the mainview setup
    // mainView:{left:0.0, top:0, width:.50,height:1},

    skyColor: "rgb(0%,0%,10%)",

    setup: function() {

        SetupGUIFrames()

        Sit.setupWind()

        const view = NodeMan.get("mainView");

        view.addOrbitControls(this.renderer);

        addDefaultLights(Sit.brightness)

        // Sit.makeCameraTrack();

        if (FileManager.exists("KMLTarget")) {
            makeTrackFromDataFile("KMLTarget", "KMLTargetData", "targetTrack")
        }

        // The moving average smoothed target KML track
        // new CNodeSmoothedPositionTrack({ id:"targetTrackAverage",
        //     source: "targetTrack",
        //     smooth: new CNodeGUIValue({value: 200, start:1, end:500, step:1, desc:"Target Smooth Window"},gui),
        //     iterations: new CNodeGUIValue({value: 6, start:1, end:100, step:1, desc:"Target Smooth Iterations"},gui),
        // })

        if (NodeMan.exists("targetTrack")) {
            new CNodeSmoothedPositionTrack({
                id: "targetTrackAverage",
                source: "targetTrack",
                // new spline based smoothing in 3D
                method: "catmull",
//            method:"chordal",
                intervals: new CNodeGUIValue({value: 20, start: 1, end: 200, step: 1, desc: "Catmull Intervals"}, gui),
                tension: new CNodeGUIValue({value: 0.5, start: 0, end: 5, step: 0.001, desc: "Catmull Tension"}, gui),
            })
        }



        // KMLOther is currently only used in ITY621
        if (FileManager.exists("KMLOther")) {
            NodeMan.createNodesJSON(`
            [
                {"new":"KMLDataTrack",  "id":"KMLOtherData",   "KMLFile":"KMLOther"},
                {"new":"TrackFromTimed",      "id":"KMLOtherTarget",       "timedData":"KMLOtherData"},
            ]`);

            new CNodeDisplayTrack({
                id: "KMLDisplayOtherData",
                track: "KMLOtherData",
                color: new CNodeConstant({value: new Color(1, 0, 0)}),
                dropColor: new CNodeConstant({value: new Color(0.8, 0.6, 0)}),
                width: 1,
                //       toGround: 1, // spacing for lines to ground
                ignoreAB: true,
            })

            // Spheres displayed in the main view (helpers)
            new CNodeDisplayTargetSphere({
                track: "KMLOtherTarget",
                size: 2000, color: "blue", layers: LAYER.MASK_HELPERS,
            })


            // plae-sized sphere displaye din look view
            new CNodeDisplayTargetSphere({
                inputs: {
                    track: "KMLOtherTarget",
                    cameraTrack: "cameraTrack",
                    size: new CNodeScale("sizeScaledOther", scaleF2M,
                        new CNodeGUIValue({
                            value: Sit.targetSize,
                            start: 1,
                            end: 1000,
                            step: 0.1,
                            desc: "Other size ft"
                        }, gui)
                    )
                },
                layers: LAYER.MASK_LOOK,
            })
        }


        // The camera track data would be the extended track data from the KML
        // The actual track used is a smoothed subset of this
        if (NodeMan.exists("cameraTrackData")) {
            new CNodeDisplayTrack({
                id: "KMLDisplayMainData",
                track: "cameraTrackData",
                color: new CNodeConstant({value: new Color(0.7, 0.3, 0)}),
                dropColor: new CNodeConstant({value: new Color(0.6, 0.6, 0)}),
                width: 1,
                //    toGround:1, // spacing for lines to ground
                ignoreAB: true,
                layers: LAYER.MASK_HELPERS,
            })
        }

        // The smoothed target track
        if (NodeMan.exists("targetTrackAverage")) {
            // Segment of target track that's covered by the animation
            // here a thicker red track segment
            new CNodeDisplayTrack({
                id: "KMLDisplayTarget",
                track: "targetTrackAverage",
                color: new CNodeConstant({value: new Color(1, 0, 0)}),
                width: 4,
                //    toGround:5*30, // spacing for lines to ground
                layers: LAYER.MASK_HELPERS,
            })
        }

        // Target data from the KML - i.e. the entire track, sparse points, as downloaded for an ADS-B provider
        if (NodeMan.exists("KMLTargetData")) {
            new CNodeDisplayTrack({
                id: "KMLDisplayTargetData",
                track: "KMLTargetData",
                color: new CNodeConstant({value: new Color(1, 0, 0)}),
                dropColor: new CNodeConstant({value: new Color(0.8, 0.6, 0)}),
                width: 1,
                //      toGround:1, // spacing for lines to ground
                ignoreAB: true,
                layers: LAYER.MASK_HELPERS,
            })
        }


        // display white line from camera track to target track
        if (NodeMan.exists("targetTrackAverage")) {
            // DISPLAY The line from the camera track to the target track
            new CNodeDisplayTrackToTrack({
                id: "DisplayLOS",
                cameraTrack: "cameraTrack",
                targetTrack: "targetTrackAverage",
                color: new CNodeConstant({value: new Color(1, 1, 1)}),
                width: 1,
                layers: LAYER.MASK_HELPERS,
            })
        }


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

        // Much larger HELPER spheres in the main view for target track and camera track
        if (NodeMan.exists("targetTrackAverage")) {
            // Spheres displayed in the main view (helpers)
            new CNodeDisplayTargetSphere({
                track: "targetTrackAverage",
                size: this.cameraSphereSize, color: "blue", layers: LAYER.MASK_HELPERS,
            })
        }

        new CNodeDisplayTargetSphere({
            track: "cameraTrack",
            size: this.cameraSphereSize, color: "yellow", layers: LAYER.MASK_HELPERS,
        })


        if (NodeMan.exists("lookCamera")) {

            // right now everything has a look camera

            const cameraNode = NodeMan.get("lookCamera")

            if (this.ptz) {
                cameraNode.addController("TrackAzEl",{
                        sourceTrack: "cameraTrack",
                    })

            } else {

                if (NodeMan.exists("targetTrackAverage")) {

                    cameraNode.addController("TrackToTrack", {
                        sourceTrack: "cameraTrack",
                        targetTrack: "targetTrackAverage",
                    })
                } else {
                    cameraNode.addController("TrackAzEl", {
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

            if (!this.ptz) {
                NodeMan.get("lookCamera").addController("Tilt", {
                    tilt: makeCNodeGUIValue("tilt", Sit.tilt ?? 0, -30, 30, 0.01, "Tilt", gui),
                })
            }

       }


        if (this.ptz) {
            setGlobalPTZ(new PTZControls({
                    az: this.ptz.az,
                    el: this.ptz.el,
                    fov: this.ptz.fov,
                    roll: this.ptz.roll,
                    camera: "lookCamera",
                    showGUI: this.ptz.showGUI
                },
                gui
            ))
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


        var labelVideo = new CNodeViewUI({id: "labelVideo", overlayView: ViewMan.list.lookView.data});
        AddTimeDisplayToUI(labelVideo, 50, 96, this.timeSize ?? 2.5, "#f0f000")

        if (this.showAz) {
            labelVideo.addText("az", "35° L", 47, 7).listen(par, "az", function (value) {
                this.text = "Az " + (floor(0.499999 + abs(value))) + "° " //+ (value > 0 ? "R" : "L");
            })
        }

        if (this.showAltitude) {
            labelVideo.addText("alt", "---", 20, 7).listen(par, "cameraAlt", function (value) {
                this.text = "Alt " + (floor(0.499999 + abs(value))) + "m";
            })
        }


        labelVideo.setVisible(true)

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

        initKeyboard();
    },

    update: function(f) {
        const lookCamera = NodeMan.get("lookCamera")
        const lookPos = lookCamera.camera.position;
        const altMeters = pointAltitude(lookPos)

        par.cameraAlt = altMeters;
    }


}
