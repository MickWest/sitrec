// Calculating what the horizon should look like in the ATFLIR
import {degrees, radians} from "./utils";
import {EAJP2PR, extractRollFromMatrix, PRJ2XYZ} from "./SphericalMath";
import {
    Frame2Az,
    Frame2El,
    get_real_horizon_angle_for_frame,
    getGlareAngleFromFrame,
    jetPitchFromFrame,
    jetRollFromFrame,
    pitchAndGlobalRollFromFrame,
    podRollFromFrame, vizRadius
} from "./JetStuff";
import {par} from "./par";
import {Sit} from "./Globals";
import {Object3D} from "three";

// keeping these as globals speeds up getPodHorizonFromJetAndPod
// as creating objects is expensive
export var localBall = new Object3D()
export var localEOSU = new Object3D()
export var localPodFrame = new Object3D()
localPodFrame.add(localEOSU)
localEOSU.add(localBall)

export function getPodHorizonFromJetAndPod(jetRoll, jetPitch, podRollPhysical, podPitchPhysical) {

    localBall.quaternion.identity()
    localEOSU.quaternion.identity()
    localPodFrame.quaternion.identity()

    localPodFrame.rotation.z = radians(-jetRoll)
    localPodFrame.rotation.x = radians(jetPitch)
    localBall.rotation.x = radians(-podPitchPhysical)
    localEOSU.rotation.z = radians(-podRollPhysical)
    localPodFrame.updateMatrixWorld()
    localEOSU.updateMatrixWorld()
    localBall.updateMatrixWorld()

    var podHorizonAngle = degrees(extractRollFromMatrix(localBall.matrixWorld))

    return podHorizonAngle;
}

// given a jet pitch and roll, and the el and az (the ideal, i.e. the white dod)
// find the pod pitch and roll
// THEN modify roll until the dero for that pitch and roll matches the needed dero for the ideal
// this new roll will give us the green dot (i.e. where the pod head is physically pointing)
export function getPodRollFromGlareAngleFrame(frame) {

    //   return getGlareAngleFromFrame(frame);

    // This is what we want the horizon to be
    const humanHorizon = get_real_horizon_angle_for_frame(frame)

    // actual Jet orientation
    var jetPitch = jetPitchFromFrame(frame) // this will get scaled pitch
    var jetRoll = jetRollFromFrame(frame)

    // ideal az and el (white dot)
    var az = Frame2Az(frame)
    var el = Frame2El(frame);

    // start pod Pitch and Roll for ideal az and el
    var podPitch, totalRoll;
    [podPitch, totalRoll] = EAJP2PR(el, az, jetPitch);

    var podRoll = totalRoll - jetRoll

    // what we want the dero to be
    const targetDero = getGlareAngleFromFrame(frame)

    // and hence what we want the pod horizon angle to be
    const horizonTarget = targetDero + humanHorizon

    // binary search here modifying podRoll until the dero calculates from jetRoll, jetPitch, podRoll and podPitch
    // is close to targetDero

    var rollA = podRoll - 90;
    var rollB = podRoll + 90;
    var horizonA = getPodHorizonFromJetAndPod(jetRoll, jetPitch, rollA, podPitch)
    var horizonB = getPodHorizonFromJetAndPod(jetRoll, jetPitch, rollB, podPitch)
    var maxIterations = 1000
    while (rollB - rollA > 0.01 && maxIterations-- > 0) {
        var rollMid = (rollA + rollB) / 2;
        var horizonMid = getPodHorizonFromJetAndPod(jetRoll, jetPitch, rollMid, podPitch)
        // is the horiozn from A to B increasing or decreasing, that will affect which way we compare
        if (horizonB > horizonA) {
            // horizon is increasing from A to B
            if (horizonTarget < horizonMid) {
                // target is in the lower part, so Mid is the new B
                rollB = rollMid;
                horizonB = horizonMid;
            } else {
                // target is in the upper part, so Mid is the new A
                rollA = rollMid;
                horizonA = horizonMid;
            }
        } else {
            // horizon is decreasing from A to B
            if (horizonTarget < horizonMid) {
                if (horizonTarget < horizonMid) {
                    // target is in the smaller upper part, so Mid is the new A
                    rollA = rollMid;
                    horizonA = horizonMid;
                } else {
                    // target is in the larger lowere part, so Mid is the new B
                    rollB = rollMid;
                    horizonB = horizonMid;
                }
            }
        }
    }
    return rollA;
}

// the glare start angle is caculated under the assumption that since the
// pod is not rotating during the first 650 frames, then it is in the middle
// so we just adjust glareStartAngle so the AVERAGE DIFFERENCE between
// getGlareAngleFromFrame(f) and podRollFromFrame(f) is 0
export function calculateGlareStartAngle() {

    var n = 650;
    var errSum = 0
    var glareSum = 0;
    for (var f = 0; f < n; f++) {
        errSum += getGlareAngleFromFrame(f) - podRollFromFrame(f)
        glareSum += getGlareAngleFromFrame(f)
    }
    var avg = errSum / n // the average difference is the adjustment needed to make it zero
    var glareAvg = glareSum / n

    // this is a bit ad-hoc and does not really work
    par.glareStartAngle -= avg - (getGlareAngleFromFrame(0) - glareAvg)

    // use that as a start, and now refine it to minimize the maximum error
    // this is a somewhat expensive (slow) operation

    var bestError = 100000
    var bestStartAngle = par.glareStartAngle

    var start = par.glareStartAngle - 5
    var end = par.glareStartAngle + 5
    for (var angle = start; angle < end; angle += 0.2) {
        par.glareStartAngle = angle; // set it temporarily to see if it's any good
        var biggestError = 0
        for (var frame = 0; frame < Sit.frames; frame += 5) {
            var podRoll = podRollFromFrame(frame); // this is JUST the roll not from
            var pitch, globalRoll;
            [pitch, globalRoll] = pitchAndGlobalRollFromFrame(frame)

            var glarePos = PRJ2XYZ(pitch, getPodRollFromGlareAngleFrame(frame) + jetRollFromFrame(frame), jetPitchFromFrame(frame), vizRadius)

            var v = PRJ2XYZ(pitch, globalRoll, jetPitchFromFrame(frame), vizRadius)
            var errorAngle = degrees(v.angleTo(glarePos))
            if (errorAngle > biggestError)
                biggestError = errorAngle
        }
        if (biggestError < bestError) {
            bestError = biggestError;
            bestStartAngle = angle
        }
    }
    par.glareStartAngle = bestStartAngle
}

///////////////////////////////////////////////////////
// Side angle correction stuff from gimbal
export function getIdealDeroFromFrame(frame) {
    var horizonAngle = get_real_horizon_angle_for_frame(frame)
    var podHorizonAngle = getPodHorizonAngleFrame(frame)
    var deroNeeded = podHorizonAngle - horizonAngle
    return deroNeeded
}

export function getDeroFromFrame(frame) {
    if (par.deroFromGlare) {
        return getGlareAngleFromFrame(frame)
    } else {
        return getIdealDeroFromFrame(frame)
    }
}

// to get the frame of reference of the pod camera, we can just extract it from the ball's matrixWorld
// We duplicate that object hierarchy here so we can extract the code, ensuring it's the same
// this gets the horizon angle given the IDEAL tracking
function getPodHorizonAngleFrame(frame) {
// similar to UpdatePRFromEA, but on locals, not par values

    var jetPitch = jetPitchFromFrame(frame)
    var jetRoll = jetRollFromFrame(frame)
    var az = Frame2Az(frame)
    var el = Frame2El(frame);

    var pitch, totalRoll;
    [pitch, totalRoll] = EAJP2PR(el, az, jetPitch);
    var podPitchPhysical = pitch;
    var podRollPhysical = totalRoll - jetRoll;
//    if (par.deroFromGlare) {
//        podRollPhysical = getGlareAngleFromFrame(frame)
//    }
    return getPodHorizonFromJetAndPod(jetRoll, jetPitch, podRollPhysical, podPitchPhysical)
}