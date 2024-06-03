    /**
     * @author Felix Turner / www.airtight.cc / @felixturner
     *
     * Static effect. Additively blended digital noise.
     *
     * amount - amount of noise to add (0 - 1)
     * size - size of noise grains (pixels)
     *
     * The MIT License
     *
     * Copyright (c) 2014 Felix Turner
     *
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in
     * all copies or substantial portions of the Software.
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
     * THE SOFTWARE.
     */
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

    float rand(vec2 co) {
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    
    }

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
        vec4 snow = vec4(rand2(vec2(xs * time, ys * time)) * amount);
        gl_FragColor = color + snow; // additive
    }


       `,
    }