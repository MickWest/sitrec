import {CNodeView, mouseInViewOnly, ViewMan} from "./CNodeView";
import {par} from "../par";
import {assert, f2m, m2f, vdump} from "../utils";
import {XYZ2EA, XYZJ2PR} from "../SphericalMath";
import {GlobalComposer, gui, keyHeld, NodeMan, Sit} from "../Globals";
import {GlobalNightSkyScene, GlobalScene} from "../LocalFrame";
import {} from "../Globals"
import {makeMouseRay} from "../mouseMoveView";
import {
    Raycaster,
    Sprite,
    SpriteMaterial,
    TextureLoader,
    Plane,
    Vector3,
    WebGLRenderer, Camera
} from "../../three.js/build/three.module";
import {DebugArrowAB, V3} from "../threeExt";
import {CNodeViewCanvas, CNodeViewCanvas2D} from "./CNodeViewCanvas";

import { EffectComposer } from '../../three.js/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../../three.js/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass} from '../../three.js/examples/jsm/postprocessing/ShaderPass.js';
import { FLIRShader } from '../shaders/FLIRShader'
import {sharedUniforms} from "../js/map33/material/QuadTextureMaterial";
import {
    BoxGeometry,
    Color, Mesh, MeshBasicMaterial,
    NearestFilter,
    PerspectiveCamera, PlaneGeometry,
    RGBAFormat,
    Scene, ShaderMaterial,
    Sphere,
    Vector2,
    WebGLRenderTarget
} from "three";
import {wgs84} from "../LLA-ECEF-ENU";
import {getCameraNode} from "./CNodeCamera";
import {HorizontalBlurShader} from "../../three.js/examples/jsm/shaders/HorizontalBlurShader";
import {VerticalBlurShader} from "../../three.js/examples/jsm/shaders/VerticalBlurShader";
import {ZoomShader} from "../shaders/ZoomShader";
import {Pixelate2x2Shader, PixelateNxNShader} from "../shaders/Pixelate2x2Shader";
import {StaticNoiseShader} from "../shaders/StaticNoiseShader";

export class CNodeView3D extends CNodeViewCanvas {
    constructor(v) {

        assert(v.camera !== undefined, "Missing Camera creating CNodeView 3D, id="+v.id)

        // strip out the camera, as we don't want it in the super
        // as there's conflict with the getter
        const v_camera = v.camera
        delete v.camera;

        super(v);

        this.syncVideoZoom = v.syncVideoZoom ?? false;  // by default, don't sync the zoom with the video view, as we might not have a zoom controlelr
        this.syncPixelZoomWithVideo = v.syncPixelZoomWithVideo ?? false;
        this.background = v.background ?? new Color(0x000000);

        // check if this.background is an array, and if so, convert to a color
        if (this.background instanceof Array) {
            this.background = new Color(this.background[0], this.background[1], this.background[2])
        }

        this.scene = GlobalScene;

        // Cameras were passing in as a node, but now we just pass in the camera node
        // which could be a node, or a node ID.

        this.cameraNode = getCameraNode(v_camera)

        assert(this.cameraNode !== undefined, "CNodeView3D needs a camera Node")
        assert(this.camera !== undefined, "CNodeView3D needs a camera")

        this.canDisplayNightSky = true;
        this.mouseEnabled = true; // by defualt

        // When using a logorithmic depth buffer (or any really)
        // need to ensure the near/far clip distances are propogated to custom shaders

        console.log(" devicePixelRatio = "+window.devicePixelRatio+" canvas.width = "+this.canvas.width+" canvas.height = "+this.canvas.height)
        console.log("Window inner width = "+window.innerWidth+" height = "+window.innerHeight)

        // this.renderer = new WebGLRenderer({antialias: true, canvas: this.canvas, logarithmicDepthBuffer: true})
        //
        // if (this.in.canvasWidth) {
        //     // if a fixed pixel size canvas, then we ignore the devicePixelRatio
        //     this.renderer.setPixelRatio(1);
        // } else {
        //     this.renderer.setPixelRatio(window.devicePixelRatio);
        // }

        // this.renderer.setSize(this.widthPx, this.heightPx, false); // false means don't update the style
        // this.composer = new EffectComposer(this.renderer)
        // const renderPass = new RenderPass( GlobalScene, this.camera );
        // this.composer.addPass( renderPass );

        this.setupRenderPipeline(v);


        this.addEffects(v.effects)
        this.otherSetup(v);


        this.recalculate(); // to set the effect pass uniforms

    }


    setupRenderPipeline(v) {
        this.setFromDiv(this.div); // This will set the widthDiv, heightDiv

        // Determine canvas dimensions
        if (this.in.canvasWidth !== undefined) {
            this.widthPx = this.in.canvasWidth.v0;
            this.heightPx = this.in.canvasHeight.v0;
        } else {
            this.widthPx = this.widthDiv * window.devicePixelRatio;
            this.heightPx = this.heightDiv * window.devicePixelRatio;
        }
        this.canvas.width = this.widthPx;
        this.canvas.height = this.heightPx;

        // Create the renderer
        this.renderer = new WebGLRenderer({ antialias: true, canvas: this.canvas, logarithmicDepthBuffer: true });
        this.renderer.setPixelRatio(this.in.canvasWidth ? 1 : window.devicePixelRatio);
        this.renderer.setSize(this.widthDiv, this.heightDiv, false);

        // Create the primary render target with the desired size
        this.renderTarget = new WebGLRenderTarget(this.widthPx, this.heightPx, {
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            format: RGBAFormat
        });

        // Create the temporary render target with the desired size
        this.tempRenderTarget = new WebGLRenderTarget(this.widthPx, this.heightPx, {
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            format: RGBAFormat
        });

        // Ensure GlobalScene and this.camera are defined
        if (!GlobalScene || !this.camera) {
            console.error("GlobalScene or this.camera is not defined.");
            return;
        }

        // Shader material for copying texture
        this.copyMaterial = new ShaderMaterial({
            uniforms: {
                'tDiffuse': { value: null }
            },
            vertexShader: /* glsl */`
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `,
            fragmentShader: /* glsl */`
            uniform sampler2D tDiffuse;
            varying vec2 vUv;
            void main() {
                gl_FragColor = texture2D(tDiffuse, vUv);
            }
        `
        });

        // Fullscreen quad for rendering shaders
        const geometry = new PlaneGeometry(2, 2);
        this.fullscreenQuad = new Mesh(geometry, this.copyMaterial);

        this.effectPasses = {};

        // Default render function if none provided
        // other functions will still call this, but might do something before and after
        // as well as coming from v, some old sitches directly override this, eg agua
        if (v.renderFunction === undefined) {
            this.renderFunction = () => {
                this.defaultRenderFunction();
            }
        }
    }


    defaultRenderFunction() {
    {

        if (this.visible) {

            if (!this.effectsEnabled) {
                this.renderer.setRenderTarget(null);
                this.renderer.clear(true, true, true);
                this.renderer.render(GlobalScene, this.camera);
                return;
            }


            this.renderTarget.setSize(this.in.canvasWidth.v0, this.in.canvasHeight.v0);
            // Clear the primary render target
            this.renderer.setRenderTarget(this.renderTarget);
            this.renderer.clear(true, true, true);

            // Render the scene to the off-screen render target
            this.renderer.render(GlobalScene, this.camera);
            this.renderer.setRenderTarget(null);

            // Apply each effect pass sequentially
            let currentRenderTarget = this.renderTarget;
            for (let effectName in this.effectPasses) {
                let effectPass = this.effectPasses[effectName];
                effectPass.uniforms['tDiffuse'].value = currentRenderTarget.texture;
                // flip the render targets
                this.renderer.setRenderTarget(currentRenderTarget === this.renderTarget ? this.tempRenderTarget : this.renderTarget);
                this.renderer.clear(true, true, true);
                this.fullscreenQuad.material = effectPass.material;  // Set the material to the current effect pass
                this.renderer.render(this.fullscreenQuad, new Camera());
                currentRenderTarget = currentRenderTarget === this.renderTarget ? this.tempRenderTarget : this.renderTarget;
            }

            // Render the final texture to the screen
            this.copyMaterial.uniforms['tDiffuse'].value = currentRenderTarget.texture;
            this.fullscreenQuad.material = this.copyMaterial;  // Set the material to the copy material
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.fullscreenQuad, new Camera());
        }
    }
}




    otherSetup(v)
    {
        this.raycaster = new Raycaster();
        assert(this.scene, "CNodeView3D needs global GlobalScene")

        const spriteCrosshairMaterial = new SpriteMaterial({
            map: new TextureLoader().load('data/images/crosshairs.png'),
            color: 0xffffff, sizeAttenuation: false,
            depthTest: false, // no depth buffer, so it's always on top
            depthWrite: false,
        });
        this.cursorSprite = new Sprite(spriteCrosshairMaterial)
        this.cursorSprite.position.set(0, 25000, -50)
        this.cursorSprite.scale.setScalar(0.02)
        this.cursorSprite.visible = false;
        GlobalScene.add(this.cursorSprite)
        this.mouseDown = false;
        this.dragMode = 0;

        this.showLOSArrow = v.showLOSArrow;
        this.showCursor = v.showCursor;

        this.defaultTargetHeight = v.defaultTargetHeight ?? 0

        this.focusTrackName = "default"
        this.lockTrackName = "default"
        if (v.focusTracks) {
            this.addFocusTracks(v.focusTracks);
        }
    }


    addEffects(effects)
    {
        if (effects) {
            this.effects = effects;

            this.effectPasses = []
            for (var effect of this.effects) {
                var aPass;
                switch (effect) {
                    case "FLIRShader":
                        this.addEffectPass(effect, new ShaderPass(FLIRShader))
                        break;

                    case "hBlur":
                        aPass = new ShaderPass(HorizontalBlurShader)
                        this.addEffectPass(effect, aPass)
                        break;

                    case "vBlur":
                        this.addEffectPass(effect, new ShaderPass(VerticalBlurShader))
                        break

                    case "pixelZoom":
                    case "digitalZoom":
                        this.addEffectPass(effect, new ShaderPass(ZoomShader))
                        break

                    case "Pixelate2x2":
                        this.addEffectPass(effect, new ShaderPass(Pixelate2x2Shader))
                        break;

                    case "PixelateNxN":
                        this.addEffectPass(effect, new ShaderPass(PixelateNxNShader))
                        break;

                    case "StaticNoise":
                         this.addEffectPass(effect, new ShaderPass(StaticNoiseShader))
                        break;

                    default:
                        assert(0,"Effect "+effect+" not found for "+this.id)
                }
            }
            this.effectsEnabled = true;
            gui.add(this,"effectsEnabled").name("Effects").onChange(()=>{par.renderOne=true})
        }
    }


    addEffectPass(effectName, effect) {
        this.effectPasses[effectName] = effect;
//        this.composer.addPass(effect);
        return effect;
    }

    updateWH() {
        super.updateWH();
        this.recalculate()
    }

    recalculate() {
        super.recalculate();
        this.needUpdate = true;
    }


    updateEffects() {
        // Go through the effect passes and update their uniforms and anything else needed
        if (this.effects) {
            for (var effect of this.effects) {
                var aPass = this.effectPasses[effect];
                switch (effect) {
                    case "hBlur":
                        if (aPass.uniforms['h'].value !== (this.in.hBlur.v0) / this.heightPx) {
                            aPass.uniforms['h'].value = (this.in.hBlur.v0) / this.heightPx;
                            aPass.material.needsUpdate = true;
                        }
                        break;
                    case "vBlur":
                        if (aPass.uniforms['v'].value !== (this.in.vBlur.v0) / this.widthPx) {
                            aPass.uniforms['v'].value = (this.in.vBlur.v0) / this.widthPx;
                            aPass.material.needsUpdate = true;
                        }
                        break;
                    case "pixelZoom":
                        let pixelZoom = this.in.pixelZoom.v0;

                        let magnifyFactor = pixelZoom / 100;
                        if (aPass.uniforms['magnifyFactor'].value !== magnifyFactor) {
                            aPass.uniforms['magnifyFactor'].value = magnifyFactor;
                            aPass.material.needsUpdate = true;
                        }
                        break;

                        // digitalZoom is something the camera can control
                        // it's seperate from pixelZoom as it's intended
                        // to simulate a digital zoom, on the internal camera data
                        // before other effects are applied
                        // the pixelZoom is for scaling the end result
                    case "digitalZoom":

                        let digitalZoom = this.in.digitalZoom.v0;

                        // Check for digital zoom, like from CNodeControllerATFLIRCamera
                        if (this.in.digitalZoom.digitalZoom !== undefined) {
                            // Will probably be 1 or 2
                            digitalZoom *= this.in.digitalZoom.digitalZoom;
                        }

                        let magnifyFactorDigital = digitalZoom / 100;
                        if (aPass.uniforms['magnifyFactor'].value !== magnifyFactorDigital) {
                            aPass.uniforms['magnifyFactor'].value = magnifyFactorDigital;
                            aPass.material.needsUpdate = true;
                        }
                        break;




                    case "Pixelate2x2":
                        let resolution = new Vector2(this.widthPx, this.heightPx);
                        if (!aPass.uniforms['resolution'].value.equals(resolution)) {
                            aPass.uniforms['resolution'].value.copy(resolution);
                            aPass.material.needsUpdate = true;
                        }
                        break;
                    case "PixelateNxN":
                        let resolutionN = new Vector2(this.widthPx, this.heightPx);
                        if (!aPass.uniforms['resolution'].value.equals(resolutionN)) {
                            aPass.uniforms['resolution'].value.copy(resolutionN);
                            aPass.material.needsUpdate = true;
                        }
                        if (aPass.uniforms['blockSize'].value !== this.in.blockSize.v0) {
                            aPass.uniforms['blockSize'].value = this.in.blockSize.v0;
                            aPass.material.needsUpdate = true;
                        }
                        break;

                    case "StaticNoise":
                        if (aPass.uniforms['time'].value !== par.frame) {
                            aPass.uniforms['time'].value = par.frame;
                            aPass.material.needsUpdate = true;
                        }
                        break;


                    default:
                        // They don't all need uniforms
                        // assert(0, "Effect " + effect + " not found for " + this.id)
                        break;
                }
            }
        }
    }


    modSerialize() {
        return {
            ...super.modSerialize(),
            focusTrackName: this.focusTrackName,
            lockTrackName: this.lockTrackName
        }

    }

    modDeserialize(v) {
        super.modDeserialize(v)
        if (v.focusTrackName !== undefined) this.focusTrackName = v.focusTrackName
        if (v.lockTrackName  !== undefined) this.lockTrackName  = v.lockTrackName
    }

    dispose() {
        super.dispose();
        this.renderer.dispose();
        this.renderer = null;
        if (this.composer !== undefined) this.composer.dispose();
        this.composer = null;

    }

    // todo - change to nodes, so we can add and remove them
    // for the custom sitch
    addFocusTracks(focusTracks) {
        this.focusTrackName = "default"
        this.lockTrackName = "default"
        gui.add(this, "focusTrackName", focusTracks).onChange(focusTrackName => {
            //
        }).name("Focus Track").listen()
        gui.add(this, "lockTrackName", focusTracks).onChange(lockTrackName => {
            //
            console.log(this.lockTrackName)
        }).name("Lock Track").listen()
    }

    get camera() {
        return this.cameraNode.camera;
    }

    render(frame) {

        if (this.needUpdate) {
            this.updateEffects();
            this.needUpdate = false;
        }

        sharedUniforms.nearPlane.value = this.camera.near;
        sharedUniforms.farPlane.value = this.camera.far;

        const windowWidth  = window.innerWidth;
        const windowHeight = window.innerHeight;

    //    this.adjustSize()

        // the adjustSize used by a 2D canvas does not work, so we multiply by window.devicePixelRatio
        // perhaps we need to do something different with this.renderer.setSize ??????
  //      this.canvas.width = this.div.clientWidth*window.devicePixelRatio
  //      this.canvas.height = this.div.clientHeight*window.devicePixelRatio


        var divW = this.div.clientWidth;
        var divH = this.div.clientHeight;
  //      console.log("div: "+divW+","+divH+" Canvas: "+this.canvas.width+","+this.canvas.height)


        // Note that renderer.setSize will set the rendering size
        // to the input multiplied by the devicePixelRatio
        // we generally specify the size of things in nominal pixels (not device pixels)
        // if we were to use 1920x1080, then the renderer would be 3840x2160
        // which is normally fine, but we need to make sure the camera aspect is correct
        // BUT, in the past, we halved the value here

//        this.renderer.setSize(this.widthPx, this.heightPx, false); // false means don't update the style

        this.camera.aspect = this.canvas.width/this.canvas.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setClearColor(this.background);
        // Clear manually, otherwise the second render will clear the background.
        // note: old code used pixelratio to handle retina displays, no longer needed.
         this.renderer.autoClear = false;

         if (this.background) this.renderer.clear();

        // test hook up render the world twice, but from a different position

        if (this.canDisplayNightSky && GlobalNightSkyScene !== undefined) {

            // we need to call this twice (once again in the super's render)
            // so the camera is correct for the celestial sphere
            // which is rendered before the main scene
            // but uses the same camera
            this.preRenderCameraUpdate()

            // // scale the sprites one for each viewport
            const nightSkyNode = NodeMan.get("NightSkyNode")
            nightSkyNode.updateSatelliteScales(this.camera)


            var tempPos = this.camera.position.clone();
            this.camera.position.set(0, 0, 0)
            this.camera.updateMatrix();
            this.camera.updateMatrixWorld();
            this.renderer.render(GlobalNightSkyScene, this.camera);
            this.renderer.clearDepth()
            this.camera.position.copy(tempPos)
            this.camera.updateMatrix();
            this.camera.updateMatrixWorld();
        }
        super.render(frame)

    }


    onMouseUp() {
        if (!this.mouseEnabled) return;
        this.dragMode = 0;
        this.mouseDown = false;
//        console.log("Mouse Down = "+this.mouseDown+ " Drag mode = "+this.dragMode)
    }

    onMouseDown(event, mouseX, mouseY) {
        if (!this.mouseEnabled) return;

        // convert to coordinates relative to lower left of view
        var mouseYUp = this.heightPx - (mouseY-this.topPx)
        var mouseRay = makeMouseRay(this, mouseX, mouseYUp);

       // this.cursorSprite.position

        if (event.button === 1 && this.camera) {
            console.log("Center Click")

            if (NodeMan.exists("groundSplineEditor")) {
                const groundSpline = NodeMan.get("groundSplineEditor")
                if (groundSpline.enable) {
                    groundSpline.insertPoint(par.frame, this.cursorSprite.position)
                }
            }

            if (NodeMan.exists("ufoSplineEditor")) {
                this.raycaster.setFromCamera(mouseRay, this.camera);
                const ufoSpline = NodeMan.get("ufoSplineEditor")
                console.log(ufoSpline.enable)
                if (ufoSpline.enable) {
                    // it's both a track, and an editor
                    // so we first use it to pick a close point
                    var closest = ufoSpline.closestPointToRay(this.raycaster.ray).position

                    ufoSpline.insertPoint(par.frame, closest)
                }
            }
        }


        this.mouseDown = true;
//        console.log(this.id+"Mouse Down = "+this.mouseDown+ " Drag mode = "+this.dragMode)


        if (this.controls) {
//            this.controls.enabled = false;
//            console.log ("Click Disabled "+this.name)
        }

        // TODO, here I've hard-coded a check for mainView
        // but we might want similar controls in other views
        if (this.id === "mainView" && this.camera && mouseInViewOnly(this, mouseX, mouseY)) {





            this.raycaster.setFromCamera(mouseRay, this.camera);
            var intersects = this.raycaster.intersectObjects(this.scene.children, true);

            // debugText = ""

            /*

            // TODO: dragging spheres

            // we don't check the glare (green) sphere if it's locked to the white (target sphere)
            if (targetSphere.position.y !== glareSphere.position.y) {
                if (intersects.find(hit => hit.object == glareSphere) != undefined) {
                    // CLICKED ON THE green SPHERE
                    this.dragMode = 1;
                    // must pause, as we are controlling the pod now
                    par.paused = true;
                }
            }
            if (intersects.find(hit => hit.object == targetSphere) != undefined) {

                if (this.dragMode === 1) {
                    var glareSphereWorldPosition = glareSphere.getWorldPosition(new Vector3())
                    var targetSphereWorldPosition = targetSphere.getWorldPosition(new Vector3())
                    var distGlare = this.raycaster.ray.distanceSqToPoint(glareSphereWorldPosition)
                    var distTarget = this.raycaster.ray.distanceSqToPoint(targetSphereWorldPosition)
                    //console.log("glare = " + distGlare + " target = " + distTarget)
                    // already in mode 1 (glare)
                    // so only switch if targetGlare is closer to the ray
                    if (distTarget < distGlare)
                        this.dragMode = 2;
                } else {
                    this.dragMode = 2;
                }
                // must pause, as we are controlling the pod now
                par.paused = true;
            }
*/
        }
        if (this.dragMode === 0 && this.controls && mouseInViewOnly(this, mouseX, mouseY)) {
//            console.log ("Click re-Enabled "+this.id)
            // debugger
            // console.log(mouseInViewOnly(this, mouseX, mouseY))
  //          this.controls.enabled = true;
        }
    }

    onMouseMove(event, mouseX, mouseY) {
        if (!this.mouseEnabled) return;

//        console.log(this.id+" Mouse Move = "+this.mouseDown+ " Drag mode = "+this.dragMode)

   //     return;


        var mouseYUp = this.heightPx - (mouseY-this.topPx)
        var mouseRay = makeMouseRay(this, mouseX, mouseYUp);

        // For testing mouse position, just set dragMode to 1
        //  this.dragMode = 1;


// LOADS OF EXTERNAL STUFF


        if (this.mouseDown) {

            if (this.dragMode > 0) {
                // Dragging green or white (GIMBAL SPECIFIC, NOT USED
                this.raycaster.setFromCamera(mouseRay, this.camera);
                var intersects = this.raycaster.intersectObjects(this.scene.children, true);

                    console.log(`Mouse Move Dragging (${mouseX},${mouseY})`)

                //  debugText = ""
                var closestPoint = V3()
                var distance = 10000000000;
                var found = false;
                var spherePointWorldPosition = V3();
                if (this.dragMode == 1)
                    glareSphere.getWorldPosition(spherePointWorldPosition)
                else
                    targetSphere.getWorldPosition(spherePointWorldPosition)

                for (var i = 0; i < intersects.length; i++) {
                    if (intersects[i].object.name == "dragMesh") {
                        var sphereDistance = spherePointWorldPosition.distanceTo(intersects[i].point)
                        if (sphereDistance < distance) {
                            distance = sphereDistance;
                            closestPoint.copy(intersects[i].point);
                            found = true;
                        }
                    }
                }
                if (found) {
                    const closestPointLocal = LocalFrame.worldToLocal(closestPoint.clone())
                    if (this.dragMode == 1) {
                        // dragging green
                        var pitch, roll;
                        [pitch, roll] = XYZJ2PR(closestPointLocal, jetPitchFromFrame())
                        par.podPitchPhysical = pitch;
                        par.globalRoll = roll
                        par.podRollPhysical = par.globalRoll - NodeMan.get("bank").v(par.frame)
                        ChangedPR()
                    } else if (this.dragMode == 2) {
                        // dragging white
                        var el, az;
                        [el, az] = XYZ2EA(closestPointLocal)
                        // we want to keep it on the track, so are only changing Az, not El
                        // this is then converted to a frame number
                        par.az = az;
                        UIChangedAz();
                    }
                }
            }
        } else if (this.visible && this.camera && mouseInViewOnly(this, mouseX, mouseY)) {

            // moving mouse around ANY view with a camera

            this.raycaster.setFromCamera(mouseRay, this.camera);

            var closestPoint = V3()
            var found = false;
            if (NodeMan.exists("TerrainModel")) {
                let terrainNode = NodeMan.get("TerrainModel")
                const firstIntersect = terrainNode.getClosestIntersect(this.raycaster)
                if (firstIntersect) {
                    closestPoint.copy(firstIntersect.point)
                    found = true;
                }
            }

            let target;
            let targetIsTerrain = false;

            if (found) {
                targetIsTerrain = true;
                target = closestPoint.clone();
            } else {
                var possibleTarget = V3()
                this.raycaster.setFromCamera(mouseRay, this.camera);


             //   CONVERTO TO Sit.useGlobe

                if (1 || this.useGlobe) {
                    const dragSphere = new Sphere(new Vector3(0,-wgs84.RADIUS,0), wgs84.RADIUS /* + f2m(this.defaultTargetHeight) */ )
                    if (this.raycaster.ray.intersectSphere(dragSphere, possibleTarget)) {
                   //     console.log("dragSphere  HIT: " + possibleTarget.x + "," + possibleTarget.y + "," + possibleTarget.z + "<br>")
                        target = possibleTarget.clone()
                    }
                }else {

                    // Not found a collision with anything in the GlobalScene, so just collide with the 25,000 foot plane
                    const selectPlane = new Plane(new Vector3(0, -1, 0), f2m(this.defaultTargetHeight))

                    if (this.raycaster.ray.intersectPlane(selectPlane, possibleTarget)) {
                        target = possibleTarget.clone()
                    }
                }
            }

            // regardless of what we find above, if there's a focusTrackName, then snap to the closest point on that track
            if (this.focusTrackName !== "default") {
                var focusTrackNode = NodeMan.get(this.focusTrackName)

                var closestFrame = focusTrackNode.closestFrameToRay(this.raycaster.ray)
                target = focusTrackNode.p(closestFrame)

                if (keyHeld['meta']) {
                    par.frame = closestFrame
                    par.renderOne = true;
                }
            }


            if (target != undefined) {
                this.cursorSprite.position.copy(target)

                if (this.controls) {
                    this.controls.target = target
                    this.controls.targetIsTerrain = targetIsTerrain;
                }

                if (this.showLOSArrow) {
                    DebugArrowAB("LOS from Mouse", this.camera.position, target,0xffff00,true,GlobalScene,0)
                }
                par.renderOne = true;
            }

            // here we are just mouseing over the globe viewport
            // but the mouse it up
            // we want to allow rotation so it gets the first click.
     //           console.log("ENABLED controls "+this.id)
     //       this.controls.enabled = true;
        } else {
     //              console.log("DISABLED controls not just in "+this.id)
     //       if (this.controls) this.controls.enabled = false;
        }

    }


}


