/**
 * Pixelate Shader
 */
import { Vector2 } from 'three';

export const Pixelate2x2Shader = {
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 1.0 },
    resolution: { value: new Vector2(800, 600) }, // Set your render target size here
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
		uniform vec2 resolution;

		varying vec2 vUv;

		void main() {
			vec2 uv = vUv;

			// Calculate the size of each pixel block
			vec2 blockSize = vec2(2.0) / resolution;

			// Calculate the position of the top-left pixel of the 2x2 block
			vec2 pixelPos = floor(uv / blockSize) * blockSize;

			// Sample the four pixels in the 2x2 block
			vec4 color1 = texture2D(tDiffuse, pixelPos);
			vec4 color2 = texture2D(tDiffuse, pixelPos + vec2(blockSize.x, 0.0));
			vec4 color3 = texture2D(tDiffuse, pixelPos + vec2(0.0, blockSize.y));
			vec4 color4 = texture2D(tDiffuse, pixelPos + vec2(blockSize.x, blockSize.y));

			// Average the colors
			vec4 avgColor = (color1 + color2 + color3 + color4) / 4.0;

			gl_FragColor = vec4(avgColor.rgb, opacity);
		}`,
};

/**
 * Pixelate NxN Shader
 */

export const PixelateNxNShader = {
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 1.0 },
    resolution: { value: new Vector2(800, 600) }, // Set your render target size here
    blockSize: { value: 4.0 }, // Set the block size for NxN
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
		uniform vec2 resolution;
		uniform float blockSize;

		varying vec2 vUv;

		void main() {
			vec2 uv = vUv;

			// Calculate the size of each pixel block
			vec2 blockPixelSize = vec2(blockSize) / resolution;
			//vec2 blockPixelSize2 = vec2(blockSize/2.0) / resolution;

			// Calculate the position of the top-left pixel of the NxN block
			vec2 pixelPos = floor(uv / blockPixelSize) * blockPixelSize;

			// Initialize the color accumulator
			vec4 color = vec4(0.0);

			// Loop over the NxN block to sum the colors
			for (int i = 0; i < int(blockSize); i++) {
				for (int j = 0; j < int(blockSize); j++) {
					color += texture2D(tDiffuse, pixelPos + vec2(i, j) * blockPixelSize);
				}
			}

			// Average the colors
			color /= blockSize * blockSize;

			gl_FragColor = vec4(color.rgb, opacity);
		}`,
};
