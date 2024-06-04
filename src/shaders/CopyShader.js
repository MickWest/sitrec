/**
 * Full-screen textured quad shader
 */

export const CopyShader = {

    uniforms: {

        'tDiffuse': { value: null },
        'opacity': { value: 1.0 },


    },

    vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

    fragmentShader: /* glsl */`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

 			gl_FragColor = texture2D( tDiffuse, vUv );
// //			gl_FragColor.a *= opacity;

            // vec4 texel = texture2D(tDiffuse, vUv);
            // // Apply gamma correction to match sRGB encoding
            // texel.rgb = pow(texel.rgb, vec3(2.2));
            // gl_FragColor = opacity * texel;

		}`

};

