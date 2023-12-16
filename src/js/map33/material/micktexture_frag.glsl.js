export default `
//#extension GL_EXT_frag_depth : enable
uniform sampler2D mapNW;
uniform sampler2D mapSW;
uniform sampler2D mapNE;
uniform sampler2D mapSE;

uniform float nearPlane;
uniform float farPlane;

varying vec2 vUv;
varying vec4 vPosition;

void main() {

 vec4 colorSW = mix(mix(texture2D(mapSW, vUv * 2.), vec4(0.), step(0.5, vUv.x)), vec4(0.), step(0.5, vUv.y));
  vec4 colorNW = mix(mix(texture2D(mapNW, vUv * 2. + vec2(0., -1.)), vec4(0.), step(0.5, vUv.x)), vec4(0.), 1. - step(0.5, vUv.y));
  vec4 colorSE = mix(mix(texture2D(mapSE, vUv * 2. + vec2(-1., 0.)), vec4(0.), 1. - step(0.5, vUv.x)), vec4(0.), step(0.5, vUv.y));
  vec4 colorNE = mix(mix(texture2D(mapNE, vUv * 2. + vec2(-1., -1.)), vec4(0.), 1. - step(0.5, vUv.x)), vec4(0.), 1. - step(0.5, vUv.y));

  vec4 color = colorSW + colorNW + colorNE + colorSE;
  gl_FragColor = color;
  
    // Logarithmic depth calculation
  float w = vPosition.w;
  float z = (log2(max(nearPlane, 1.0 + w)) / log2(1.0 + farPlane)) * 2.0 - 1.0;

  // Write the depth value
  gl_FragDepthEXT = z * 0.5 + 0.5;
}
    `
