/**
 * Magnify Center Shader
 */

export const ZoomShader = {
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 1.0 },
    magnifyFactor: { value: 0.5 }, // This determines the X% to magnify, 0.5 means the middle 50%
  },

  vertexShader: /* glsl */ `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

  fragmentShader: /* glsl */ `

		uniform float opacity;
		uniform sampler2D tDiffuse;
		uniform float magnifyFactor;

		varying vec2 vUv;

		void main() {
		    // early out with the most common case for performance reasons
		    if (magnifyFactor == 1.0) {
                gl_FragColor = texture2D(tDiffuse, vUv);
                return;
            }

			vec2 center = vec2(0.5, 0.5);
			float scale = 1.0 / magnifyFactor;

			// Calculate the scaled coordinates
			vec2 scaledUv = (vUv - center) * scale + center;

			// Check if the scaled UV coordinates are out of bounds
			if (scaledUv.x < 0.0 || scaledUv.x > 1.0 || scaledUv.y < 0.0 || scaledUv.y > 1.0) {
				gl_FragColor = vec4(0.0, 0.0, 0.0, opacity);  // Set to black
			} else {
				vec4 color = texture2D(tDiffuse, scaledUv);
				gl_FragColor = vec4(color.rgb, opacity);
			}
		}`,
};
