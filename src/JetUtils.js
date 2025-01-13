import {NodeMan} from "./Globals";
import {par} from "./par";
import {abs, cos, degrees, radians} from "./utils";
import {CueAz, EA2XYZ, EAJP2PR, XYZ2EA} from "./SphericalMath";
import {V3} from "./threeUtils";

export function jetRollFromFrame(f) {
    return NodeMan.get("bank").v(f)
}

export function jetPitchFromFrame(f = -1) {
    if (f == -1) f = par.frame;
    var jetPitch = par.jetPitch;
    if (par.scaleJetPitch) {
        var roll = jetRollFromFrame(f)
        jetPitch *= 1 / cos(radians(abs(roll)))
    }
    return jetPitch;
}

export function getHumanHorizonFromPitchRollAzEl(jetPitch, jetRoll, az, el) {


//     if (type == 1) {
//         return jetRoll * cos(radians(az)) + jetPitch * sin(radians(az));
//     } else {
//         // rotate the absolute 3D coordinates of (el, az) into the frame of reference of the jet
//         vec3d relative_AzElHeading = EA2XYZ(el, az, 1)
//             .rotate(vec3d { 1, 0, 0 }, -radians(jetPitch)) // reverse both the order and sign of these rotations
//              .rotate(vec3d { 0, 0, 1 }, radians(jetRoll));

    var AzElHeading = EA2XYZ(el, az, 1)
    var relative_AzElHeading = AzElHeading
        .applyAxisAngle(V3(1, 0, 0), -radians(jetPitch))
        .applyAxisAngle(V3(0, 0, 1), radians(jetRoll))

//         // caclulcate (el, az) angles relative to the frame of reference of the jet
//         auto [relative_el, relative_az] = XYZ2EA(relative_AzElHeading);
    var relative_el, relative_az;
    [relative_el, relative_az] = XYZ2EA(relative_AzElHeading)

//
//         // compute the jet's pose in the global frame of reference
//         auto jetUp = vec3d { 0, 1, 0 }
//     .rotate(vec3d { 0, 0, 1 }, -radians(jetRoll))
//     .rotate(vec3d { 1, 0, 0 }, radians(jetPitch));
    var jetUp = V3(0, 1, 0)
        .applyAxisAngle(V3(0, 0, 1), -radians(jetRoll))
        .applyAxisAngle(V3(1, 0, 0), radians(jetPitch))

//         auto jetRight = vec3d { 1, 0, 0 }
//     .rotate(vec3d { 0, 0, 1 }, -radians(jetRoll))
//     .rotate(vec3d { 1, 0, 0 }, radians(jetPitch));
    var jetRight = V3(1, 0, 0)
        .applyAxisAngle(V3(0, 0, 1), -radians(jetRoll))
        .applyAxisAngle(V3(1, 0, 0), radians(jetPitch))

//    DebugArrowV("jetUp",jetUp)

//         // rotate the camera by relative_az in the wing plane so that it's looking at the object
//         // the camera pitching up by relative_el has no effect on a vector pointing right
//         auto camera_horizon = jetRight.rotate(jetUp, -radians(relative_az));
    var camera_horizon = jetRight.applyAxisAngle(jetUp, -radians(relative_az));

//    DebugArrowV("camera_horizon",camera_horizon,100,0xff0000) // red

//    pointObject3DAt(gridHelperNod, camera_horizon)

//         // the real horizon is a vector pointing right, perpendicular to the global viewing angle az
//         auto real_horizon = vec3d { 1, 0, 0 }.rotate(vec3d { 0, 1, 0 }, -radians(az));
    var real_horizon = V3(1, 0, 0).applyAxisAngle(V3(0, 1, 0), -radians(az))
//    DebugArrowV("real_horizon",real_horizon,100,0x00ff00) // green

//
//         // it can be shown that the real horizon vector is already in the camera plane
//         // so return the angle between the camera horizon and the real horizon
//         return -degrees(camera_horizon.angleTo(real_horizon));

    var horizon_angle = -degrees(camera_horizon.angleTo(real_horizon))

    var cross = camera_horizon.clone().cross(real_horizon)
    var dot = cross.dot(AzElHeading)
    if (dot < 0)
        return -horizon_angle

    return horizon_angle
//     }
// }
}

export function Frame2Az(frame) {
    return NodeMan.get("azSources").v(frame)
}

export function Frame2El(frame) {
    return NodeMan.get("el").v(frame)
} // https://www.metabunk.org/threads/gimbal-derotated-video-using-clouds-as-the-horizon.12552/page-2#post-276183
//double get_real_horizon_angle_for_frame(int frame, int type = 2) {
export function get_real_horizon_angle_for_frame(frame) {
//    double el = Frame2El(frame), az = Frame2Az(frame);
//    double jetPitch = jetPitchFromFrame(frame), jetRoll = jetRollFromFrame(frame);

    var jetPitch = jetPitchFromFrame(frame) // this will get scaled pitch
    var jetRoll = jetRollFromFrame(frame)
    var az = Frame2Az(frame)
    var el = Frame2El(frame);

    return getHumanHorizonFromPitchRollAzEl(jetPitch, jetRoll, az, el)
}

export function getGlareAngleFromFrame(f) {
    if (!NodeMan.exists("glareAngle")) {
        if (f === 0)
            console.warn("GlareAngleFromFrame being called BUT missing glareAngle node")
        return 0;
    }

    // this is different to GimbalSim, as that was negative
    if (f < 698) {
        var old = parseFloat(NodeMan.get("glareAngle").getValueFrame(0)) // old flat line
        // so here we need to SUBTRACT the fraction of par.initialGlareRotation
        var modified = old - par.initialGlareRotation * (697 - f) / 697 // go from +6 to +0
        return par.glareStartAngle + modified
    }

    return par.glareStartAngle + NodeMan.get("glareAngle").getValueFrame(f)

} // calculate just the pod roll, ie global roll less the jet roll
// Take a frame number in the video (i.e. a time in 1/30ths)
// and return the angle formed by projecting the camera's Az/El vector
// onto the plane of the wings
export function Frame2CueAz(frame) {
    // get az for this frame (el is constant, in par.el)
    // this comes from video data, shown on the graph as yellow
    const az = Frame2Az(frame)
    const el = Frame2El(frame)
    const jetRoll = jetRollFromFrame(frame) // get jet roll angle from either video data or constant
    const jetPitch = jetPitchFromFrame(frame)
    return CueAz(el, az, jetRoll, jetPitch)
}

// calculate the "ideal" roll angle (pod roll plus jet roll) to point at target
export function pitchAndGlobalRollFromFrame(frame) {
    var az = Frame2Az(frame)
    var el = Frame2El(frame)
    return EAJP2PR(el, az, jetPitchFromFrame(frame))
}

function globalRollFromFrame(frame) {
    var pitch, globalRoll
    [pitch, globalRoll] = pitchAndGlobalRollFromFrame(frame)
    return globalRoll;
}

export function podRollFromFrame(frame) {
    var globalRoll = globalRollFromFrame(frame)
    var podRoll = globalRoll - jetRollFromFrame(frame);
    if (podRoll < -180) podRoll += 360;
    if (podRoll >= 180) podRoll -= 360;
    return podRoll
}