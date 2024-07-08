/**
 * Full-screen textured quad shader
 */
import {Vector2} from "three";

export const JPEGArtifactsShader = {

    uniforms: {

        'tDiffuse': { value: null },
        'opacity': { value: 1.0 },
        'amount': { value: 0.5 }, // Shrink amount, 0.0 means no shrink, 1.0 means maximum shrink to center
        'resolution': { value: new Vector2(256.0, 256.0) }, // Width and Height of the texture
        'size': { value: 8.0 }, // Size of the block
    },

    vertexShader: /* glsl */`

        varying vec2 vUv;

        void main() {

            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

        }`,

    fragmentShader: /* glsl */`

        uniform float opacity;
        uniform float amount;
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float size;

        varying vec2 vUv;


    precision highp float;
    precision highp int;
    
    #define hashi(x)   triple32(x) 
    #define hash(x)  ( float( hashi(x) ) / float( 0xffffffffU ) )
    
    uint triple32(uint x)
    {
        x ^= x >> 17;
        x *= uint(0xed5ad4bbU);
        x ^= x >> 11;
        x *= uint(0xac4c1b51U);
        x ^= x >> 15;
        x *= uint(0x31848babU);
        x ^= x >> 14;
        return x;
    }
    
    float rand2(vec2 co) {
        return hash(uint(co.x) + hashi(uint(co.y)));
    }


        void main() {

            vec2 blockSize = vec2(size) / resolution; // Block size in texture coordinates
            vec2 blockIndex = floor(vUv / blockSize);
            vec2 blockCenter = (blockIndex + 0.5) * blockSize;

            vec2 offset = vUv - blockCenter;

           // offset will be in the range -blockSize/2 to blockSize/2
           // let's calculate a new offsetY that has offset.x added to it, scaled by the amount
            float xs = gl_FragCoord.x;
            float ys = gl_FragCoord.y;
            
            float offsetY = vUv.y + offset.x * amount * (0.5 - rand2(vec2(xs, ys) ));
            float offsetX = vUv.x + offset.y * amount * (0.5 - rand2(vec2(ys, xs) ));

           vec4 color = texture2D(tDiffuse, vec2(offsetX, offsetY));


            gl_FragColor = vec4(color.rgb, opacity);

        }`

};
