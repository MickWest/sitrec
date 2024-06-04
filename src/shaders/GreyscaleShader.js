/**
 * Full-screen textured quad shader
 */

export const GreyscaleShader = {

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

           vec4 color = texture2D(tDiffuse, vUv);
            // // set rgb to the average of r,g,b
            // float average = (color.r + color.g + color.b) / 3.0;
            // gl_FragColor.r = average;
            // gl_FragColor.g = average;
            // gl_FragColor.b = average;

            float grey = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
            gl_FragColor = vec4(vec3(grey), opacity);


		}`

};

