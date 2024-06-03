/**
 * Full-screen textured quad shader
 */

export const GreyscaleShader = {

    uniforms: {

        'tDiffuse': { value: null },
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
            // set rgb to the average of r,g,b
            float average = (gl_FragColor.r + gl_FragColor.g + gl_FragColor.b) / 3.0;
            gl_FragColor.r = average;
            gl_FragColor.g = average;
            gl_FragColor.b = average;


		}`

};

