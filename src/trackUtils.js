// get heading in the XZ plane - i.e. the compass heading
import {NodeMan, Sit} from "./Globals";
import {degrees} from "./utils";

export function trackHeading(source, f) {
    if (f > Sit.frames - 2) f = Sit.frames - 2; // hand out of range
    if (f < 0) f = 0
    var fwd = source.p(f + 1).sub(source.p(f))
    var heading = degrees(Math.atan2(fwd.x, -fwd.z))
    return heading
} // per frame closing speed
// per frame velocity vector
// source = track object
// f = frame number
// given that source.p(f) is the position at frame f
// we calculate the velocity vector at f as the position at f+1 minus the position at f
export function trackVelocity(source, f) {
    if (f > Sit.frames - 2) f = Sit.frames - 2; // hand out of range
    if (f < 0) f = 0
    var fwd = source.p(f + 1).sub(source.p(f))
    return fwd
}

// per frame direction vector (normalized velocity)
export function trackDirection(source, f) {
    return trackVelocity(source, f).normalize();
}

// per frame acceleration
// essential the first derivative of the position
export function trackAcceleration(source, f) {
    const v1 = trackVelocity(source, f)
    const v2 = trackVelocity(source, f + 1)
    var fwd = v2.clone().sub(v1)
    return fwd
}

// this is the chan
export function closingSpeed(jet, target, f) {
    var d1 = jet.p(f).sub(target.p(f)).length()
    var d2 = jet.p(f + 1).sub(target.p(f + 1)).length()
    return d1 - d2

}

export function trackBoundingBox(track) {
    track = NodeMan.get(track);
    const frames = track.frames;
    let p = track.p(0);
    let min = p.clone();
    let max = p.clone();
    for (let f = 1; f < frames; f++) {
        const p = track.p(f);
        min.min(p);  // using min.min instead of Math.min to avoid creating a new vector
        max.max(p);
    }
    return {min:min, max:max};


}
