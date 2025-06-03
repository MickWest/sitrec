import {Color, Group, Mesh, MeshPhongMaterial, ShaderMaterial, SphereGeometry, TextureLoader, Vector3, FrontSide} from "three";
import {GlobalScene} from "./LocalFrame";
import {wgs84} from "./LLA-ECEF-ENU";
import {radians} from "./utils";
import {Globals, NodeMan, Sit} from "./Globals";
import {sharedUniforms} from "./js/map33/material/QuadTextureMaterial";
import {renderOne} from "./par";

import {SITREC_APP} from "./configUtils";
import {Texture} from "three/src/textures/Texture";

export function createSphere(radius, radius1, segments) {
    const sphere = new Mesh(
        new SphereGeometry(radius, segments, segments),
        new MeshPhongMaterial({
            map: new TextureLoader().load(SITREC_APP+'data/images/2_no_clouds_4k.jpg',renderOne),
     //       map: new TextureLoader().load(SITREC_APP+'data/images/Earthlights_2002.jpg'),
            bumpMap: new TextureLoader().load(SITREC_APP+'data/images/elev_bump_4k.jpg',renderOne),
            bumpScale: 0.005,
            specularMap: new TextureLoader().load(SITREC_APP+'data/images/water_4k.png',renderOne),
            //           specular:    new Color('grey'),
            specular: new Color('#222222'),
            color: new Color('white'),
            shininess: 3,
        })

    );
    sphere.scale.set(1,radius1/radius,1)
    return sphere
}


export var globeMaterial;
let    nullNightTexture = null; // cache the night texture to avoid reloading it
export var nightTexture = new Texture(); // just a dummy texture to avoid null checks

let nightTextureLoaded = false; //

export function updateNightTexture(noNightLights) {
    //nightTexture = new TextureLoader().load(SITREC_APP+'data/images/Earthlights_2002.jpg',renderOne);

    if (noNightLights) {
        // if no night lights, just set the night texture to null
        if (globeMaterial) {
            globeMaterial.uniforms.nightTexture.value = nullNightTexture;
            globeMaterial.uniforms.nightLoaded.value = false;
            globeMaterial.needsUpdate = true;
        }
        return;
    }

    // we want night lights, so check if the texture is already loaded
    // and if so, just use it

    if (nightTextureLoaded) {
        if (globeMaterial) {
            globeMaterial.uniforms.nightTexture.value = nightTexture;
            globeMaterial.uniforms.nightLoaded.value = true;
            globeMaterial.needsUpdate = true;
        }
        return;
    }

    // otherwise, start to laod it

    // load it asynchronously
    const loader = new TextureLoader();
        loader
        .loadAsync(SITREC_APP + 'data/images/Earthlights_2002.jpg')
        .then((texture) => {
            nightTexture = texture;
            // Set the color space to SRGB to avoid gamma correction
            //nightTexture.colorSpace = THREE.SRGBColorSpace;
            // Set the texture to be used in the globe material
            if (globeMaterial) {
                globeMaterial.uniforms.nightTexture.value = nightTexture;
                globeMaterial.uniforms.nightLoaded.value = true; // indicate that the night texture is loaded
                globeMaterial.needsUpdate = true;
            }
            nightTextureLoaded = true;
            console.log('Night texture loaded successfully');
        })
        .catch((err) => {
            console.error('Failed to load texture:', err);
        });


}

export function createSphereDayNight(radius, radius1, segments) {

    const loader = new TextureLoader();
    const dayTexture = loader.load('data/images/2_no_clouds_4k.jpg',renderOne);

    // const nightTexture = loader.load('data/images/Earthlights_2002.jpg',renderOne);
    // make a dummy night texture, just a black texture with a slight blue tint
    //loadNightTexture();


    // get the lighting node
    const lightingNode = NodeMan.get("lighting");
    if (!lightingNode.noCityLights) {
        updateNightTexture();
    }



    globeMaterial = new ShaderMaterial({
        uniforms: {
            dayTexture: { value: dayTexture },
            nightTexture: { value: nightTexture },
            sunDirection: { value: Globals.sunLight.position}, // reference, so normalize before use
            nightLoaded: { value: false },
            ...sharedUniforms,
        },
        vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec4 vPosition;
        void main() {
            vUv = uv;
            vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
            vPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
         }
    `,
        fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;
        uniform float sunGlobalTotal;
        uniform float sunAmbientIntensity;
        uniform float nearPlane;
        uniform float farPlane;
        uniform bool useDayNight;
        uniform bool nightLoaded;
        varying vec2 vUv;
        
        varying vec3 vNormal;
        varying vec4 vPosition;
        
        void main() {
        
            vec3 sunNormal = normalize(sunDirection);
            float intensity = max(dot(vNormal, sunNormal), -0.1);
            // Smooth transition in the penumbra area
            float blendFactor = smoothstep(-0.1, 0.1, intensity);
            
            vec4 dayColor = texture2D(dayTexture, vUv) * sunGlobalTotal;
            vec4 nightColor;
            
            if (nightLoaded) {
                nightColor = texture2D(nightTexture, vUv) * sunGlobalTotal;  
            } else {
                nightColor =  texture2D(dayTexture, vUv) * sunAmbientIntensity;
            }
            
            // clear alpha channel
            dayColor.a = 1.0;
            nightColor.a = 1.0;
            
            if (useDayNight) {
                gl_FragColor = mix(nightColor, dayColor, blendFactor);
            } else {
                gl_FragColor = dayColor;
            }
            
            
            // Logarithmic depth calculation
            float w = vPosition.w;
            float z = (log2(max(nearPlane, 1.0 + w)) / log2(1.0 + farPlane)) * 2.0 - 1.0;
        
            // Write the depth value
            gl_FragDepthEXT = z * 0.5 + 0.5;
     
            // Map the intensity to a grayscale color
            // vec3 color = vec3(intensity); // This creates a vec3 with all components set to the intensity value
            // gl_FragColor = vec4(color, 1.0); // Set alpha to 1.0 for full opacity
            // gl_FragColor = dayColor;
     
        }
    `

    });

    // // make a wireframe material
    // const wireframeMaterial = new MeshPhongMaterial({
    //     color: 0xFFFFFF,
    //     wireframe: true,
    //     transparent: true,
    //     opacity: 1.0,
    //     side: FrontSide,
    // });
    //
    // const sphere = new Mesh(new SphereGeometry(radius, segments, segments), wireframeMaterial);

    const sphere = new Mesh(new SphereGeometry(radius, segments, segments), globeMaterial);
    sphere.scale.set(1,radius1/radius,1)
    return sphere
}



export function addAlignedGlobe(globeScale = 1) {

    const world = new Group();
    GlobalScene.add(world);
    let sphere

    const equatorRadius = wgs84.RADIUS * globeScale;
//    const polarRadius = wgs84.POLAR_RADIUS * globeScale;
    const polarRadius = wgs84.RADIUS * globeScale;

    if (Sit.useDayNightGlobe)
        sphere = createSphereDayNight(equatorRadius, polarRadius, 80);
    else
        sphere = createSphere(equatorRadius, polarRadius, 80);

    sphere.position.set(0, -wgs84.RADIUS, 0)
    world.add(sphere)

// Convert target latitude and longitude to radians
    var targetLatitudeRad = radians(Sit.lat);
    var targetLongitudeRad = radians(Sit.lon);

// Step 1: Align Longitude by rotating around the world Y-axis
// Rotate the sphere around the world Y-axis by the negative of the target longitude
    var worldAxisY = new Vector3(0, 1, 0);
    sphere.rotateOnWorldAxis(worldAxisY, -targetLongitudeRad - radians(90));
// Step 2: Align Latitude by rotating around the world X-axis
// Rotate the sphere around the world X-axis by (90 - target latitude)
    var worldAxisX = new Vector3(1, 0, 0);
    sphere.rotateOnWorldAxis(worldAxisX, -(radians(90) - targetLatitudeRad));

    return sphere;

}


