import {BufferAttribute, BufferGeometry, Color, Points, PointsMaterial, ShaderMaterial, TextureLoader} from "three";
import {CNode3DGroup} from "./CNode3DGroup";
import {guiMenus} from "../Globals";
import * as LAYER from "../LayerMasks";
import {radians} from "../utils";
import {sharedUniforms} from "../js/map33/material/QuadTextureMaterial";

import {SITREC_APP} from "../configUtils";

export class CNodeSpriteGroup extends CNode3DGroup {

constructor(v) {
    super(v);

    this.size = v.size ?? 2;
    this.mainSizeMultiplier = 1;

    this.texture = new TextureLoader().load(SITREC_APP+'data/images/WhiteDiskWithAlpha128px.png');

    // Define the vertex and fragment shaders
    // note "projectionMatrix" is the camera's projection matrix supplied as a uniform by three.js
    const vertexShader = `
    
    // uniforms passed in from the material
        uniform float cameraFocalLength;
        uniform float magnify;
    
    // per-vertex attributes in addition to the standard position supplied by three.js
        attribute float size;
        attribute vec3  color;
        
    // varying values to pass to the fragment shader
        varying vec3 vColor;
        varying vec4 vPosition;
        varying float vDepth;
    
        void main() {
            vColor = color;
            vPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = magnify * size * (cameraFocalLength / -vPosition.z); // Adjust 300.0 as needed
            gl_Position = projectionMatrix * vPosition;
            vDepth = gl_Position.w;
        }
    `;

    const fragmentShader = `
    // uniforms passed in from the material
        uniform sampler2D pointTexture;
        uniform float nearPlane; // these are set in sharedUniforms
        uniform float farPlane;

    // varying values passed from the vertex shader
        varying vec3 vColor;
        varying vec4 vPosition;  // this comes from the vertex shader, above    
        varying float vDepth;
        
        
        void main() {
            gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
            if (gl_FragColor.a < 0.5) discard;
            
            // Logarithmic depth calculation
            // requires the near and far planes to be set in the material (shared uniforms)
            // and vDepth to be passed from the vertex shader from gl_Position.w
            float z = (log2(max(nearPlane, 1.0 + vDepth)) / log2(1.0 + farPlane)) * 2.0 - 1.0;
            gl_FragDepthEXT = z * 0.5 + 0.5;
            
        }
    `;

    // Create the ShaderMaterial using the custom shaders
    this.material = new ShaderMaterial({
        uniforms: {
            pointTexture: {value: this.texture},
            magnify: {value: 1.0}, // this varies based on the viewport
            ...sharedUniforms,
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        depthTest: true,
        depthWrite: true,
    });

    this.geometry = new BufferGeometry();

    this.nSprites = v.nSprites ?? 1000;

    this.positions = new Float32Array(this.nSprites * 3); // x, y, z for each sprite
    this.colors = new Float32Array(this.nSprites * 3); // r, g, b for each sprite
    this.sizes = new Float32Array(this.nSprites); // Size attribute

    for (let i = 0; i < this.nSprites; i++) {
        // Random positions
        this.positions[i * 3] = Math.random() * 100000 - 5000;
        this.positions[i * 3 + 1] = Math.random() * 100000 - 5000;
        this.positions[i * 3 + 2] = Math.random() * 100000 - 5000;

        // Flow orbs are all the same size
        this.sizes[i] = this.size; // Math.random() * 40 + 10; // Adjust size range as needed

        // Random colors
        const colorHex = Math.random() * 0x808080 + 0x808080;
        const color = new Color(colorHex);
        this.colors[i * 3] = color.r;
        this.colors[i * 3 + 1] = color.g;
        this.colors[i * 3 + 2] = color.b;
    }

    // Attach data to geometry
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new BufferAttribute(this.sizes, 1));

    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();

    // Create point cloud for sprites
    this.sprites = new Points(this.geometry, this.material);

    this.sprites.updateMatrix();
    this.sprites.updateMatrixWorld();

    this.group.add(this.sprites);
    this.group.layers.mask = LAYER.MASK_LOOKRENDER;
    this.propagateLayerMask();

    this.guiMenu = v.gui ?? guiMenus.effects;
    this.gui = this.guiMenu.addFolder("Flow Orbs");

    this.visible = v.visible ?? false;
    this.gui.add(this, "visible").name("Visible").onChange(() => {
        this.group.visible = this.visible;
    }).listen();

    // Size in meters, used a CNodeGUIValue to create a unit-scaled slider
    this.gui.add(this, "size", 0.1, 10).name("Size (m)").onChange(() => {
        // Adjust size attribute in geometry
        for (let i = 0; i < this.nSprites; i++) {
            this.sizes[i] = this.size;
        }
        this.geometry.attributes.size.needsUpdate = true;
    }).elastic(10, 1000) // elastic is the range of max values for the slider
        .tooltip("Diameter in meters.");


    this.gui.add(this, "mainSizeMultiplier", 1, 100).name("View Size Multiplier").tooltip("Adjusts the size of the flow orbs in the main view, but does not change the size in other views.");

    this.simpleSerials.push("size", "mainSizeMultiplier");
}


    preViewportUpdate(view) {

        if (view.id === "mainView") {
            // Adjust magnification based on user input
            this.material.uniforms.magnify.value = this.mainSizeMultiplier;
        } else {
            this.material.uniforms.magnify.value = 1;
        }
    }
}

