import {
  ShaderMaterial,
  TextureLoader,
  UniformsLib,
} from "../../../../three.js/build/three.module";
//import vertexShader from './quadtexture_vert.glsl'
//import fragmentShader from './quadtexture_frag.glsl'
import vertexShader from './micktexture_vert.glsl'
import fragmentShader from './micktexture_frag.glsl'

const loader = new TextureLoader()

// shared uniforms for near/far clip planes
export const sharedUniforms = {
  nearPlane: { value: 0.1 },
  farPlane: { value: 1000 },
  // ... other shared uniforms
};


// Queue to hold pending requests
const requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 5;

function processQueue() {
  // Process the next request if we have capacity
  if (activeRequests < MAX_CONCURRENT_REQUESTS && requestQueue.length > 0) {
    const nextRequest = requestQueue.shift();
    nextRequest();
  }
}

// Function to load a texture with retries and delay on error
function loadTextureWithRetries(url, maxRetries = 3, delay = 100, currentAttempt = 0) {
  return new Promise((resolve, reject) => {
    const attemptLoad = () => {
      loader.load(url,
          // On load
          (texture) => {
            resolve(texture);
            activeRequests--;
            processQueue();
          },
          // On progress (unused)
          undefined,
          // On error
          (err) => {
            if (currentAttempt < maxRetries) {
              console.log(`Retry ${currentAttempt + 1}/${maxRetries} for ${url} after delay`);
              setTimeout(() => {
                loadTextureWithRetries(url, maxRetries, delay, currentAttempt + 1)
                    .then(resolve)
                    .catch(reject);
              }, delay);
            } else {
              console.log(`Failed to load ${url} after ${maxRetries} attempts`);
              reject(err);
              activeRequests--;
              processQueue();
            }
          }
      );
    };

    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
      activeRequests++;
      attemptLoad();
    } else {
      // Add to queue
      requestQueue.push(attemptLoad);
    }
  });
}


// // Function to load a texture with retries and delay on error
// function loadTextureWithRetries(url, maxRetries = 3, delay = 100, currentAttempt = 0) {
//   return new Promise((resolve, reject) => {
//     loader.load(url,
//         // On load
//         resolve,
//         // On progress (unused)
//         undefined,
//         // On error
//         (err) => {
//           if (currentAttempt < maxRetries) {
//             console.log(`Retry ${currentAttempt + 1}/${maxRetries} for ${url} after delay`);
//             setTimeout(() => {
//               loadTextureWithRetries(url, maxRetries, delay, currentAttempt + 1)
//                   .then(resolve)
//                   .catch(reject);
//             }, delay);
//           } else {
//             console.log(`Failed to load ${url} after ${maxRetries} attempts`);
//             reject(err);
//           }
//         });
//   });
// }


const QuadTextureMaterial = (urls) => {
  return Promise.all(urls.map(url => loadTextureWithRetries(url))).then(maps => {
    return new ShaderMaterial({
      uniforms: {

        mapNW: {value: maps[0]},
        mapSW: {value: maps[1]},
        mapNE: {value: maps[2]},
        mapSE: {value: maps[3]},
        ...sharedUniforms,
        ...UniformsLib.common,
        ...UniformsLib.lights,
        ...UniformsLib.fog,
      },
      vertexShader,
      fragmentShader,
      defines: {
        USE_MAP: true,
        USE_UV: true,
      },
      lights: true,
      fog: true,
    })
  })
}

export default QuadTextureMaterial
