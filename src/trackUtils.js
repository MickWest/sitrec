// get heading in the XZ plane - i.e. the compass heading
import {NodeMan, Sit} from "./Globals";
import {degrees} from "./utils";
import {assert} from "./assert";
import {MISB} from "./MISBUtils";

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

// given two CNodeMISBDataTrack data nodes, find the time at which they are closest
// simply find the start and end overlap times
// then iterate over that time range for both tracks to find the closest time
export function closestIntersectionTime(track1, track2) {
    console.log(track1, track2)

    const misb1 = NodeMan.get(track1).misb;
    const misb2 = NodeMan.get(track2).misb;
    const frames1 = misb1.length;
    const frames2 = misb2.length;
    const start1 = misb1[0][MISB.UnixTimeStamp];
    const start2 = misb2[0][MISB.UnixTimeStamp];
    const end1 = misb1[frames1 - 1][MISB.UnixTimeStamp];
    const end2 = misb2[frames2 - 1][MISB.UnixTimeStamp];

    // convert all four times to strings
    const start1String = new Date(start1).toISOString();
    const start2String = new Date(start2).toISOString();
    const end1String = new Date(end1).toISOString();
    const end2String = new Date(end2).toISOString();
    console.log(`Start1: ${start1String}, Start2: ${start2String}, End1: ${end1String}, End2: ${end2String}`);

    // assert they are all defined, one assert per line, with message
    assert(start1 !== undefined, "Missing start1");
    assert(start2 !== undefined, "Missing start2");
    assert(end1 !== undefined, "Missing end1");
    assert(end2 !== undefined, "Missing end2");
    const start = Math.max(start1, start2);
    const end = Math.min(end1, end2);
    // assert that start is less than end
    assert(start < end, "No overlap between tracks");

    const startString = new Date(start).toISOString();
    const endString = new Date(end).toISOString();
    console.log(`INTERSECTION Start: ${startString}, End: ${endString}`);


    // use the middle of the time as default best time
    let bestTime = (start+end)/2;
    let bestDistance = getDistanceBetweenTracks(track1, track2, bestTime);

    for (let time = start; time < end; time += 1000) {
        const p1 = track1.getPositionAtTime(time);
        const p2 = track2.getPositionAtTime(time);
        const distance = p1.distanceTo(p2);
       // console.log(`Time: ${time}, Distance: ${distance}`);
        if (distance < bestDistance) {
//            console.log(`New Best Time: ${timeString}, Distance: ${distance}`);
            bestDistance = distance;
            bestTime = time;
        }
    }
    const timeString = new Date(bestTime).toISOString();
    console.log(`New Best Time: ${timeString}, Distance: ${bestDistance}`);

    return bestTime;

}

export function getDistanceBetweenTracks(track1, track2, time) {
    const p1 = track1.getPositionAtTime(time);
    const p2 = track2.getPositionAtTime(time);
    return p1.distanceTo(p2);
}

