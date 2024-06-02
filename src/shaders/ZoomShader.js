/**
 * Magnify Center Shader
 */

export const ZoomShader = {

    uniforms: {

        'tDiffuse': { value: null },
        'opacity': { value: 1.0 },
        'magnifyFactor': { value: 0.5 }  // This determines the X% to magnify, 0.5 means the middle 50%

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
		uniform float magnifyFactor;

		varying vec2 vUv;

		void main() {
			vec2 center = vec2(0.5, 0.5);
			float scale = 1.0 / magnifyFactor;

			// Calculate the scaled coordinates
			vec2 scaledUv = (vUv - center) * scale + center;

			vec4 color = texture2D(tDiffuse, scaledUv);

			gl_FragColor = vec4(color.rgb, opacity);
		}`

};
