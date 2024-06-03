 export const StaticNoiseShader = {

        name: "StaticNoiseShader",

        uniforms: {

            "tDiffuse": {type: "t", value: null},
            "time": {type: "f", value: 0.0},
            "amount": {type: "f", value: 0.1},
            "size": {type: "f", value: 4.0}
        },

        vertexShader: `

            varying vec2 vUv;

            void main() {
    
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

            }

        `,

fragmentShader: `

    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float amount;
    uniform float size;

    varying vec2 vUv;

    // https://www.shadertoy.com/view/WttXWX
    // --- from Chris Wellons https://nullprogram.com/blog/2018/07/31/
    // Note that it might not be costlier than the infamous fract(big*sin(big*x)) ;-) 
    
            // --- choose one:
    //#define hashi(x)   lowbias32(x)
    precision highp float;
    precision highp int;
    
    #define hashi(x)   triple32(x) 
    #define hash(x)  ( float( hashi(x) ) / float( 0xffffffffU ) )
    
    uint lowbias32(uint x)
    {
        x ^= x >> 16;
        x *= uint(0x7feb352dU);
        x ^= x >> 15;
        x *= uint(0x846ca68bU);
        x ^= x >> 16;
        return x;
    }
    
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
        vec2 p = vUv;
        vec4 color = texture2D(tDiffuse, p);
        float xs = gl_FragCoord.x;
        float ys = gl_FragCoord.y;
        vec4 snow = vec4(rand2(vec2(xs * time, ys * time) - 0.5) * amount);
        gl_FragColor = color + snow; // additive
    }

       `,
    }