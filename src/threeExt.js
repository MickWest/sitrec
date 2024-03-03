// threeExt.js - Mick's extensions to THREE.js
import {
    ArrowHelper,
    BoxGeometry,
    BufferGeometry,
    Color,
    Float32BufferAttribute,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    SphereGeometry,
    Vector2,
    Vector3,
    WireframeGeometry
} from '../three.js/build/three.module.js';

import {drop3} from "./SphericalMath"
import {GlobalScene} from "./LocalFrame";
import {assert} from "./utils"
import * as LAYER from "./LayerMasks";


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


// expanded version of THREE.Line.intersectSphere
// to return both points
// THIS THREE.JS FUNCTION IS INACCURATE for large numbers
// It also seems to return different results in Safari
export 	function intersectSphere2OLD( ray, sphere, target0, target1 ) {

    let _vector$a = new Vector3()
    _vector$a.subVectors( sphere.center, ray.origin );
    const tca = _vector$a.dot( ray.direction );
    const d2 = _vector$a.dot( _vector$a ) - tca * tca;
    const radius2 = sphere.radius * sphere.radius;

    if ( d2 > radius2 ) return null;

    const thc = Math.sqrt( radius2 - d2 );



    // t0 = first intersect point - entrance on front of sphere
    const t0 = tca - thc;

    // t1 = second intersect point - exit point on back of sphere
    const t1 = tca + thc;

    // test to see if both t0 and t1 are behind the ray - if so, return null
    if ( t0 < 0 && t1 < 0 ) return null;

    // test to see if t0 is behind the ray:
    // if it is, the ray is inside the sphere, so return the second exit point scaled by t1,
    // in order to always return an intersect point that is in front of the ray.
    //if ( t0 < 0 ) return

    // assuming the ray is not inside the sphere for now.
    ray.at( t1, target1 );

    // else t0 is in front of the ray, so return the first collision point scaled by t0
    ray.at( t0, target0 );

    return true;

}


function scaleVectorInDirection(v, u, s) {
    // Ensure u is a unit vector
    u.normalize();

    // Project v onto u
    const projection = u.clone().multiplyScalar(v.dot(u));

    // Scale the projection
    const scaledProjection = projection.multiplyScalar(s);

    // Subtract the projection from v to get the component perpendicular to u
    const perpendicularComponent = v.clone().sub(projection);

    // Add the scaled projection back to the perpendicular component
    return perpendicularComponent.add(scaledProjection);
}

// for an ellipse we have two radii, and we specify the direction of the short axis
// (i.e. for the Earth, it's the axis of rotation, through north and south poles)
// we are going to to the collision detection using intersectSphere2 and the major Radius
// so we need to scale up the ray, do the collision check, and scale down the results
export function intersectEllipse( ray, sphere, minorRadius, axis, target0, target1 ) {
    const ratio = sphere.radius/minorRadius; // ratio to scale UP
    const rayScaled = ray.clone();
    rayScaled.origin.sub(sphere.center)
    rayScaled.origin = scaleVectorInDirection(rayScaled.origin, axis, scale)
    rayScaled.origin.add(sphere.center)
    rayScaled.direction = scaleVectorInDirection(rayScaled.direction, axis, scale).normalize()

    const collision = intersectSphere2( rayScaled, sphere, target0, target1)
    if (collision) {
        // Scale down the collision points
        if (target0) {
            target0.sub(sphere.center);
            target0 = scaleVectorInDirection(target0, axis, 1 / ratio);
            target0.add(sphere.center);
        }
        if (target1) {
            target1.sub(sphere.center);
            target1 = scaleVectorInDirection(target1, axis, 1 / ratio);
            target1.add(sphere.center);
        }
    }
    return collision;

}



// https://www.codeproject.com/Articles/19799/Simple-Ray-Tracing-in-C-Part-II-Triangles-Intersec
export 	function intersectSphere2( ray, sphere, target0, target1 ) {

    const vx = ray.direction.x
    const vy = ray.direction.y
    const vz = ray.direction.z

    const px = ray.origin.x
    const py = ray.origin.y
    const pz = ray.origin.z

    const cx = sphere.center.x
    const cy = sphere.center.y
    const cz = sphere.center.z

    const radius = sphere.radius;

    var A = (vx * vx + vy * vy + vz * vz);
    var B = 2.0 * (px * vx + py * vy + pz * vz - vx * cx - vy * cy - vz * cz);

    var C = px * px - 2 * px * cx + cx * cx + py * py - 2 * py * cy + cy * cy +
        pz * pz - 2 * pz * cz + cz * cz - radius * radius;
    var D = B * B - 4 * A * C;

    if (D >= 0) {
        var t1 = (-B - Math.sqrt(D)) / (2.0 * A);

        var t2 = (-B + Math.sqrt(D)) / (2.0 * A);
        if (t1 > t2) {
            var t = t1;
            t1 = t2
            t2 = t;
        }
        if (target0 !== undefined) {
            // if target0 is behind the origin, then we don't want to return it
            if (t1 < 0) {
                if (t2 < 0) {
                    return false;
                }
                // if t1 is behind and t2 is in front, so just use t2
                t1 = t2;
            }

            target0.copy(ray.origin)
            target0.add(ray.direction.clone().multiplyScalar(t1))

            if (target1 !== undefined && t2 !== t1) {
                target1.copy(ray.origin)
                target1.add(ray.direction.clone().multiplyScalar(t2))
            }
        }
        return true;
    }
    else {
        return false;
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
export function DebugSphere(name, origin, radius = 100, color = 0xffffff) {

    color = new Color(color)  // convert from whatever format, like "green" or "#00ff00" to a THREE.Color(r,g,b)

    if (DebugSpheres[name] === undefined) {
        const geometry = new SphereGeometry(1, 10, 10);
        const material = new MeshBasicMaterial({color: color});
        var sphere = new Mesh(geometry, material);
        DebugSpheres[name] = sphere
        sphere.layers.mask = LAYER.MASK_HELPERS;
        GlobalScene.add(sphere);
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

var DebugArrows = {}

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
        _headLength = _length * _headLength;
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

// XYZ axes colored RGB
export function DebugAxes(name, scene, position, length) {
    DebugArrow(name+"Xaxis",V3(1,0,0), position.clone().sub(V3(length/2,0,0)),length,"#FF8080")
    DebugArrow(name+"Yaxis",V3(0,1,0), position.clone().sub(V3(0,length/2,0)),length,"#80FF80")
    DebugArrow(name+"Zaxis",V3(0,0,1), position.clone().sub(V3(0,0,length/2)),length,"#8080FF")
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


// Utlity functions to make vectors, 2 or 3 size.
function V2(x = 0, y = 0) {
    return new Vector2(x, y);
}

function V3(x = 0, y = 0, z = 0) {
    return new Vector3(x, y, z);
}

// create a Vectorthree from an array, or from three parameters, or a Vector3
export function MV3(x=0,y=0,z=0) {
    if (x.x != undefined) {
        // it's a THREE.Vector3, or similar with x,y,z memmbers
        return (new Vector3()).copy(x);
    }
    else if (Array.isArray(x)) {
        // it's an array, so use the first three members
        return new Vector3(x[0], x[1], x[2]);
    }
    // its just three parameters.
    return new Vector3(x, y, z);


}

// https://stackoverflow.com/questions/41275311/a-good-way-to-find-a-vector-perpendicular-to-another-vector
// given a vector. find an vector perpendicular to it
// to do this we take the cross product of the vector an whatever basis vector it is least parallel to
export function perpendicularVector(N){
    var Ax = Math.abs(N.x)
    var Ay = Math.abs(N.y)
    var Az = Math.abs(N.z)
    var P;
    if (Ax < Ay)
        P= Ax < Az ? V3(0, -N.z, N.y) : V3(-N.y, N.x, 0);
    else
        P= Ay < Az ? V3(N.z, 0, -N.x) : V3(-N.y, N.x, 0);
    return P;
}

export function makeMatrix4PointYAt(_normal){
    // it's a surface normal, but not necessarily normalized
    const _y = _normal.clone().normalize()
    const _x = perpendicularVector(_y)
    const _z = _x.clone().cross(_y)
    const m = new Matrix4()
    const te = m.elements;
    te[ 0 ] = _x.x; te[ 4 ] = _y.x; te[ 8 ] = _z.x;
    te[ 1 ] = _x.y; te[ 5 ] = _y.y; te[ 9 ] = _z.y;
    te[ 2 ] = _x.z; te[ 6 ] = _y.z; te[ 10 ] = _z.z;
    return m;

}

export function pointObject3DAt(object, _normal) {
    const m = makeMatrix4PointYAt(_normal)
    object.quaternion.setFromRotationMatrix( m );
}

export {V3};
export {V2};

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

    // Recursive function to dispose of materials and geometries
    function disposeObject(object) {
        if (object.type === 'Mesh' || object.type === 'Line' || object.type === 'Points') {
            // Dispose geometry
            if (object.geometry) {
                object.geometry.dispose();
            }

            // Dispose materials
            if (Array.isArray(object.material)) {
                // In case of an array of materials, dispose each one
                object.material.forEach(material => disposeMaterial(material));
            } else {
                // Single material
                disposeMaterial(object.material);
            }
        }

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
    while (scene.children.length > 0) {
        disposeObject(scene.children[0]);
        scene.remove(scene.children[0]);
    }
}