import {
    Color,
    Group,
    Mesh,
    MeshPhongMaterial,
    SphereGeometry,
    TextureLoader,
    Vector3
} from "../three.js/build/three.module";
import {GlobalScene} from "./LocalFrame";
import {wgs84} from "./LLA-ECEF-ENU";
import {radians} from "./utils";
import {Sit} from "./Globals";
import {ShaderMaterial} from "three";
import {sharedUniforms} from "./js/map33/material/QuadTextureMaterial";
import {renderOne} from "./par";

export function createSphere(radius, radius1, segments) {
    const sphere = new Mesh(
        new SphereGeometry(radius, segments, segments),
        new MeshPhongMaterial({
            map: new TextureLoader().load('data/images/2_no_clouds_4k.jpg',renderOne),
     //       map: new TextureLoader().load('data/images/Earthlights_2002.jpg'),
            bumpMap: new TextureLoader().load('data/images/elev_bump_4k.jpg',renderOne),
            bumpScale: 0.005,
            specularMap: new TextureLoader().load('data/images/water_4k.png',renderOne),
            //           specular:    new Color('grey'),
            specular: new Color('#222222'),
            color: new Color('white'),
            shininess: 3,
        })

        //  new MeshBasicMaterial({
        //      //map:  new TextureLoader().load('images/2_no_clouds_4k.jpg'),
        //      map:  new TextureLoader().load('images/galaxy_starfield.png'),
        // //     side: BackSide
        //  })


    );
    sphere.scale.set(1,radius1/radius,1)
    return sphere
}


export var globeMaterial;

export function createSphereDayNight(radius, radius1, segments) {

    const loader = new TextureLoader();
    const dayTexture = loader.load('data/images/2_no_clouds_4k.jpg',renderOne);
    const nightTexture = loader.load('data/images/Earthlights_2002.jpg',renderOne);

    globeMaterial = new ShaderMaterial({
        uniforms: {
            dayTexture: { value: dayTexture },
            nightTexture: { value: nightTexture },
            sunDirection: { value: Sit.sunLight.position}, // reference, so normalize before use
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
        uniform float nearPlane;
        uniform float farPlane;
        varying vec2 vUv;
        
        varying vec3 vNormal;
        varying vec4 vPosition;
        
        void main() {
        
            vec3 sunNormal = normalize(sunDirection);
            float intensity = max(dot(vNormal, sunNormal), -0.1);
            // Smooth transition in the penumbra area
            float blendFactor = smoothstep(-0.1, 0.1, intensity);
            
            vec4 dayColor = texture2D(dayTexture, vUv);
            vec4 nightColor = texture2D(nightTexture, vUv);
            
            gl_FragColor = mix(nightColor, dayColor, blendFactor);
            
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

    const sphere = new Mesh(new SphereGeometry(radius, segments, segments), globeMaterial);
    sphere.scale.set(1,radius1/radius,1)
    return sphere
}



export function addAlignedGlobe(globeScale = 0.999) {

    const world = new Group();
    GlobalScene.add(world);
    let sphere

    if (Sit.useDayNightGlobe)
        sphere = createSphereDayNight(wgs84.RADIUS * globeScale, wgs84.POLAR_RADIUS * globeScale, 80);
    else
        sphere = createSphere(wgs84.RADIUS * globeScale, wgs84.POLAR_RADIUS * globeScale, 80);

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


