/**
 * Full-screen textured quad shader
 */

export const LevelsShader = {

    uniforms: {

        'tDiffuse': { value: null },
        'opacity': { value: 1.0 },
        'inputBlack': { value: 0.0 },
        'inputWhite': { value: 1.0 },
        'gamma': { value: 1.0 },
        'outputBlack': { value: 0.0 },
        'outputWhite': { value: 1.0 }

    },

    vertexShader: /* glsl */`

        varying vec2 vUv;

        void main() {

            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

        }`,

    fragmentShader: /* glsl */`

        uniform float opacity;
        uniform float inputBlack;
        uniform float inputWhite;
        uniform float gamma;
        uniform float outputBlack;
        uniform float outputWhite;

        uniform sampler2D tDiffuse;

        varying vec2 vUv;

        void main() {

            vec4 color = texture2D( tDiffuse, vUv );

            // Normalize input levels
            color.rgb = (color.rgb - inputBlack) / (inputWhite - inputBlack);

            // Apply gamma correction
            color.rgb = pow(color.rgb, vec3(gamma));

            // Adjust output levels
            color.rgb = outputBlack + (color.rgb * (outputWhite - outputBlack));

            gl_FragColor = vec4(color.rgb, opacity);

        }`

};
