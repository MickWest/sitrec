// A variety of functions for converting between LLA (lat, lon, alt) and ECEF (earth centered earth fixed) and ENU (east, north, up)
// as well as some other useful related functions

import {Matrix3, Vector3} from "three";
import {cos, degrees, radians, sin} from "./utils";
import {Sit} from "./Globals";
import {assert} from "./assert.js";
import {V3} from "./threeUtils";


// This is the distance in KM between two lat/long locations
// assumes a sphere of average radius
export function haversineDistanceKM(lat1, lon1, lat2, lon2) {
    var dLat = radians(lat2 - lat1);
    var dLon = radians(lon2 - lon1);
    var rLat1 = radians(lat1);
    var rLat2 = radians(lat2);
    const sin_dLat = Math.sin(dLat / 2);
    const sin_dLon = Math.sin(dLon / 2);
    var a = sin_dLat * sin_dLat +
        sin_dLon * sin_dLon * Math.cos(rLat1) * Math.cos(rLat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKM * c;
}

export function haversineDistanceABKM(a, b) {
    return haversineDistanceKM(a.y, a.x, b.y, b.x);
}


/////////////////
// https://github.com/lakowske/ecef-projector/blob/master/index.js

// wgs84 defines the ellipse. It's the standard earth shape used by Google Earth.
// it's very similar to GRS 80
// see https://en.wikipedia.org/wiki/World_Geodetic_System
export var wgs84 = {
    RADIUS: 6378137,                            // exact, and same as in GRS 80
    FLATTENING_DENOM: 298.257223563,
    radiusMiles: 3963.190592


};           // vs 298.257222100882711 for GRS 80

wgs84.FLATTENING = 1/wgs84.FLATTENING_DENOM;
wgs84.POLAR_RADIUS = wgs84.RADIUS*(1-wgs84.FLATTENING);
wgs84.CIRC = 2*Math.PI*wgs84.RADIUS


// Other elipsoids I've seen:
//
// This is the default valued for "Other" in the NGS NCAT tool
//
// https://apa.ny.gov/gis/GisData/Wetlands/regulatorywetlands.html
// Horizontal Datum Name: North American Datum of 1983
// Ellipsoid Name: GRS 1980
// Semi-Major Axis: 6378206.40
// Denominator of Flattening Ratio: 294.98

///////////////////////////////////////////////////////////////////////////
// Source of the ECEF->LLA algorithm was given as
// * Datum Transformations of GPS Positions
// * Application Note
// NAL Research
// * 5th July 1999
//
// But it's actually B. R. Bowring, “Transformation from Spatial to Geographical Coordinates,”
//                   Survey Review, 23:181 (1976) 323-327


/*
 * Convert GPS coordinates (degrees) to Cartesian coordinates (meters)
 */
export function project(latitude, longitude, altitude) {
    return RLLAToECEF(radians(latitude), radians(longitude), altitude);
}

/*
 * Convert Cartesian coordinates (meters) to GPS coordinates (degrees)
 */
export function unproject(x, y, z) {
    var gps = ECEFToLLA(x, y, z);

    gps[0] = degrees(gps[0]);
    gps[1] = degrees(gps[1]);

    return gps;
}


export function RLLAToECEF(latitude, longitude, altitude) {


    var a    = wgs84.RADIUS;
    var f    = wgs84.FLATTENING;
    var b    = wgs84.POLAR_RADIUS;
    var asqr = a*a;
    var bsqr = b*b;
    var e = Math.sqrt((asqr-bsqr)/asqr);
    var eprime = Math.sqrt((asqr-bsqr)/bsqr);

    //Auxiliary values first
    var N = getN(latitude);
    var ratio = (bsqr / asqr);

    //Now calculate the Cartesian coordinates
    var X = (N + altitude) * Math.cos(latitude) * Math.cos(longitude);
    var Y = (N + altitude) * Math.cos(latitude) * Math.sin(longitude);

    //Sine of latitude looks right here
    var Z = (ratio * N + altitude) * Math.sin(latitude);

    return V3(X,Y,Z)
}


export function LLAToECEF_Sphere(latitude, longitude, altitude) {

    var a    = wgs84.RADIUS;  // using the standard wgs84.RADIUS
    var X = (a + altitude) * Math.cos(latitude) * Math.cos(longitude);
    var Y = (a + altitude) * Math.cos(latitude) * Math.sin(longitude);
    var Z = (a + altitude) * Math.sin(latitude);

    return [X, Y, Z];
}

export function RLLAToECEFV_Sphere(latitude, longitude, altitude, radius = wgs84.RADIUS) {

    var X = (radius + altitude) * Math.cos(latitude) * Math.cos(longitude);
    var Y = (radius + altitude) * Math.cos(latitude) * Math.sin(longitude);
    var Z = (radius + altitude) * Math.sin(latitude);

    return new Vector3(X, Y, Z);
}

// Bowring method
// NOTE: this uses the WGS84 ellipse
// if using simple maps like map33 that use a sphere, then use the sphere version, next.
export function ECEFToLLA(X, Y, Z) {
    var a    = wgs84.RADIUS;
    var f    = wgs84.FLATTENING;
    var b    = wgs84.POLAR_RADIUS;
    var asqr = a*a;
    var bsqr = b*b;
    var e = Math.sqrt((asqr-bsqr)/asqr);
    var eprime = Math.sqrt((asqr-bsqr)/bsqr);

    //Auxiliary values first
    var p = Math.sqrt(X*X + Y*Y);
    var theta = Math.atan((Z*a)/(p*b));

    var sintheta = Math.sin(theta);
    var costheta = Math.cos(theta);

    var num = Z + eprime * eprime * b * sintheta * sintheta * sintheta;
    var denom = p - e * e * a * costheta * costheta * costheta;

    //Now calculate LLA
    var latitude  = Math.atan(num/denom);
    var longitude = Math.atan(Y/X);
    var N = getN(latitude);
    var altitude  = (p / Math.cos(latitude)) - N;

    if (X < 0 && Y < 0) {
        longitude = longitude - Math.PI;
    }

    if (X < 0 && Y > 0) {
        longitude = longitude + Math.PI;
    }

    return [latitude, longitude, altitude];
}

export function ECEFToLLA_Sphere(X, Y, Z) {
    var R = wgs84.RADIUS; // Radius of the Earth

    // Calculate LLA
    var latitude  = Math.atan2(Z, Math.sqrt(X*X + Y*Y));
    var longitude = Math.atan2(Y, X);
    var altitude  = Math.sqrt(X*X + Y*Y + Z*Z) - R;

    return [latitude, longitude, altitude];
}


// same functions, but passing and returning parameters as a Vector3
// with LL as degrees
export function ECEFToLLAVD_Sphere(V) {
    var a = ECEFToLLA_Sphere(V.x,V.y,V.z);
    return new Vector3(degrees(a[0]),degrees(a[1]),a[2])
}

export function EUSToLLA(eus) {
    const ecef = EUSToECEF(eus);
    return ECEFToLLAVD_Sphere(ecef);
}




// same functions, but passing and returning parameters as a Vector3
// with LL as degrees
export function ECEFToLLAVD(V) {
    var a = ECEFToLLA(V.x,V.y,V.z);
    return new Vector3(degrees(a[0]),degrees(a[1]),a[2])
}

// and with radians
export function ECEFToLLAV(V) {
    var a = ECEFToLLA(V.x,V.y,V.z);
    return new Vector3((a[0]),(a[1]),a[2])
}


export function LLAToECEFVD(V) {
    var a = RLLAToECEF(radians(V.x),radians(V.y),V.z);
    return new Vector3(a[0],a[1],a[2])
}


// N is the radius of curvature at a given latitude
export function getN(latitude) {

    var a    = wgs84.RADIUS;
    var f    = wgs84.FLATTENING;
    var b    = wgs84.POLAR_RADIUS;
    var asqr = a*a;
    var bsqr = b*b;
    var e = Math.sqrt((asqr-bsqr)/asqr);
    var eprime = Math.sqrt((asqr-bsqr)/bsqr);

    var sinlatitude = Math.sin(latitude);
    var denom = Math.sqrt(1-e*e*sinlatitude*sinlatitude);
    var N = a / denom;
    return N;
}


// Models in Google Earth exist in a local coordinate system, where point a is going to be at 0,0,0
// and point B will be a transformed A2B vector away (same length)
// we need to tranlast between coordinate systems. So we need to calculate a set or orthogonal vectors
// for a coordinate system at A
// The local coordinate system has basis vectors in ECEF of:
// x = due east (right)
// y = due north (forward)
// z = up from center (up)
// This is known in the literature as an ENU system.


// see: https://en.wikipedia.org/wiki/Geographic_coordinate_conversion#Geodetic_to/from_ENU_coordinates
// the latitude and longitude define the ENU coordinate system realtive to A
// so we just need the standard transform
// note Google Earth uses Geodetic latitude, as required. Meaning the up vector is perpendicular to
// the tangent of the ellipse, and not through the center of the ellipse
// this is basically a rotation matrix created with two angles.
// Roatate about (y?) with latitude, and then about z with longtitude

// lat1, lon1 in radians
export function ECEF2ENU(pos,lat1, lon1, radius, justRotate=false) {
    assert(radius !== undefined, "ECEF2ENU needs explicit radius" )
    // the origin in ECEF coordinates is at the surface with lat1, lon1

    var mECEF2ENU = new Matrix3().set(
        -sin(lon1), cos(lon1), 0,
        -sin(lat1) * cos(lon1), -sin(lat1) * sin(lon1), cos(lat1),
        cos(lat1) * cos(lon1), cos(lat1) * sin(lon1), sin(lat1)
    );
    var enu
    if (!justRotate) {
        var originECEF = RLLAToECEFV_Sphere(lat1, lon1, 0, radius)
        enu = pos.clone().sub((originECEF)).applyMatrix3(mECEF2ENU)
    } else {
        enu = pos.clone().applyMatrix3(mECEF2ENU)
    }

    return enu;
}

export function ECEF2EUS(pos,lat1, lon1, radius, justRotate=false) {
    var enu = ECEF2ENU(pos,lat1, lon1, radius, justRotate)
    return V3(enu.x, enu.z, -enu.y)
}

// This is a work in progress.
// export function EUSToECEF(posEUS, lat1, lon1, radius) {
//     var mECEF2ENU = new Matrix3().set(
//         -sin(lon1), cos(lon1), 0,
//         -sin(lat1) * cos(lon1), -sin(lat1) * sin(lon1), cos(lat1),
//         cos(lat1) * cos(lon1), cos(lat1) * sin(lon1), sin(lat1)
//     );
//     var mENU2ECEF = new Matrix3().getInverse(ECEF2ENU);
//     var originECEF = RLLAToECEFV_Sphere(lat1, lon1, 0, radius)
//     var enu = V3(eus.x, -eus.z, eus.y)
//     var ecef = enu.applyMatrix3() // TODO!!!!!!!!
//
// }

export function EUSToECEF(posEUS, radius) {
    assert(radius === undefined, "undexpected radius in EUSToECEF")

    const lat1 = radians(Sit.lat)
    const lon1 = radians(Sit.lon)

    var mECEF2ENU = new Matrix3().set(
        -Math.sin(lon1), Math.cos(lon1), 0,
        -Math.sin(lat1) * Math.cos(lon1), -Math.sin(lat1) * Math.sin(lon1), Math.cos(lat1),
        Math.cos(lat1) * Math.cos(lon1), Math.cos(lat1) * Math.sin(lon1), Math.sin(lat1)
    );

    var mENU2ECEF = new Matrix3()
    mENU2ECEF.copy(mECEF2ENU)
    mENU2ECEF.invert()

    // RLLAToECEFV_Sphere converts from spherical coordinates to ECEF
    var originECEF = RLLAToECEFV_Sphere(lat1, lon1, 0);

    // Convert from eus to enu
    var enu = new Vector3(posEUS.x, -posEUS.z, posEUS.y);

    // Apply the matrix transformation
    var ecef = enu.applyMatrix3(mENU2ECEF);

    // You might want to add this ECEF coordinate to the origin to get the final ECEF coordinate
    ecef.add(originECEF);

    return ecef;
}

// Convert LLA to Spherical EUS. Optional earth's radius parameter is deprecated, and should not be used.
export function LLAToEUSRadians(lat, lon, alt=0, radius) {
    assert(radius === undefined, "undexpected radius in LLAToEUS")
    assert(Sit.lat != undefined, "Sit.lat undefined in LLAToEUS")
    const ecef = RLLAToECEFV_Sphere(lat,lon,alt,wgs84.RADIUS)
    // Sit.lat/lon is the EUS origin, which can be defined per Sit
    // it's mostly legacy, but the math will be more accurate if the origin is near the action
    // when there's a terrain, Sit.lat/lon is set to center of the map in CNodeTerrain
    var enu = ECEF2ENU(ecef, radians(Sit.lat), radians(Sit.lon), wgs84.RADIUS)
    var eus = V3(enu.x,enu.z,-enu.y)
    return eus
}

// Convert LLA to Spherical EUS. Optional earth's radius parameter is deprecated, and should not be used.
export function LLAToEUS(lat, lon, alt=0, radius) {
    return LLAToEUSRadians(radians(lat), radians(lon), alt, radius)
}

// vector input version
export function LLAVToEUS(lla, radius) {
    assert(radius === undefined, "undexpected radius in LLAVToEUS")
    return LLAToEUS(lla.x, lla.y, lla.z)
}


// Convert RA, Dec to Az, El
// Inputs in radians, outputs in radians
// modified so az is positive clockwise from north
export function raDecToAzElRADIANS(ra, dec, lat, lon, lst) {
    // Calculate the Hour Angle (HA)
    const ha = lst - ra;

    // Calculate Altitude (Elevation - El)
    const sinEl = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
    const el = Math.asin(sinEl);

    // Calculate Azimuth (Az)
    const cosAz = (Math.sin(dec) - Math.sin(el) * Math.sin(lat)) / (Math.cos(el) * Math.cos(lat));
    const sinAz = Math.cos(dec) * Math.sin(ha) / Math.cos(el);
    let az = -Math.atan2(sinAz, cosAz);

    // // Convert azimuth from [-π, π] to [0, 2π]
    // if (az < 0) {
    //     az += 2 * Math.PI;
    // }

    return { az, el };
}

// GIven a date JS object (which also contains time) and a longitiude
// Find the Local Sidereal time.
export function getLST(date, longitude) {
    // Convert date to Julian Date
    const JD = date.getTime() / 86400000 + 2440587.5;

    // Calculate the number of centuries since the epoch J2000.0
    const T = (JD - 2451545.0) / 36525;

    // Calculate the Greenwich Mean Sidereal Time (GMST)
    let GMST = 280.46061837 + 360.98564736629 * (JD - 2451545) + T * T * (0.000387933 - T / 38710000);
    GMST %= 360;  // Reduce to between 0 and 360 degrees
    if (GMST < 0) GMST += 360;  // Make sure it's positive

    // Convert to radians
    GMST = GMST * Math.PI / 180;

    // Adjust by longitude to get Local Sidereal Time (in radians)
    const LST = GMST + longitude;

    // Reduce to between 0 and 2π radians
    return LST % (2 * Math.PI);
}


// given a position on the celestial sphere, find the az and el from a particular lat, lon
// BAD
export function ECEFCelestialToAzEl(ecef, lat, lon) {
    // First convert to ENU, so locally Z is up
    let enu = ECEF2ENU(ecef, lat, lon, 1, true)

    // elevation is now the angle between the ENU vector and the XY plane

    const r = enu.length();

    var el = Math.asin(enu.z/r)
    var az = Math.atan2(enu.x,enu.y)

    return {az,el}
}


//var mENU2ECEF = new Matrix3().getInverse(ECEF2ENU);