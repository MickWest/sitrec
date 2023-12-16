export default `
// uniform mat4 modelViewMatrix;
// uniform mat4 projectionMatrix;
//
// attribute vec3 position;
// attribute vec2 uv;

varying vec4 vPosition;
varying vec2 vUv;

void main() {
    vUv = uv;
    vPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = vPosition;
}

`
