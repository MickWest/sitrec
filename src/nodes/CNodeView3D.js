import {mouseInViewOnly} from "./CNodeView";
import {par} from "../par";
import {f2m, normalizeLayerType} from "../utils";
import {XYZ2EA, XYZJ2PR} from "../SphericalMath";
import {Globals, gui, guiMenus, guiTweaks, keyHeld, NodeMan} from "../Globals";
import {GlobalDaySkyScene, GlobalNightSkyScene, GlobalScene} from "../LocalFrame";
import {makeMouseRay} from "../mouseMoveView";
import {
    ACESFilmicToneMapping,
    Camera,
    Color, FloatType,
    LinearFilter, LinearToneMapping,
    Mesh,
    NearestFilter,
    Plane,
    PlaneGeometry,
    Raycaster,
    RGBAFormat,
    ShaderMaterial,
    Sphere,
    Sprite,
    SpriteMaterial,
    SRGBColorSpace,
    TextureLoader, UniformsUtils,
    UnsignedByteType,
    Vector3,
    WebGLRenderer,
    WebGLRenderTarget
} from "three";
import {DebugArrowAB, forceFilterChange} from "../threeExt";
import {CNodeViewCanvas} from "./CNodeViewCanvas";
import {sharedUniforms} from "../js/map33/material/QuadTextureMaterial";
import {wgs84} from "../LLA-ECEF-ENU";
import {getCameraNode} from "./CNodeCamera";
import {CNodeEffect} from "./CNodeEffect";
import {assert} from "../assert.js";
import {V3} from "../threeUtils";
import {ACESFilmicToneMappingShader} from "../shaders/ACESFilmicToneMappingShader";
import {ShaderPass} from "three/addons/postprocessing/ShaderPass.js";
import {isLocal} from "../../config";


function linearToSrgb(color) {
    function toSrgbComponent(c) {
        return (c <= 0.0031308) ? 12.92 * c : 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055;
    }
    return new Color(
        toSrgbComponent(color.r),
        toSrgbComponent(color.g),
        toSrgbComponent(color.b)
    );
}

export class CNodeView3D extends CNodeViewCanvas {
    constructor(v) {

        assert(v.camera !== undefined, "Missing Camera creating CNodeView 3D, id="+v.id)

        // strip out the camera, as we don't want it in the super
        // as there's conflict with the getter
        const v_camera = v.camera
        delete v.camera;

        super(v);


        this.isIR = v.isIR ?? false;
        this.fovOverride = v.fovOverride;
        this.layers = normalizeLayerType(v.layers) ?? undefined; // leaving it undefined will use the camera layers


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

//        console.log(" devicePixelRatio = "+window.devicePixelRatio+" canvas.width = "+this.canvas.width+" canvas.height = "+this.canvas.height)
 //       console.log("Window inner width = "+window.innerWidth+" height = "+window.innerHeight)

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

    // return the viewport's hfov in radians
    // assumes the camera's fov is the viewport's vfov
    getHFOV() {
        const vfov = this.camera.fov * Math.PI / 180;
        const aspect = this.widthPx / this.heightPx;
        // given the vfov, and the aspect ratio, we can calculate the hfov
        return 2 * Math.atan(Math.tan(vfov / 2) * aspect);
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

        try {
            this.renderer = new WebGLRenderer({
                antialias: true,
                canvas: this.canvas,
                logarithmicDepthBuffer: true,
            });
        } catch (e) {
            console.error("Incompatible Browser or Graphics Acceleration Disabled\n Error creating WebGLRenderer: "+e)
            // show an alert
            alert("Incompatible Browser or Graphics Acceleration Disabled\n Error creating WebGLRenderer:\n "+e)


            return;
        }

        if (!isLocal) {
            console.warn("Disabling shader error checking for production performance");
            this.renderer.debug.checkShaderErrors = false;
        }

        this.renderer.setPixelRatio(this.in.canvasWidth ? 1 : window.devicePixelRatio);
        this.renderer.setSize(this.widthDiv, this.heightDiv, false);
        this.renderer.colorSpace = SRGBColorSpace;
        if (Globals.shadowsEnabled) {
            this.renderer.shadowMap.enabled = true;
        }
        if (!Globals.renderTargetAntiAliased) {
            // intial rendering is done to the renderTargetAntiAliased
            // which is anti-aliased with MSAA
            Globals.renderTargetAntiAliased = new WebGLRenderTarget(256, 256, {
                format: RGBAFormat,
                type: UnsignedByteType,
             //   type: FloatType, // Use FloatType for HDR
                colorSpace: SRGBColorSpace,
                minFilter: NearestFilter,
                magFilter: NearestFilter,
                samples: 4, // Number of samples for MSAA, usually 4 or 8
            });

            // Create the primary render target with the desired size
            Globals.renderTargetA = new WebGLRenderTarget(256, 256, {
                minFilter: NearestFilter,
                magFilter: NearestFilter,
                format: RGBAFormat,
                colorSpace: SRGBColorSpace,
            });

            // Create the temporary render target with the desired size
            Globals.renderTargetB = new WebGLRenderTarget(256, 256, {
                minFilter: NearestFilter,
                magFilter: NearestFilter,
                format: RGBAFormat,
                colorSpace: SRGBColorSpace,

            });
        }

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
                
                // Apply gamma correction to match sRGB encoding
                // https://discourse.threejs.org/t/different-color-output-when-rendering-to-webglrendertarget/57494
                // gl_FragColor = sRGBTransferOETF( gl_FragColor );
            }
        `
        });

        // Fullscreen quad for rendering shaders
        const geometry = new PlaneGeometry(2, 2);
        this.fullscreenQuad = new Mesh(geometry, this.copyMaterial);

        this.effectPasses = {};

        this.preRenderFunction = v.preRenderFunction ?? (() => {});
        this.postRenderFunction = v.postRenderFunction ?? (() => {});

    }


    renderTargetAndEffects() {
    {

        if (this.visible) {


            let currentRenderTarget = null; // if no effects, we render directly to the canvas

            //if (this.effectsEnabled) {
                if (this.in.canvasWidth !== undefined) {
                    Globals.renderTargetAntiAliased.setSize(this.in.canvasWidth.v0, this.in.canvasHeight.v0);
                    if (this.effectsEnabled) {
                        // often don't have effects on the main view
                        // so we don't need to create/resize these render targets
                        Globals.renderTargetA.setSize(this.in.canvasWidth.v0, this.in.canvasHeight.v0);
                        Globals.renderTargetB.setSize(this.in.canvasWidth.v0, this.in.canvasHeight.v0);
                    }
                } else {
                    Globals.renderTargetAntiAliased.setSize(this.widthPx, this.heightPx);
                    if (this.effectsEnabled) {
                        Globals.renderTargetA.setSize(this.widthPx, this.heightPx);
                        Globals.renderTargetB.setSize(this.widthPx, this.heightPx);
                    }
                }
                currentRenderTarget = Globals.renderTargetAntiAliased;
                this.renderer.setRenderTarget(currentRenderTarget);
            //}

/*
 maybe:
 - Render day sky to renderTargetA
 - Render night sky to renderTargetA (should have a black background)
 - Combine them both to renderTargetAntiAliased instead of clearing it
 - they will only need combining at dusk/dawn, using total light in the sky
 - then render the scene to renderTargetAntiAliased, and apply effects with A/B as before

 */




            // Render the celestial sphere
            if (this.canDisplayNightSky && GlobalNightSkyScene !== undefined) {

                // we need to call this twice (once again in the super's render)
                // so the camera is correct for the celestial sphere
                // which is rendered before the main scene
                // but uses the same camera
                this.preRenderCameraUpdate()

                // // scale the sprites one for each viewport
                const nightSkyNode = NodeMan.get("NightSkyNode")
                nightSkyNode.updateSatelliteScales(this.camera)


                this.renderer.setClearColor(this.background);
                if (nightSkyNode.useDayNight && nightSkyNode.skyColor !== undefined) {
                    this.renderer.setClearColor(nightSkyNode.skyColor);
                }
                this.renderer.clear(true, true, true);



                var tempPos = this.camera.position.clone();
                this.camera.position.set(0, 0, 0)
                this.camera.updateMatrix();
                this.camera.updateMatrixWorld();
                this.renderer.render(GlobalNightSkyScene, this.camera);
                this.renderer.clearDepth()
                this.camera.position.copy(tempPos)
                this.camera.updateMatrix();
                this.camera.updateMatrixWorld();
            } else {
                // clear the render target (or canvas) with the background color
                this.renderer.setClearColor(this.background);
                this.renderer.clear(true, true, true);
            }

            // render the day sky
            if (GlobalDaySkyScene !== undefined) {

                var tempPos = this.camera.position.clone();
                this.camera.position.set(0, 0, 0)
                this.camera.updateMatrix();
                this.camera.updateMatrixWorld();
                const oldTME = this.renderer.toneMappingExposure;
                const oldTM = this.renderer.toneMapping;

                // this.renderer.toneMapping = ACESFilmicToneMapping;
                // this.renderer.toneMappingExposure = NodeMan.get("theSky").effectController.exposure;
                this.renderer.render(GlobalDaySkyScene, this.camera);
                // this.renderer.toneMappingExposure = oldTME;
                // this.renderer.toneMapping = oldTM;

                this.renderer.clearDepth()
                this.camera.position.copy(tempPos)
                this.camera.updateMatrix();
                this.camera.updateMatrixWorld();


                // if tone mapping the sky, insert the tone mapping shader here

                // create the pass similar to in CNodeEffect.js
                // passing in a shader to the ShaderPass
                const acesFilmicToneMappingPass = new ShaderPass(ACESFilmicToneMappingShader);

// Set the exposure value
                acesFilmicToneMappingPass.uniforms['exposure'].value = NodeMan.get("theSky").effectController.exposure;

// test patch in the block of code from the effect loop
                acesFilmicToneMappingPass.uniforms['tDiffuse'].value = currentRenderTarget.texture;
                // flip the render targets
                const useRenderTarget = currentRenderTarget === Globals.renderTargetA ? Globals.renderTargetB : Globals.renderTargetA;

                this.renderer.setRenderTarget(useRenderTarget);
                this.fullscreenQuad.material = acesFilmicToneMappingPass.material;  // Set the material to the current effect pass
                this.renderer.render(this.fullscreenQuad, new Camera());
                this.renderer.clearDepth()

                currentRenderTarget = currentRenderTarget === Globals.renderTargetA ? Globals.renderTargetB : Globals.renderTargetA;
            }
////////////////////////////////////////////////////////////////


            // if this is an IR viewport, then we need to render the IR ambient light
            // instead of the normal ambient light.

            if (this.isIR && this.effectsEnabled) {
                NodeMan.get("lighting").setIR(true);
            }

            // viewport setting for fov, layer mask, override camera settings
            // but we want to preserve the camera settings

            const oldFOV = this.camera.fov;
            if (this.fovOverride !== undefined) {
                this.camera.fov = this.fovOverride;
                this.camera.updateProjectionMatrix();
            }

            const oldLayers = this.camera.layers.mask;
            if (this.layers !== undefined) {
                this.camera.layers.mask = this.layers;
            }


            // Render the scene to the off-screen canvas or render target
            this.renderer.render(GlobalScene, this.camera);

            if (this.layers !== undefined) {
                this.camera.layers.mask = oldLayers;
            }


            if (this.fovOverride !== undefined) {
                this.camera.fov = oldFOV;
                this.camera.updateProjectionMatrix();
            }

            if (this.isIR && this.effectsEnabled) {
                NodeMan.get("lighting").setIR(false);
            }

            if (this.effectsEnabled) {

             //   this.renderer.setRenderTarget(null);

                // Apply each effect pass sequentially
                for (let effectName in this.effectPasses) {
                    const effectNode = this.effectPasses[effectName];
                    if (!effectNode.enabled) continue;
                    let effectPass = effectNode.pass;

                    // the efferctNode has an optional filter type for the source texture
                    // which will be from the PREVIOUS effect pass's render target
                    switch (effectNode.filter.toLowerCase()) {
                        case "linear":
                            forceFilterChange(currentRenderTarget.texture, LinearFilter, this.renderer);
                            break;
                        case "nearest":
                        default:
                            forceFilterChange(currentRenderTarget.texture, NearestFilter, this.renderer);
                            break;
                    }

                    // Ensure the texture parameters are applied
                    // currentRenderTarget.texture.needsUpdate = true;

                    effectPass.uniforms['tDiffuse'].value = currentRenderTarget.texture;
                    // flip the render targets
                    const useRenderTarget = currentRenderTarget === Globals.renderTargetA ? Globals.renderTargetB : Globals.renderTargetA;

                    this.renderer.setRenderTarget(useRenderTarget);
                    //this.renderer.clear(true, true, true);
                    this.fullscreenQuad.material = effectPass.material;  // Set the material to the current effect pass
                    this.renderer.render(this.fullscreenQuad, new Camera());
                    currentRenderTarget = currentRenderTarget === Globals.renderTargetA ? Globals.renderTargetB : Globals.renderTargetA;
                }
            }

            // Render the final texture to the screen, id we were using a render target.
            if (currentRenderTarget !== null) {
                this.copyMaterial.uniforms['tDiffuse'].value = currentRenderTarget.texture;
                this.fullscreenQuad.material = this.copyMaterial;  // Set the material to the copy material
                this.renderer.setRenderTarget(null);
                this.renderer.render(this.fullscreenQuad, new Camera());
            }


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

        this.showCursor = v.showCursor;
            this.cursorSprite = new Sprite(spriteCrosshairMaterial)
            this.cursorSprite.position.set(0, 25000, -50)
            this.cursorSprite.scale.setScalar(0.02)
            this.cursorSprite.visible = false;
            GlobalScene.add(this.cursorSprite)

        this.mouseDown = false;
        this.dragMode = 0;

        this.showLOSArrow = v.showLOSArrow;


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

            this.effectsEnabled = true;
            guiTweaks.add(this,"effectsEnabled").name("Effects").onChange(()=>{par.renderOne=true})

            this.effects = effects;

            // we are createing an array of CNodeEffect objects
            this.effectPasses = [];

            // as defined by the "effects" object in the sitch
            for (var effectKey in this.effects) {
                let def = this.effects[effectKey];
                let effectID = effectKey;
                let effectKind = effectKey;
                // if there's a "kind" in the def then we use that as the effect kind
                // and the effect `effect` is the name of the shader
                if (def.kind !== undefined) {
                    effectKind = def.kind;
                }

                // if there's an "id" in the def then we use that as the effect id
                // otherwise we generate one from the node id and the effect id
                effectID = def.id ?? (this.id + "_" + effectID);

                console.log("Adding effect kind" + effectKind+" id="+effectID+"  to "+this.id)

                // create the node, which will wrap a .pass member which is the ShaderPass
                this.effectPasses.push(new CNodeEffect({
                    id: effectID,
                    effectName: effectKind,
                    ...def,
                }))
            }
        }
    }


    addEffectPass(effectName, effect) {
        this.effectPasses[effectName] = effect;
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


    updateEffects(f) {
        // Go through the effect passes and update their uniforms and anything else needed
        for (let effectName in this.effectPasses) {
            let effectNode = this.effectPasses[effectName];
            effectNode.updateUniforms(f, this)
        }
    }


    modSerialize() {
        return {
            ...super.modSerialize(),
            focusTrackName: this.focusTrackName,
            lockTrackName: this.lockTrackName,
            effectsEnabled: this.effectsEnabled,
        }

    }

    modDeserialize(v) {
        super.modDeserialize(v)
        if (v.focusTrackName !== undefined) this.focusTrackName = v.focusTrackName
        if (v.lockTrackName  !== undefined) this.lockTrackName  = v.lockTrackName
        if (v.effectsEnabled !== undefined) this.effectsEnabled = v.effectsEnabled
    }

    dispose() {
        super.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.renderer.context = null;
        this.renderer.domElement = null;

        this.renderer = null;
        if (this.composer !== undefined) this.composer.dispose();
        this.composer = null;

    }

    // todo - change to nodes, so we can add and remove them
    // for the custom sitch
    addFocusTracks(focusTracks) {
        let select = "default"
        if (focusTracks.select !== undefined) {
            select = focusTracks.select
            delete focusTracks.select
        }

        this.focusTrackName = select
        this.lockTrackName = select
        guiMenus.view.add(this, "focusTrackName", focusTracks).onChange(focusTrackName => {
            //
        }).name("Focus Track").listen()
        guiMenus.view.add(this, "lockTrackName", focusTracks).onChange(lockTrackName => {
            //
            console.log(this.lockTrackName)
        }).name("Lock Track").listen()
    }

    get camera() {
        return this.cameraNode.camera;
    }

    renderCanvas(frame) {

        super.renderCanvas(frame)

        if (this.needUpdate) {
            this.updateEffects(frame);
            this.needUpdate = false;
        }

        sharedUniforms.nearPlane.value = this.camera.near;
        sharedUniforms.farPlane.value = this.camera.far;

        // const windowWidth  = window.innerWidth;
        // const windowHeight = window.innerHeight;
        //
        //
        // var divW = this.div.clientWidth;
        // var divH = this.div.clientHeight;

        this.camera.aspect = this.canvas.width/this.canvas.height;
        this.camera.updateProjectionMatrix();

        if (this.controls) this.controls.update(1);
        this.preRenderCameraUpdate()

//      this.renderer.setClearColor(this.background);

        let rgb = new Color(this.background)
        let srgb = linearToSrgb(rgb);
//        console.log("this.background = "+this.background);
//        console.log("Background = "+rgb.r+","+rgb.g+","+rgb.b+" sRGB = "+srgb.r+","+srgb.g+","+srgb.b)

//        this.renderer.setClearColor(linearToSrgb(new Color(this.background)));
//         this.renderer.setClearColor(rgb);

        // Clear manually, otherwise the second render will clear the background.
        // note: old code used pixelratio to handle retina displays, no longer needed.
         this.renderer.autoClear = false;
         //this.renderer.clear();


        this.preRenderFunction();
        this.renderTargetAndEffects()
        this.postRenderFunction();

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


