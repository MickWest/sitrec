import {Color, DirectionalLight, HemisphereLight, PerspectiveCamera, Vector3} from "../../three.js/build/three.module";
import {CNodeView3D} from "../nodes/CNodeView3D";
import * as THREE from "../../three.js/build/three.module";
import {par} from "../par";
import {setGlobalPTZ, Sit} from "../Globals";
import {CNodeConstant} from "../nodes/CNode";
import {LLAToEUSMAP, wgs84} from "../LLA-ECEF-ENU";
import {CNodeTerrain} from "../nodes/CNodeTerrain";
import {CNodeDisplayTrack} from "../nodes/CNodeDisplayTrack";
import * as LAYER from "../LayerMasks";
import {CNodeLOSTrackTarget} from "../nodes/CNodeLOSTrackTarget";
import {CNodeDisplayTargetSphere} from "../nodes/CNodeDisplayTargetSphere";
import {CNodeScale} from "../nodes/CNodeScale";
import {
    abs,
    atan,
    degrees,
    floor,
    getArrayValueFromFrame,
    metersFromMiles,
    radians,
    scaleF2M,
    tan,
    utcDate
} from "../utils";
import {CNodeGUIValue, makeCNodeGUIValue} from "../nodes/CNodeGUIValue";
import {CNodeDisplayTrackToTrack} from "../nodes/CNodeDisplayTrackToTrack";
import {CNodeViewUI} from "../nodes/CNodeViewUI";
import {ViewMan} from "../nodes/CNodeView";
import {CNodeDisplayLandingLights} from "../nodes/CNodeDisplayLandingLights";
import {CNodeVideoWebCodecView} from "../nodes/CNodeVideoWebCodec";
import {GlobalScene, LocalFrame} from "../LocalFrame";
import {gui, guiTweaks, } from "../Globals";
import {NodeMan} from "../Globals";
import {SetupGUIFrames} from "../JetGUI";
import {initKeyboard} from "../KeyBoardHandler";
import {MV3, V3} from "../threeExt";
import {CNodeDisplayLOS} from "../nodes/CNodeDisplayLOS";
import {addDefaultLights} from "../lighting";
import {FileManager} from "../CManager";
import {CNodeDisplayTargetModel} from "../nodes/CNodeDisplayTargetModel";
import {CNodeSmoothedPositionTrack} from "../nodes/CNodeTrack";
import {AddTimeDisplayToUI} from "../UIHelpers";
import {setMainCamera} from "../Globals";
import {PTZControls} from "../PTZControls";
import {CNodeCamera, CNodeCameraTrackAzEl, CNodeCameraTrackToTrack} from "../nodes/CNodeCamera";


export const SitKML = {
    name: "kml",
   // it's a root Sitch, not meant to be used alone, but we can't flag it as "hidden"
    // because that would get inherited - so, we just leave menuName undefined
    // which has the same effect
    azSlider: false,
    jetStuff: false,
    animated: true,
    fps: 30,

    lookFOV: 10,

    tilt: -15,

    defaultCameraDist: 30000,  // for SitKML stuff we generalyl want a large camera distance for defaults

    targetSize: 10000,

    planeCameraFOV:60,

    brightness: 20,

    // this is an override for the mainview setup
    mainView:{left:0.0, top:0, width:.50,height:1},

    skyColor: "rgb(0%,0%,10%)",

//
    setup: function() {

        SetupGUIFrames()

        var mainCamera = new PerspectiveCamera( par.mainFOV, window.innerWidth / window.innerHeight, this.nearClip, this.farClip );
//        var mainCamera = new PerspectiveCamera( par.mainFOV, window.innerWidth / window.innerHeight, 1, 5000000 );
        mainCamera.position.copy(MV3(Sit.startCameraPosition));  //
        mainCamera.lookAt(MV3(Sit.startCameraTarget));
        mainCamera.layers.enable(LAYER.HELPERS)
        setMainCamera(mainCamera); // setting the global value, enabling keyboard controls, etc.

        gui.add(par, 'mainFOV', 0.35, 80, 0.01).onChange(value => {
            mainCamera.fov = value
            mainCamera.updateProjectionMatrix()
        }).listen().name("Main FOV")

        // Duplicate from SetupCommon, but using gui not guiTweaks
        new CNodeConstant({id:"radiusMiles", value: wgs84.radiusMiles})

        if (this.terrain !== undefined) {
            new CNodeTerrain({
                id: "TerrainModel",
                radiusMiles: "radiusMiles", // constant
                //terrain:this.terrain,
                lat: this.terrain.lat,
                lon: this.terrain.lon,
                zoom: this.terrain.zoom,
                nTiles: this.terrain.nTiles,
                tileSegments: this.terrain.tileSegments ?? 100,
            }, mainCamera)
        }

        const view = new CNodeView3D(Object.assign({
            id:"mainView",
            //     draggable:true,resizable:true,
            left:0.0, top:0, width:.5,height:1,
            fov: 50,
            background: Sit.skyColor,
            camera: mainCamera,

            renderFunction: function() {
                this.renderer.render(GlobalScene, this.camera);
            },

            focusTracks:{
                "Ground (No Track)": "default",
                "Jet track": "KMLTrack",
                "Target Track": "KMLTarget",
                "Other Track": "KMLOther",
            },

        }, Sit.mainView))

        view.addOrbitControls(this.renderer);

        addDefaultLights(Sit.brightness)

        /*
        new CNodeKMLTrack({
            id:"KMLTrack",
            KMLFile: "KMLFile",
        })
         new CNodeKMLDataTrack({
            id:"KMLMainData",
            KMLFile: "KMLFile",
        })


        new ({
            id:"KMLTarget",
            KMLFile: "KMLTarget",
        })


        new CNodeKMLDataTrack({
            id:"KMLTargetData",
            KMLFile: "KMLTarget",
        })

*/
// this is equivalent to the above

        // can we do some additional parsing here?
        // like:
        // {"KMLTrack","KMLTrack", {"KMLFile":"KMLFile"}},
        NodeMan.createNodesJSON(`
            [
                {"new":"KMLDataTrack",  "id":"KMLMainData",     "KMLFile":"KMLFile"},
                {"new":"KMLTrack",      "id":"KMLTrack",        "KMLData":"KMLMainData"}, 
                {"new":"KMLDataTrack",  "id":"KMLTargetData",   "KMLFile":"KMLTarget"},
                {"new":"KMLTrack",      "id":"KMLTarget",       "KMLData":"KMLTargetData"},
            ]`);


        // The moving average smoothed target KML track
        // new CNodeSmoothedPositionTrack({ id:"KMLTargetAverage",
        //     source: "KMLTarget",
        //     smooth: new CNodeGUIValue({value: 200, start:1, end:500, step:1, desc:"Target Smooth Window"},gui),
        //     iterations: new CNodeGUIValue({value: 6, start:1, end:100, step:1, desc:"Target Smooth Iterations"},gui),
        // })

        new CNodeSmoothedPositionTrack({ id:"KMLTargetAverage",
            source: "KMLTarget",
            // new spline based smoothing in 3D
            method:"catmull",
//            method:"chordal",
//            intervals: new CNodeGUIValue({value: 119, start:1, end:200, step:1, desc:"Catmull Intervals"},gui),
            intervals: new CNodeGUIValue({value: 20, start:1, end:200, step:1, desc:"Catmull Intervals"},gui),
            tension: new CNodeGUIValue({value: 0.5, start:0, end:5, step:0.001, desc:"Catmull Tension"},gui),
        })


        if (FileManager.exists("KMLOther")) {
            NodeMan.createNodesJSON(`
            [
                {"new":"KMLDataTrack",  "id":"KMLOtherData",   "KMLFile":"KMLOther"},
                {"new":"KMLTrack",      "id":"KMLOther",       "KMLData":"KMLOtherData"},
            ]`);

            new CNodeDisplayTrack({
                id: "KMLDisplayOtherData",
                track: "KMLOtherData",
                color: new CNodeConstant({value: new THREE.Color(1, 0, 0)}),
                dropColor: new CNodeConstant({value: new THREE.Color(0.8, 0.6, 0)}),
                width: 1,
         //       toGround: 1, // spacing for lines to ground
                ignoreAB: true,
            })

            // Spheres displayed in the main view (helpers)
            new CNodeDisplayTargetSphere({
                track: "KMLOther",
                size: 2000, color: "blue", layers: LAYER.MASK_HELPERS,
            })


            // plae-sized sphere displaye din look view
            new CNodeDisplayTargetSphere({
                inputs: {
                    track: "KMLOther",
                    cameraTrack: "KMLTrack",
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
                layers: LAYER.MASK_NARONLY,
            })
        }

        // maybe a simolified format like:
        // {type, optional id, optional parameters in order, optional named parameters}
        // first parameter is always the type
        // id
        // everyhting is comma separated? (what about vectors or strings?)
        //
        // {KMLTrack, KMlFile} => {"new":"KMLTrack", "id":"KMLTrack","KMLFile":"KMLFile"}
        // {KMLTrack, KMlFile} => {"new":"KMLTrack", "id":"KMLTrack","KMLFile":"KMLFile"}

        //animated segement of camera track
        new CNodeDisplayTrack({
            id:"KMLDisplay",
            track: "KMLTrack",
            color: new CNodeConstant({value: new THREE.Color(1, 1, 0)}),
            width: 2,
            layers:LAYER.MASK_HELPERS,
        })

        new CNodeDisplayTrack({
            id:"KMLDisplayMainData",
            track: "KMLMainData",
            color: new CNodeConstant({value: new THREE.Color(0.7, 0.7, 0)}),
            dropColor: new CNodeConstant({value: new THREE.Color(0.6, 0.6, 0)}),
            width: 1,
        //    toGround:1, // spacing for lines to ground
            ignoreAB:true,
            layers:LAYER.MASK_HELPERS,
        })

        // Segment of target track that's covered by the animation
        // here a thicker red track segment
        new CNodeDisplayTrack({
            id:"KMLDisplayTarget",
            track: "KMLTargetAverage",
            color: new CNodeConstant({value: new THREE.Color(1, 0, 0)}),
            width: 4,
        //    toGround:5*30, // spacing for lines to ground
            layers:LAYER.MASK_HELPERS,
        })

        new CNodeDisplayTrack({
            id:"KMLDisplayTargetData",
            track: "KMLTargetData",
            color: new CNodeConstant({value: new THREE.Color(1, 0, 0)}),
            dropColor: new CNodeConstant({value: new THREE.Color(0.8, 0.6, 0)}),
            width: 1,
      //      toGround:1, // spacing for lines to ground
            ignoreAB:true,
            layers:LAYER.MASK_HELPERS,
        }),


        // Data for all the lines of sight
        // NOT CURRENTLY USED in the KML sitches where we track one KML from another.
        new CNodeLOSTrackTarget({
            id:"JetLOS",
            cameraTrack: "KMLTrack",
            targetTrack: "KMLTargetAverage",
            layers:LAYER.MASK_HELPERS,
        })

        // DISPLAY The line from the camera track to the target track
        new CNodeDisplayTrackToTrack({
            id: "DisplayLOS",
            cameraTrack: "KMLTrack",
            targetTrack: "KMLTargetAverage",
            color: new CNodeConstant({value:new THREE.Color(1,1,1)}),
            width: 1,
            layers:LAYER.MASK_HELPERS,
        })


        if (!Sit.landingLights) {

            // optional target model
            if (Sit.targetObject) {
                new CNodeDisplayTargetModel({
                    track: "KMLTargetAverage",
                    TargetObjectFile: Sit.targetObject.file,
                    layers: LAYER.MASK_NAR,
                })
            } else {

                new CNodeDisplayTargetSphere({
                    inputs: {
                        track: "KMLTargetAverage",
                        cameraTrack: "KMLTrack",
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
                    layers: LAYER.MASK_NARONLY,
                })
            }


        }else {
            // landing lights are just a sphere scaled by the distance and the view angle
            // (i.e. you get a brighter light if it's shining at the camera
            new CNodeDisplayLandingLights({
                inputs: {
                    track: "KMLTargetAverage",
                    cameraTrack: "KMLTrack",
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
                layers: LAYER.MASK_NARONLY,
            })
        }


        // Spheres displayed in the main view (helpers)
        new CNodeDisplayTargetSphere({
            track: "KMLTargetAverage",
            size: 2000, color: "blue", layers:LAYER.MASK_HELPERS,
        })
        new CNodeDisplayTargetSphere({
            track: "KMLTrack",
            size: 2000, color: "yellow", layers:LAYER.MASK_HELPERS,
        })


    //     var NARCamera = new THREE.PerspectiveCamera( this.planeCameraFOV, window.innerWidth / window.innerHeight, this.nearClipNAR, this.farClipNAR );
    // //    NARCamera.layers.disable(LAYER.main)
    //     NARCamera.layers.enable(LAYER.NAR)
    //     NARCamera.lookAt(new THREE.Vector3(0,0,-1));
    //     this.lookCamera = NARCamera
    //

        if (this.lookFOV !== undefined) {
            //this.lookCamera = new PerspectiveCamera(this.lookFOV, window.innerWidth / window.innerHeight, 1, Sit.farClipNAR);

            const lookCameraDefaults = {
                id: "lookCamera",
                fov: this.planeCameraFOV,
                aspect: window.innerWidth / window.innerHeight,
                near: this.nearClipNAR,
                far: this.farClipNAR,
                layers: LAYER.MASK_NARONLY,

            }

            if (this.ptz) {
                new CNodeCameraTrackAzEl({
                    ...lookCameraDefaults,

                    cameraTrack: "KMLTrack",

                })
            } else {
                new CNodeCameraTrackToTrack({
                    ...lookCameraDefaults,

                    cameraTrack: "KMLTrack",
                    targetTrack: "KMLTargetAverage",
                    tilt: makeCNodeGUIValue("tilt", Sit.tilt ?? 0, -30, 30, 0.01, "Tilt", gui),

                })
            }

            this.lookCamera = NodeMan.get("lookCamera").camera // TEMPORARY
        }


            if (this.ptz) {
            setGlobalPTZ(new PTZControls({
                    az: this.ptz.az, el: this.ptz.el, fov: this.ptz.fov, roll: this.ptz.roll, camera: this.lookCamera, showGUI: this.ptz.showGUI
                },
                gui
            ))
        }

        var viewNar;

        if (this.ptz) {
            viewNar = new CNodeView3D(Object.assign({
                id: "NARCam",
                draggable: true, resizable: true,
                left: 0.75, top: 0, width: -9 / 16, height: 1,
                camera: this.lookCamera,
                //cameraTrack: "KMLTrack",
                doubleClickFullScreen: false,
                background: new Color('#132d44'),
            }, Sit.narView))
        }
        else {
                viewNar = new CNodeView3D(Object.assign({
                id: "NARCam",
                visible: true,
                draggable: true, resizable: true, freeAspect: true,

                left: 0.75, top: 0, width: -9 / 16, height: 1,
                background: Sit.skyColor,
                up: [0, 1, 0],
                radiusMiles: "radiusMiles", // constant
                syncVideoZoom: true,

                // patch in the FLIR shader effect if flagged, for Chilean
                // Note this has to be handled in the render function if you override it
                // See Chilean for example
                effects: this.useFLIRShader ? { FLIRShader: {},} : undefined,


                camera: NodeMan.get("lookCamera").camera,  // PATCH

                renderFunction: function (frame) {
                    // bit of a patch to get in the FOV
                    if (Sit.chileanData !== undefined) {
                        // frame, mode, Focal Leng
                        var focalLength = getArrayValueFromFrame(Sit.chileanData, 0, 2, frame)
                        var mode = getArrayValueFromFrame(Sit.chileanData, 0, 1, frame)

                        // See: https://www.metabunk.org/threads/the-shape-and-size-of-glare-around-bright-lights-or-ir-heat-sources.10596/post-300052
                        var vFOV = 2 * degrees(atan(675 * tan(radians(0.915 / 2)) / focalLength))

                        if (mode !== "IR") {
//                        vFOV *= 584/884;
                            // 2 actually seems exactly right....
                            vFOV /= 2;  /// <<<< TODO - figure out the exact correction. IR is right, but EOW/EON is too wide
                        }
//                        console.log(focalLength + " -> " + vFOV)
                        this.camera.fov = vFOV;
                        this.camera.updateProjectionMatrix()
                    }

                    // PATCH look at a point
                    if (Sit.toLat !== undefined) {
                        // This is a PATCH, but handle cases with no radius
                        // which is probably all of them
                        // as we are using a terrain, hence WGS84
                        var radius = wgs84.RADIUS
                        if (this.in.radiusMiles != undefined) {
                            metersFromMiles(this.in.radiusMiles.v0)
                        }
                        var to = LLAToEUSMAP(Sit.toLat,
                            Sit.toLon,
                            Sit.toAlt,
                            radius
                        )
                        this.camera.lookAt(to)
                        if (this.in.tilt !== undefined) {
                            const tilt = this.in.tilt.v0
                            this.camera.rotateX(-radians(tilt))
                        }
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


                },

            }, Sit.narView))
        }


        var labelVideo = new CNodeViewUI({id:"labelVideo", overlayView:ViewMan.list.NARCam.data});
        AddTimeDisplayToUI(labelVideo, 50,96, 2.5, "#f0f000")
        labelVideo.addText("az", "35° L", 47, 7).listen(par, "az", function (value) {
            this.text = "Az "+ (floor(0.499999+abs(value))) + "° " //+ (value > 0 ? "R" : "L");
        })
        labelVideo.setVisible(true)

        gui.add(this, 'planeCameraFOV', 0.35, 80, 0.01).onChange(value => {
            this.lookCamera.fov = value
            this.lookCamera.updateProjectionMatrix()
        }).listen().name("Plane Camera FOV")

        if (Sit.videoFile !== undefined) {
            new CNodeVideoWebCodecView(Object.assign({
                    id: "video",
                    inputs: {
                        zoom: new CNodeGUIValue({
                            id: "videoZoom",
                            value: 100, start: 100, end: 2000, step: 1,
                            desc: "Video Zoom %"
                        }, gui)
                    },
                    visible: true,
                    left: 0.5, top: 0, width: -9 / 16, height: 1,
                    draggable: true, resizable: true,
                    frames: Sit.frames,
                    videoSpeed: Sit.videoSpeed,
                    file: Sit.videoFile,

                },Sit.videoView)
            )
        }

        initKeyboard();

    }

}
