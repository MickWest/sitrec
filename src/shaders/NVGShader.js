/**
 * Night Vision quad shader
 * based on https://www.geeks3d.com/20091009/shader-library-night-vision-post-processing-filter-glsl/
 */

export const NVGShader = {

    uniforms: {

        'tDiffuse': { value: null },
        'opacity': { value: 1.0 },
        'colorAmplification': { value: 4.0 },
        'luminanceThreshold': { value: 0.2 },

    },

    vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
//            gl_TexCoord[0] = gl_MultiTexCoord0;
		}`,

    fragmentShader: /* glsl */`

		uniform float opacity;
		uniform sampler2D tDiffuse;

		varying vec2 vUv;

        uniform float luminanceThreshold; // 0.2
        uniform float colorAmplification; // 4.0
    //    uniform float effectCoverage; // 0.5

		void main() {
        vec4 finalColor;
        //            float m = texture2D(maskTex, gl_TexCoord[0].st).r;
        float m = 1.0;
        float n = 0.0;
        //gl_FragColor = texture2D( tDiffuse, vUv );
        //			gl_FragColor.a *= opacity;
        //gl_FragColor.g = 0.0;
        
        vec3 c = vec3(texture2D( tDiffuse, vUv ));
        //      vec3 c = texture2D(tDiffuse, gl_TexCoord[0].st + (n.xy*0.005)).rgb;
        float lum = dot(vec3(0.30, 0.59, 0.11), c);
        if (lum < luminanceThreshold)
        c *= colorAmplification; 
        
        vec3 visionColor = vec3(0.1, 0.95, 0.2);
        finalColor.rgb = (c + (n*0.2)) * visionColor * m;
        
        gl_FragColor.rgb = finalColor.rgb;
        gl_FragColor.a = 1.0;

		}`

};

