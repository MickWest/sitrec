import {
  ShaderMaterial,
  TextureLoader,
  UniformsLib,
} from "three";
//import vertexShader from './quadtexture_vert.glsl'
//import fragmentShader from './quadtexture_frag.glsl'
import vertexShader from './micktexture_vert.glsl'
import fragmentShader from './micktexture_frag.glsl'
import {CanvasTexture, Color, MeshBasicMaterial, MeshStandardMaterial, SRGBColorSpace} from "three";

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



const QuadTextureMaterial = (urls) => {
  return Promise.all(urls.map(url => loadTextureWithRetries(url))).then(maps => {



    // set       texture.colorSpace = SRGBColorSpace; on each map
    // to avoid gamma correction
//    maps.forEach(map => map.colorSpace = SRGBColorSpace)

    // intead of a custom material, use the built-in MeshBasicMaterial
    // and make a new single texture from the 4 textures
    // so creating a single double resolution texture
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = maps[0].image.width * 2
    canvas.height = maps[0].image.height * 2
    ctx.drawImage(maps[0].image, 0, 0)
    ctx.drawImage(maps[1].image, 0, maps[0].image.height)
    ctx.drawImage(maps[2].image, maps[0].image.width, 0)
    ctx.drawImage(maps[3].image, maps[0].image.width, maps[0].image.height)
    const texture = new CanvasTexture(canvas)
//    texture.colorSpace = SRGBColorSpace;

    texture.needsUpdate = true
    // destroy the canvas and original textures
    canvas.remove()
    maps.forEach(map => map.dispose())


    // using a standard material means it gets lighting
    // Seems to be giving significantly brighter colors in SWR
    // in Area6 we can adjust the time of day to see this effect
    // all the lights add together to make it brighter

    return new MeshStandardMaterial({map: texture,
      emissive: new Color(0xffffff),  // Set emissive color to white
      emissiveMap: texture,                 // Use the same texture for emissive map
      emissiveIntensity: 0.0,                // Full intensity for emissive
      //colorSpace: SRGBColorSpace
       })


    // for now use this basic material
    // // basic material for no lighting, just render the original colors.
    // return new MeshBasicMaterial({map: texture})


  })
}

export default QuadTextureMaterial
