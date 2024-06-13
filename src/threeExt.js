// threeExt.js - Mick's extensions to THREE.js
import {
    ArrowHelper,
    BoxGeometry,
    BufferGeometry,
    Color,
    Float32BufferAttribute,
    Group,
    LinearFilter,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    NearestFilter,
    Ray,
    Sphere,
    SphereGeometry,
    TextureLoader,
    Vector3,
    WireframeGeometry
} from "three";

import {drop3, pointOnSphereBelow} from "./SphericalMath"
import {GlobalScene} from "./LocalFrame";
import * as LAYER from "./LayerMasks";
import {LLAToEUS, wgs84} from "./LLA-ECEF-ENU";
import {LineMaterial} from "three/addons/lines/LineMaterial.js";
import {LineGeometry} from "three/addons/lines/LineGeometry.js";
import {Line2} from "three/addons/lines/Line2.js";
import {NodeMan} from "./Globals";
import {isArray} from "mathjs";
import {assert} from "./assert.js";
import {intersectSphere2, makeMatrix4PointYAt, V3} from "./threeUtils";


// Wrapper for calling dispose function on object, allowing undefined
export function dispose(a) { if (a!=undefined) a.dispose()}

// A grid helper that is a segment of a sphere (i.e. on the surface of the earth)
class GridHelperWorldComplex extends LineSegments {
    constructor (altitude, xStart, xEnd, xStep, yStart, yEnd, yStep, radius, color1=0x444444, color2 = 0x888888)
    {



        color1 = new Color( color1 );
        color2 = new Color( color2 );

        const vertices = [], colors = [];
        var j = 0
        for (var x = xStart; x < xEnd; x+= xStep) {
            for (var y = yStart; y< yEnd; y+= yStep) {
                const A = drop3(x,y,radius)
                const B = drop3(x+xStep,y,radius)
                const C = drop3(x,y+yStep,radius)
                A.z += altitude
                B.z += altitude
                C.z += altitude
                vertices.push(A.x,A.z,A.y,B.x,B.z,B.y)
                vertices.push(A.x,A.z,A.y,C.x,C.z,C.y)
                const color = color1;

                color.toArray( colors, j ); j += 3;
                color.toArray( colors, j ); j += 3;
                color.toArray( colors, j ); j += 3;
                color.toArray( colors, j ); j += 3;
            }
        }

        const geometry = new BufferGeometry();
        geometry.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
        geometry.setAttribute( 'color', new Float32BufferAttribute( colors, 3 ) );

        const material = new LineBasicMaterial( { vertexColors: true, toneMapped: false } );

        super( geometry, material );

        this.type = 'GridHelper';
    }
}

export class ColoredLine extends LineSegments {
    constructor(_positions, _colors) {

        const vertices = [];
        const colors = [];

        for (var i=0;i<_positions.length-1;i++) {
            var p = _positions[i]
            var c = _colors[i]
            vertices.push(_positions[i].x,_positions[i].y,_positions[i].z)
            vertices.push(_positions[i+1].x,_positions[i+1].y,_positions[i+1].z)
            _colors[i].toArray(colors,i*6)
            _colors[i].toArray(colors,i*6+3)
        }


        const geometry = new BufferGeometry();
        geometry.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
        geometry.setAttribute( 'color', new Float32BufferAttribute( colors, 3 ) );

        const material = new LineBasicMaterial( { vertexColors: true, toneMapped: false } );

        super (geometry, material)
        this.type = 'ColoredLine';
    }

    dispose() {
        this.geometry.dispose()
        this.material.dispose()
    }

}



// Same as THREE.GridHelper, but creates a segment of a sphere.
// by taking the grid, and simply projecting it down to the sphere
// This requires we make individual line segments for each square
// so uses considerably more lines (n^2 vs 2n) than GridHelper
class GridHelperWorld extends GridHelperWorldComplex {

    constructor( altitude = 0, size = 10, divisions = 10, radius = 1000,color1 = 0x444444, color2 = 0x888888 ) {



        const center = divisions / 2;
        const step = size / divisions;
        const halfSize = size / 2;

        super(altitude, -halfSize,halfSize,step,-halfSize,halfSize,step,radius,color1,color2)

    }

}




export {GridHelperWorld, GridHelperWorldComplex}

function sphereAt(x, y, z, radius = 5, color = 0xffffff, parent) {
    const geometry = new SphereGeometry(radius, 10, 10);
    const material = new MeshBasicMaterial({color: color});
    var sphere = new Mesh(geometry, material);
    sphere.position.x = x;
    sphere.position.y = y;
    sphere.position.z = z;
    if (parent != undefined) parent.add(sphere);
//    sphere.layers.mask = LAYER.MASK_MAIN;
    sphere.layers.mask = LAYER.MASK_HELPERS;
    return sphere;
}

export function sphereMark(point, r = 5, color = 0xffffff, parent=null) {
    return sphereAt(point.x, point.y, point.z, r, color, parent)
}

function boxAt(x, y, z, xs = 1, ys=1, zs=1, color = 0xffffff, parent) {
    const geometry = new BoxGeometry(xs,ys,zs);
    const material = new MeshBasicMaterial({color: color});
    var sphere = new Mesh(geometry, material);
    sphere.position.x = x;
    sphere.position.y = y;
    sphere.position.z = z;
    sphere.layers.mask = LAYER.MASK_MAIN;
    if (parent != undefined) parent.add(sphere);
    return sphere;
}

export function boxMark(point,  xs = 1, ys=1, zs=1, color = 0xffffff, parent=null) {
    return boxAt(point.x, point.y, point.z, xs,ys,zs, color, parent)
}



// Create anywhere debug sphere
var DebugSpheres = {}
export function DebugSphere(name, origin, radius = 100, color = 0xffffff, parent = GlobalScene, layers = LAYER.MASK_HELPERS) {

    color = new Color(color)  // convert from whatever format, like "green" or "#00ff00" to a THREE.Color(r,g,b)

    if (DebugSpheres[name] === undefined) {
        const geometry = new SphereGeometry(1, 10, 10);
        const material = new MeshBasicMaterial({color: color});
        var sphere = new Mesh(geometry, material);
        DebugSpheres[name] = sphere
        sphere.layers.mask = layers;
        parent.add(sphere);
    }
    DebugSpheres[name].position.copy(origin)
    DebugSpheres[name].scale.set(radius,radius,radius)

    return DebugSpheres[name]

}

export function DebugWireframeSphere(name, origin, radius = 100, color = 0xffffff, segments=20, parent) {

    color = new Color(color)  // convert from whatever format, like "green" or "#00ff00" to a THREE.Color(r,g,b)

    if (parent == undefined)
        parent = GlobalScene

    if (DebugSpheres[name] === undefined) {

        // we make a sphere of radius 0.5 so it has a 1 METER diameter
        // so scale passed in must be in meters.
        const geometry = new SphereGeometry(0.5, segments, segments);
        const wireframe = new WireframeGeometry(geometry);
        const sphere = new LineSegments(wireframe);
        sphere.material.color = new Color(color)
        sphere.material.depthTest = true;
        sphere.material.opacity = 0.75;
        sphere.material.transparent = true;
        sphere.layers.mask = LAYER.MASK_HELPERS;

        DebugSpheres[name] = sphere
        parent.add(sphere);
    }
    DebugSpheres[name].position.copy(origin)
    DebugSpheres[name].scale.set(radius,radius,radius)

    return DebugSpheres[name]

}

export var DebugArrows = {}

export function disposeDebugArrows() {
    console.log("Disposing all debug arrows")

    for (var key in DebugArrows) {
       // DebugArrows[key].dispose();
    }
    DebugArrows = {}
}

export function disposeDebugSpheres() {
    console.log("Disposing all debug spheres")
    for (var key in DebugSpheres) {
     //   DebugSpheres[key].dispose();
    }
    DebugSpheres = {}
}


// creat a debug arrow if it does not exist, otherwise update the existing one
// uses an array to record all the debug arrows.
export function DebugArrow(name, direction, origin, _length = 100, color="#FFFFFF", visible=true, parent, _headLength=20, layerMask=LAYER.MASK_HELPERS) {
    const dir = direction.clone()
    dir.normalize();


    if (parent === undefined)
        parent = GlobalScene;


    // if a fraction, then treat that as a fraction of the total length, else an absolute value
    if (_headLength < 1) {
//        _headLength = _length * _headLength;

        // sinc
        assert(0, "Head length as a fraction is deprecated")
    }


    if (DebugArrows[name] == undefined) {
        color = new Color(color)  // convert from whatever format, like "green" or "#00ff00" to a THREE.Color(r,g,b)
        DebugArrows[name] = new ArrowHelper(dir, origin, _length, color, _headLength);
        DebugArrows[name].visible = visible
        DebugArrows[name].length = _length;
        DebugArrows[name].headLength = _headLength;
        DebugArrows[name].direction = dir;

        if (layerMask !== undefined) {
            setLayerMaskRecursive(DebugArrows[name], layerMask)
        }
        parent.add(DebugArrows[name]);
    } else {
        assert(parent === DebugArrows[name].parent, "Parent changed on debug arrow: was "+DebugArrows[name].parent.debugTimeStamp+" now "+parent.debugTimeStamp)
        DebugArrows[name].setDirection(dir)
        DebugArrows[name].position.copy(origin)
        DebugArrows[name].setLength(_length, _headLength)
        DebugArrows[name].visible = visible
        DebugArrows[name].length = _length;
        DebugArrows[name].headLength = _headLength;
        DebugArrows[name].direction = dir;


    }
    return DebugArrows[name]
}

export function scaleArrows(camera) {
    let campos = camera.position.clone();
    const fovScale = 0.0025 * Math.tan((camera.fov / 2) * (Math.PI / 180))
    for (var key in DebugArrows) {
        const arrow = DebugArrows[key]
        let headPosition = arrow.position.clone().add(arrow.direction.clone().multiplyScalar(arrow.length));
        let distance = campos.distanceTo(headPosition);
        arrow.setLength(arrow.length, distance * fovScale * arrow.headLength);
    }

}


export function removeDebugArrow(name) {
    if (DebugArrows[name]) {
        if (DebugArrows[name].parent) {
            DebugArrows[name].parent.remove(DebugArrows[name]);
        }
        DebugArrows[name].dispose();
        delete DebugArrows[name]
    }
}

export function removeDebugSphere(name) {
    if (DebugSpheres[name]) {
        if (DebugSpheres[name].parent) {
            DebugSpheres[name].parent.remove(DebugSpheres[name]);
        }
        DebugSpheres[name].geometry.dispose();
        delete DebugSpheres[name]
    }
}

// XYZ axes colored RGB
export function DebugAxes(name, position, length) {
    DebugArrow(name+"Xaxis",V3(1,0,0), position.clone().sub(V3(length/2,0,0)),length,"#FF8080")
    DebugArrow(name+"Yaxis",V3(0,1,0), position.clone().sub(V3(0,length/2,0)),length,"#80FF80")
    DebugArrow(name+"Zaxis",V3(0,0,1), position.clone().sub(V3(0,0,length/2)),length,"#8080FF")
}

export function DebugMatrixAxes(name, position, matrix, length) {
    // extract the axes from the matrix
    const x = new Vector3().setFromMatrixColumn(matrix, 0);
    const y = new Vector3().setFromMatrixColumn(matrix, 1);
    const z = new Vector3().setFromMatrixColumn(matrix, 2);
    // draw the debug arrows
    DebugArrow(name+"Xaxis",x, position.clone().sub(x.clone().multiplyScalar(length/2)),length,"#FF8080")
    DebugArrow(name+"Yaxis",y, position.clone().sub(y.clone().multiplyScalar(length/2)),length,"#80FF80")
    DebugArrow(name+"Zaxis",z, position.clone().sub(z.clone().multiplyScalar(length/2)),length,"#8080FF")

}





function DebugArrowOrigin(name, direction, length = 100, color, visible=true, parent, headLength=20, layerMask) {
    const origin = new Vector3(0, 0, 0);
    return DebugArrow(name, direction, origin, length, color, visible, parent, headLength)
}

export function DebugArrowAB(name, A, B, color, visible, parent, headLength=20, layerMask) {
    var direction = B.clone()
    direction.sub(A)
    var length = direction.length()
    direction.normalize()
    return DebugArrow(name, direction, A, length, color, visible, parent, headLength, layerMask)
}


// Layer masks are on a per-object level, and don't affect child objects
// so we need to propagate it if there's any chenge
export function propagateLayerMaskObject(parent) {
    // copy group layers bitmask into all children
    const layersMask = parent.layers.mask;
    parent.traverse( function( child ) { child.layers.mask = layersMask } )
}

export function setLayerMaskRecursive(object, mask) {
    object.layers.mask = mask;
    object.traverse( function( child ) { child.layers.mask = mask } )

}


export function pointObject3DAt(object, _normal) {
    const m = makeMatrix4PointYAt(_normal)
    object.quaternion.setFromRotationMatrix( m );
}

export function isVisible(ob) {
    if (ob.visible == false) return false; // if not visible, then that can't be overridden
    if (ob.parent != null) return isVisible(ob.parent) // visible, but parents can override
    return true; // visible all the way up to the root
}


// given a three.js scene, we can dispose of all the objects in it
// this is used when we want to change scenes/sitches
// we can't just delete the scene, as it's a THREE.Object3D, and we need to dispose of all the objects in it
// and all the materials, etc.
export function disposeScene(scene) {
    console.log("Disposing scene");

    if (scene === undefined) return;

    // Recursive function to dispose of materials and geometries
    function disposeObject(object) {


       // if (object.type === 'Mesh' || object.type === 'Line' || object.type === 'Points') {
            // Dispose geometry
            if (object.geometry) {
                object.geometry.dispose();
            }

            if (object.material) {
                // Dispose materials
                if (Array.isArray(object.material)) {
                    // In case of an array of materials, dispose each one
                    object.material.forEach(material => disposeMaterial(material));
                } else {
                    // Single material
                    disposeMaterial(object.material);
                }
            }
        //}

        // Recurse into children
        while (object.children.length > 0) {
            disposeObject(object.children[0]);
            object.remove(object.children[0]);
        }
    }

    // Helper function to dispose materials and textures
    function disposeMaterial(material) {
        Object.keys(material).forEach(prop => {
            if (material[prop] !== null && material[prop] != undefined && typeof material[prop].dispose === 'function') {
                // This includes disposing textures, render targets, etc.
                material[prop].dispose();
            }
        });
        material.dispose(); // Dispose the material itself
    }

    // Start the disposal process from the scene's children
    if (scene.children!== undefined) {
        while (scene.children.length > 0) {

            //  if (scene.children[0].type === 'GridHelper')
            //      debugger;

            disposeObject(scene.children[0]);


            scene.remove(scene.children[0]);
        }
    }
}

// A debug group so we can see specifically what's being disposed or not
export class DEBUGGroup extends Group {
    constructor() {
        super();
    }
}

// get intersection of a point/heading ray with the Mean Sea Level

export function intersectMSL(point, heading) {
    const globe = new Sphere(new Vector3(0, -wgs84.RADIUS, 0), wgs84.RADIUS);
    const ray = new Ray(point, heading.clone().normalize());
    const sphereCollision = new Vector3();
    if (intersectSphere2(ray, globe, sphereCollision))
        return sphereCollision;
    return null;
}

export class CDisplayLine {
    constructor(v) {
        this.color = v.color ?? [1, 0, 1];
        this.width = v.width ?? 1;
        this.A = v.A;
        this.B = v.B;
        this.group = v.group;
        this.layers = v.layers ?? LAYER.MASK_HELPERS;

        this.material = new LineMaterial({

            // the color here is white, as
            color: [1.0, 1.0, 1.0], // this.color,
            linewidth: this.width, // in world units with size attenuation, pixels otherwise
            vertexColors: true,
            dashed: false,
            alphaToCoverage: true,
        });

        this.geometry = null;

        const line_points = [];
        const line_colors = [];

        line_points.push(this.A.x, this.A.y, this.A.z);
        line_points.push(this.B.x, this.B.y, this.B.z);
        line_colors.push(this.color.r, this.color.g, this.color.b)
        line_colors.push(this.color.r, this.color.g, this.color.b)

        this.geometry = new LineGeometry();
        this.geometry.setPositions(line_points);
        this.geometry.setColors(line_colors);

        this.material.resolution.set(window.innerWidth, window.innerHeight)
        this.line = new Line2(this.geometry, this.material);
        this.line.computeLineDistances();
        this.line.scale.set(1, 1, 1);
        this.line.layers.mask = this.layers;
        this.group.add(this.line);

    }

    dispose() {
        this.group.remove(this.line)
        this.material.dispose();
        this.geometry.dispose();
    }
}

export function pointOnGround(A) {
    if (NodeMan.exists("TerrainModel")) {
        let terrainNode = NodeMan.get("TerrainModel")
        return terrainNode.getPointBelow(A)
    } else {
        return pointOnSphereBelow(A);
    }
}

export function pointOnGroundLL(lat, lon) {
    const A = LLAToEUS(lat, lon, 100000);
    return pointOnGround(A)
}

export function pointAbove(point, height) {
    const center = V3(0,-wgs84.RADIUS,0);
    const toPoint = point.clone().sub(center).normalize();
    return point.clone().add(toPoint.multiplyScalar(height));
}

export function adjustHeightAboveGround (point, height) {
    const ground = pointOnGround(point);
    return pointAbove(ground, height);
}

export function forceFilterChange(texture, filter, renderer) {
    // Check if the filter is already set
    if (texture.minFilter === filter && texture.magFilter === filter) {
        return; // No need to update
    }

    // Update texture filter properties
    texture.minFilter = filter;
    texture.magFilter = filter;

    // Retrieve WebGL properties and texture
    const textureProperties = renderer.properties.get(texture);
    const webglTexture = textureProperties.__webglTexture;

    if (webglTexture) {
        // Get the WebGL context from the renderer
        const gl = renderer.getContext();

        // Map Three.js filters to WebGL filters
        let glFilter;
        switch (filter) {
            case LinearFilter:
                glFilter = gl.LINEAR;
                break;
            case NearestFilter:
                glFilter = gl.NEAREST;
                break;
            // Add additional cases here for other filters if necessary
            default:
                console.warn('Unsupported filter type:', filter);
                glFilter = gl.NEAREST; // Default to nearest
                break;
        }

        // Bind the texture to update it
        gl.bindTexture(gl.TEXTURE_2D, webglTexture);

        // Update the minFilter and magFilter
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter);

        // Unbind the texture
        gl.bindTexture(gl.TEXTURE_2D, null);

        // Ensure Three.js is aware of the state change
        texture.needsUpdate = false;
    } else {
        console.error('No WebGL texture handle found for the texture.');
    }
}

// given a url to a texture, create a cube that has that texture on all sides
// at a given position and size.
export function testTextureCube(url, position, size, scene) {

    console.log("Creating texture cube at "+position.x+","+position.y+","+position.z+" with size "+size+" and texture "+url)

    // first load the texture
    const loader = new TextureLoader();
    const texture = loader.load(url);
//    texture.encoding = sRGBEncoding;

    // create a basic material with that texture
    const material = new MeshBasicMaterial({map: texture});

    // create a cube geometry
    const geometry = new BoxGeometry(size, size, size);

    // create the mesh
    const mesh = new Mesh(geometry, material);

    // set the position
    mesh.position.copy(position);

    // add it to the scene
    scene.add(mesh);

}

// as above but a solid color
export function testColorCube(color, position, size, scene) {
    let materials = [];

    if (isArray(color)) {
        color.forEach(c => {
            c = new Color(c)
            materials.push(new MeshBasicMaterial({color: c}));
            materials.push(new MeshBasicMaterial({color: c}));
        });
    } else {

        // convert to three.js color
        color = new Color(color)

        // create a cube that has the color on each face
        // top and bottom at 100%
        // front and back at 50%
        // left and right at 25%
        const halfColor = color.clone().multiplyScalar(0.5);
        const quarterColor = color.clone().multiplyScalar(0.25);

        const leftRightMaterial = new MeshBasicMaterial({color: color});
        const frontBackMaterial = new MeshBasicMaterial({color: halfColor});
        const topBotMaterial = new MeshBasicMaterial({color: quarterColor});

        materials = [leftRightMaterial, leftRightMaterial, frontBackMaterial, frontBackMaterial, topBotMaterial, topBotMaterial]
    }

    // create a cube geometry
    const geometry = new BoxGeometry(size, size, size);

    // create the mesh with a different material for each face
    const mesh = new Mesh(geometry, materials);

    // add to scene
    mesh.position.copy(position);
    scene.add(mesh);








}

