// Utlity functions to make vectors, 2 or 3 size.
import {Vector2, Vector3, Color} from "three";


export function V2(x = 0, y = 0) {
    return new Vector2(x, y);
} // https://stackoverflow.com/questions/41275311/a-good-way-to-find-a-vector-perpendicular-to-another-vector
// expanded version of THREE.Line.intersectSphere
// to return both points
// THIS THREE.JS FUNCTION IS INACCURATE for large numbers
// It also seems to return different results in Safari
export function intersectSphere2OLD(ray, sphere, target0, target1) {

    let _vector$a = new Vector3()
    _vector$a.subVectors(sphere.center, ray.origin);
    const tca = _vector$a.dot(ray.direction);
    const d2 = _vector$a.dot(_vector$a) - tca * tca;
    const radius2 = sphere.radius * sphere.radius;

    if (d2 > radius2) return null;

    const thc = Math.sqrt(radius2 - d2);


    // t0 = first intersect point - entrance on front of sphere
    const t0 = tca - thc;

    // t1 = second intersect point - exit point on back of sphere
    const t1 = tca + thc;

    // test to see if both t0 and t1 are behind the ray - if so, return null
    if (t0 < 0 && t1 < 0) return null;

    // test to see if t0 is behind the ray:
    // if it is, the ray is inside the sphere, so return the second exit point scaled by t1,
    // in order to always return an intersect point that is in front of the ray.
    //if ( t0 < 0 ) return

    // assuming the ray is not inside the sphere for now.
    ray.at(t1, target1);

    // else t0 is in front of the ray, so return the first collision point scaled by t0
    ray.at(t0, target0);

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
export function intersectEllipse(ray, sphere, minorRadius, axis, target0, target1) {
    const ratio = sphere.radius / minorRadius; // ratio to scale UP
    const rayScaled = ray.clone();
    rayScaled.origin.sub(sphere.center)
    rayScaled.origin = scaleVectorInDirection(rayScaled.origin, axis, scale)
    rayScaled.origin.add(sphere.center)
    rayScaled.direction = scaleVectorInDirection(rayScaled.direction, axis, scale).normalize()

    const collision = intersectSphere2(rayScaled, sphere, target0, target1)
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
export function intersectSphere2(ray, sphere, target0, target1) {

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
    } else {
        return false;
    }

}

export function V3(x = 0, y = 0, z = 0) {
    return new Vector3(x, y, z);
}

// create a Vectorthree from an array, or from three parameters, or a Vector3
export function MV3(x = 0, y = 0, z = 0) {
    if (x.x != undefined) {
        // it's a THREE.Vector3, or similar with x,y,z memmbers
        return (new Vector3()).copy(x);
    } else if (Array.isArray(x)) {
        // it's an array, so use the first three members
        return new Vector3(x[0], x[1], x[2]);
    }
    // its just three parameters.
    return new Vector3(x, y, z);


}

// given a vector. find an vector perpendicular to it
// to do this we take the cross product of the vector an whatever basis vector it is least parallel to
export function perpendicularVector(N) {
    var Ax = Math.abs(N.x)
    var Ay = Math.abs(N.y)
    var Az = Math.abs(N.z)
    var P;
    if (Ax < Ay)
        P = Ax < Az ? V3(0, -N.z, N.y) : V3(-N.y, N.x, 0);
    else
        P = Ay < Az ? V3(N.z, 0, -N.x) : V3(-N.y, N.x, 0);
    return P;
}

export function makeMatrix4PointYAt(_normal) {
    // it's a surface normal, but not necessarily normalized
    const _y = _normal.clone().normalize()
    const _x = perpendicularVector(_y)
    const _z = _x.clone().cross(_y)
    const m = new Matrix4()
    const te = m.elements;
    te[0] = _x.x;
    te[4] = _y.x;
    te[8] = _z.x;
    te[1] = _x.y;
    te[5] = _y.y;
    te[9] = _z.y;
    te[2] = _x.z;
    te[6] = _y.z;
    te[10] = _z.z;
    return m;

}

export function hexColor(color) {
    color = new Color(color); // ensures strings get converted to color objects
    const hex = "#"+color.getHexString();
//    console.log("hexColor", color, hex);
    return hex;
}
