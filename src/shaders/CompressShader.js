/**
 * Full-screen textured quad shader
 */

export const CompressShader = {

    uniforms: {

        'tDiffuse': { value: null },
        'opacity': { value: 1.0 },
        'lower': { value: 0.1 },
        'upper': { value: 0.9 },


    },

    vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

    fragmentShader: /* glsl */`

		uniform float opacity;
		uniform float lower;
        uniform float upper;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );
            // compress the color range from 0.0 to 1.10
            // to lower to upper
                float span = upper - lower;
                // since they are already in the range 0.0 to 1.0
                // we just need to multiply by the span and add the lower
                gl_FragColor.r = lower + span * gl_FragColor.r;
                gl_FragColor.g = lower + span * gl_FragColor.g;
                gl_FragColor.b = lower + span * gl_FragColor.b;

		}`

};

