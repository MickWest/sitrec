// get heading in the XZ plane - i.e. the compass heading
import { Sit } from './Globals';
import { degrees } from './utils';

export function trackHeading(source, f) {
  if (f > Sit.frames - 2) f = Sit.frames - 2; // hand out of range
  if (f < 0) f = 0;
  const fwd = source.p(f + 1).sub(source.p(f));
  const heading = degrees(Math.atan2(fwd.x, -fwd.z));
  return heading;
} // per frame closing speed
// per frame velocity vector
// source = track object
// f = frame number
// given that source.p(f) is the position at frame f
// we calculate the velocity vector at f as the position at f+1 minus the position at f
export function trackVelocity(source, f) {
  if (f > Sit.frames - 2) f = Sit.frames - 2; // hand out of range
  if (f < 0) f = 0;
  const fwd = source.p(f + 1).sub(source.p(f));
  return fwd;
}

// per frame direction vector (normalized velocity)
export function trackDirection(source, f) {
  return trackVelocity(source, f).normalize();
}

// per frame acceleration
// essential the first derivative of the position
export function trackAcceleration(source, f) {
  const v1 = trackVelocity(source, f);
  const v2 = trackVelocity(source, f + 1);
  const fwd = v2.clone().sub(v1);
  return fwd;
}

// this is the chan
export function closingSpeed(jet, target, f) {
  const d1 = jet.p(f).sub(target.p(f)).length();
  const d2 = jet
    .p(f + 1)
    .sub(target.p(f + 1))
    .length();
  return d1 - d2;
}
