/**
 * FLIR quad shader
 * based on https://www.geeks3d.com/20091009/shader-library-night-vision-post-processing-filter-glsl/
 */

export const FLIRShader = {
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 1.0 },
    //      'colorAmplification': { value: 1.0 },
    //      'luminanceThreshold': { value: 0.2 },
  },

  vertexShader: /* glsl */ `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
//            gl_TexCoord[0] = gl_MultiTexCoord0;
		}`,

  fragmentShader: /* glsl */ `

		uniform float opacity;
		uniform sampler2D tDiffuse;

		varying vec2 vUv;

   //     uniform float luminanceThreshold; // 0.2
   //    uniform float colorAmplification; // 4.0

		void main() {
        vec4 finalColor;

        vec3 c = vec3(texture2D( tDiffuse, vUv ));


// Simple horizontal blur.

    // float h=0.001; // a fraction of the fragment width
    //
    // vec4 sum = vec4(0.0);
    // vec4 originalSample = texture2D(tDiffuse, vUv);
    //
    // sum += texture2D(tDiffuse, vec2(vUv.x - 3.2307 * h, vUv.y)) * 0.0702;
    // sum += texture2D(tDiffuse, vec2(vUv.x - 1.3846 * h, vUv.y)) * 0.3162;
    // sum += originalSample * 0.2270;
    // sum += texture2D(tDiffuse, vec2(vUv.x + 1.3846 * h, vUv.y)) * 0.3162;
    // sum += texture2D(tDiffuse, vec2(vUv.x + 3.2307 * h, vUv.y)) * 0.0702;
    //
    // vec3 c = vec3(sum);



        vec3 componentScale = vec3(-0.5, 1.5, -0.5);
        vec3 componentOffset = vec3(0.5, 0, 0.5);
        vec3 cflir = c * componentScale + componentOffset;





      float greenness = dot(c,vec3(0.0, 1.0, 0.0));
      if (greenness < 0.0) greenness = -greenness;

      cflir = cflir * (1.0-greenness);
//      cflir = cflir * (greenness);


      // MICK: Dot product with 0.57773500 (1/sqrt(3)) is dotting
      // with a unit vector, but the maximum value is not 1, but 1.732 (sqrt 3)
      // the length of (1,1,1) (white)
      // So should use 1/3,1/3,1/3, a vector of LENGTH 1/sqrt(3)

      // float whiteness = dot(c,vec3(0.577350, 0.577350, 0.577350));
      // if (whiteness < 0.0) whiteness = -whiteness;
      // if (whiteness > 0.999) {
      //   // original color is white
      //   // so use that, to keep white building
      //   cflir = c * vec3(0.35, 0.35, 0.35);
      // }

        vec3 mono = vec3(length( cflir));  // get a vec3 from a float, puts it in all r,g,b


        gl_FragColor.rgb = mono.rgb;
        gl_FragColor.a = 1.0;

		}`,
};
