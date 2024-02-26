import {Plane, Vector3} from '../three.js/build/three.module.js';
import {atan2, cos, degrees, radians, sin} from "./utils.js";
import {V3} from "./threeExt";
import {ECEF2EUS, wgs84} from "./LLA-ECEF-ENU";
import {Sit} from "./Globals";

// Local coordinates are a local tangent plane similar to ENU, but with N = -Z
// so XYZ = EUS (East, Up, South), not ENU (East, North, Up)
// See: https://en.wikipedia.org/wiki/Local_tangent_plane_coordinates
//
// the Az=0 and El=0 is always along the -Z axis (horizontal, North)
// This can be thought of as a position on a unit sphere.
// El is relative to the horizontal plane, so jetPitch is irrelevant
// Az is relative to the jet's forward direction in the horizontal plane


function CueAz(el,az,jetRoll,jetPitch) {
    // get a unit vector in the direction of Az/El
    // the Az=0 and El=0 is always along the global -Z axis (horizontal, or N in ENU)
    // This can be thought of as a position on a unit sphere.
    // El is relative to the horizontal plane, so jetPitch is irrelevant
    // Az is relative to the jet's forward direction in the horizontal plane
    var AzElHeading = EA2XYZ(el, az, 1)

    // Create a Plane object, representing the wing plane
    // (a "plane" is a flat 2D surface in 3D space, not an aeroplane)
    // the plane in Hessian normal form, normal unit vector (jetUp)
    // and a distance from the origin (0, as the origin is the ATFLIR camera, i.e. the jet)
    var jetUp = new Vector3(0, 1, 0) // y=1 is the jet up unit vector with no rotation
    jetUp.applyAxisAngle(V3(0,0,1),-radians(jetRoll)) // apply roll about Z axis (-Z is fwd, so -ve)
    jetUp.applyAxisAngle(V3(1,0,0),radians(jetPitch))  // apply pitch about X axis (right)
    var wingPlane = new Plane(jetUp,0)

    // project AzElHeading onto wingPlane, giving cueHeading
    var cueHeading = wingPlane.projectPoint(AzElHeading,new Vector3)

    // now find the jet's forward vector, which will be in the wing plane
    // same rotations as with the up vector
    var jetForward = new Vector3(0, 0, -1)
    jetForward.applyAxisAngle(V3(0,0,1),-radians(jetRoll))
    jetForward.applyAxisAngle(V3(1,0,0),radians(jetPitch))

    // calculate the angle between the jet forward vector
    var cueAz = degrees(jetForward.angleTo(cueHeading))

    // angleTo always returns a positive value, so we
    // need to negate it unless cross product is in same direction as jet up
    // the cross product will give a vector either up or down from the plane
    // depending on if cueHeading is left or right of JetForward when looking down
    var cross = cueHeading.clone().cross(jetForward)
    // then use a dot product which returns positive if two vectors are in the same direction
    var sign = cross.dot(jetUp)
    if (sign < 0) cueAz = -cueAz

    // The return value is plotted in cyan (light blue)
    return cueAz;
}

// These were written for Left Handed Coordinates, so returning -z
// as THREE.js is right handed

// pitch = rotation of the "ball", relative to straight ahead
// roll = clockwise roll of the entire system along the forward axis
// jetPitch is the angle of boresight above horizon, rotation about X
// These have somewhat nominal orientations, but 0,0 is straight ahead
// and when roll = 0, a positive pitch is vertical.
// The forward axis is -z, vertical is y, right = x.
function PRJ2XYZ(pitch, roll, jetPitch, r) {
    roll -=180
    if (roll < 360) roll += 360

    const x = r * sin(radians(pitch)) * sin(radians(roll))
    const y = r * sin(radians(pitch)) * cos(radians(roll))
    const z = r * cos (radians(pitch))
    const jetPitchR = radians(-jetPitch)
    const za = z * cos(jetPitchR) + y * sin(jetPitchR)
    const ya = y * cos(jetPitchR) - z * sin(jetPitchR)
    return new Vector3(x,ya,-za);
}

// el = Elevation is the angle above horizontal
// az = Azimuth is the angle in the horizontal plane relative to the direction of travel

// Calculations here assume positive z is forward, right hand
// but return -ve z (left hand)
// the XYZ result is in the GLOBAL frame of reference

function EA2XYZ(el, az, r) {
    const x = r *  cos(radians(el)) * sin(radians(az))
    const y = r * sin(radians(el))
    const z = r *  cos(radians(el)) * cos (radians(az))

    return new Vector3(x,y,-z);
}

// note, this assumes normalized global x,y,z coordiantes (on the surface of a sphere centerd at 0,0,0))
function XYZ2EA(v) {
    const el = degrees(atan2(v.y, Math.sqrt(v.z*v.z + v.x*v.x)))
    const az = degrees(atan2(v.x,-v.z))
    return [el,az];
}

// convert global X,Y,Z and jetPitch to pod Pitch and Roll.
// jetPitch is the angle of boresight above horizon
// so first we need to convert to the frame of reference of the pod
// by rotating about x (right) by jetPitch
// Will always return a positive pitch.
// But there's always a solution with the same negative pitch
// and roll+180 or roll-180
// if you are seeing minimum movement, then the algorithm should consider that.
function XYZJ2PR(v,jetPitch) {

    const jetPitchR = radians(-jetPitch)
    const x = v.x
    const y = v.y * cos(jetPitchR) - v.z * sin(jetPitchR)
    const z = v.z * cos(jetPitchR) + v.y * sin(jetPitchR)

    const pitch = degrees(atan2(Math.sqrt(x*x + y*y),-z))
    var roll = degrees(atan2(x,y))
    roll += 180
    if (roll >180) roll -= 360;
    return [pitch, roll]
}

// Convert El, Al, and jetPitch to Pitch and Roll
// by converting global El and Al first to global x,y,z
// then converting that global x,y,z, together with jetPitch to pitch and roll
function EAJP2PR(el, az, jetPitch) {
    return XYZJ2PR(EA2XYZ(el,az,1),jetPitch)
}

// convert a pitch, roll, and jetPitch to elevation and azimuth
// first convert pitch, roll, and jetPitch to global xyz, then that to global El and Az
function PRJ2EA(pitch, roll, jetPitch) {
    return XYZ2EA(PRJ2XYZ(pitch,roll,jetPitch,1))
}

// How much is the ground below the ESU plane
// x, y and radius are in meters
// Note there two Pythagorean ways you can derive drop
// Either the distance straight down, or the distance towards the center of the Earth
// this uses the former, so subtracting this from Y will give a point on the surface.
// (using the latter would need a scaled vector towards the center)
function drop(x,y,radius) {
    // dist = how far it is from 0,0 horizontally
    const dist = Math.sqrt(x*x + y*y);
    return radius - Math.sqrt(radius*radius - dist*dist)

}

export function pointAltitude(position, radius=wgs84.RADIUS) {
    return V3(0,-radius,0).sub(position).length() - radius;
}


export function raisePoint(position, raise, radius=wgs84.RADIUS) {
    let up = getLocalUpVector(position, radius)
    let result = position.clone().add(up.multiplyScalar(raise))
    return result;
}


// get as a point, drop below surface
function drop3(x,y,r) {
    return new Vector3(x,y,-drop(x,y,r))
}


export {drop, drop3, CueAz,PRJ2EA,EAJP2PR,XYZJ2PR,XYZ2EA,EA2XYZ,PRJ2XYZ}


// position is in EUS (East, Up, South) coordinates relative to an arbitary origin
// origin might be above the surface (in Gimbal it's the start of the jet track, so that is passed in
export function getLocalUpVector(position, radius=wgs84.RADIUS) {
    const center = V3(0, -(radius), 0)
    const centerToPosition = position.clone().sub(center)
    return centerToPosition.normalize();
}

export function getLocalDownVector(position, radius=wgs84.RADIUS) {
    return getLocalUpVector(position, radius).negate();
}


export function getLocalNorthVector(position, radius=wgs84.RADIUS) {
    // to get a northish direction we get the vector from here to the north pole.
    // to get the north pole in EUS, we take the north pole's position in ECEF
    const northPoleECEF = V3(0,0,radius)
    const northPoleEUS = ECEF2EUS(northPoleECEF,radians(Sit.lat),radians(Sit.lon),radius)
    const toNorth = northPoleEUS.clone().sub(position).normalize()
    // take only the component perpendicular
    const up = getLocalUpVector(position, radius);
    const dot = toNorth.dot(up)
    const north = toNorth.clone().sub(up.clone().multiplyScalar(dot)).normalize()
    return north;
}

export function getLocalEastVector(position, radius=wgs84.RADIUS) {
    const up = getLocalUpVector(position,radius);
    const north = getLocalNorthVector(position, radius);
    const south = north.clone().negate()
    const east = V3().crossVectors(up, south)
    return east;


}


// given a position (A) and a vector direction (fwd), and a radius (might be tops of clouds), then find the position of the horizion
// in that direction
// this actually calculates the distance to the horizon, and then a point that distance along the fwd vector.
export function calcHorizonPoint(A, fwd, horizonAlt, earthRadius) {
    // altAboveClouds is the altitude of the A point

    var horizonRadius = earthRadius + horizonAlt

    // convert points to ECEF (i.e. origin at the center of the earth)
    var pos = A.clone()
    pos.y += earthRadius

    var altAboveSphere = pos.length() - horizonRadius
    var distToHorizon = Math.sqrt((horizonRadius + altAboveSphere) * (horizonRadius + altAboveSphere) - horizonRadius * horizonRadius);
    var fwdHorizontal = fwd.clone()
    fwdHorizontal.normalize()
    fwdHorizontal.multiplyScalar(distToHorizon)
    var horizonPoint = A.clone().add(fwdHorizontal)

    return horizonPoint;
}


// given a rotation matrix m, it's comprised of orthogonal x,y, and z basis vectors
// which define an object or camera orientation
// -z is the forward basis, meaning that it's the direction the camera is looking in
// x and y are rotated around the z-axis by the roll angle
// the roll angle is the angle or y from a vector orthogonal to z and pointing up
// find the angle the y basis vector is rotated around the z basis vector
// from a y-up orientation
export function extractRollFromMatrix(m) {
    var xBasis = V3();
    var yBasis = V3();
    var zBasis = V3();
    m.extractBasis(xBasis, yBasis, zBasis)
    xBasis.normalize()
    yBasis.normalize()
    zBasis.normalize()

    // right is orthogonal to the forward vector and the global up
    var right = zBasis.clone().cross(V3(0, 1, 0))

    // yUP is the y basis rotated upright
    var yUp = right.clone().cross(zBasis)

    // so calculate how much we rotated it
    var angle = yUp.angleTo(yBasis)

    // flip depending on which side of the plane defined by the right vector
    if (right.dot(yBasis) > 0)
        angle = -angle;

    return angle
}

export function pointOnSphereBelow(p) {
    const center = V3(0,-wgs84.RADIUS, 0);
    const toP = p.clone().sub(center)
    return toP.normalize().multiplyScalar(wgs84.RADIUS).add(center);
}

export function altitudeAboveSphere(p) {
    const center = V3(0,-wgs84.RADIUS, 0);
    return p.clone().sub(center).length() - wgs84.RADIUS;
}