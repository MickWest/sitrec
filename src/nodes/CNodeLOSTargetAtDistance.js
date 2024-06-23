// a fixed point track that returns a point on the LOS between a camera and
// the track at at given frame.
// can be used to put an object inbetween the camera and the track
import { CNodeTrack } from './CNodeTrack';
import { getLocalUpVector } from '../SphericalMath';
import { assert } from '../assert.js';
import { V3 } from '../threeUtils';

export class CNodeLOSTargetAtDistance extends CNodeTrack {
  constructor(v) {
    super(v);
    this.input('track');
    this.input('camera');
    this.input('distance', true);
    this.input('altitude', true);
    this.input('offsetRadians');
    this.input('wind', true);
    this.startFrame = v.frame;
    this.frames = this.in.track.frames;
  }

  getValueFrame(f) {
    const trackPos = this.in.track.p(this.startFrame);
    const trackDir = this.in.track
      .p(this.startFrame + 1)
      .clone()
      .sub(trackPos)
      .normalize();
    const camPos = this.in.camera.camera.position.clone();
    const toTrack = trackPos.clone().sub(camPos).normalize();
    const offsetDir = V3().crossVectors(toTrack, trackDir);
    let marker;
    let distanceToMarker;
    if (this.in.distance !== undefined) {
      const distance = this.in.distance.v0;
      marker = toTrack.multiplyScalar(distance);
      distanceToMarker = distance;
    } else {
      assert(
        this.in.altitude !== undefined,
        'need altitude or distance in CNodeLOSTargetAtDistance'
      );
      const altitude = this.in.altitude.v0;
      // we separate toTrack unit vector into component vectors parallel and perpendicular to the local up
      // then scale then both so the up component is 1
      const up = getLocalUpVector(camPos);
      const upDot = up.dot(toTrack);
      const upComponent = up.clone().multiplyScalar(upDot);
      const horizontalComponent = toTrack.clone().sub(upComponent);
      horizontalComponent.multiplyScalar(1 / upDot);

      // then we scale the component by altitude.
      // since up is a unit vector this gives up the correct altitude
      // and the horizontal component is scaled the same
      marker = up
        .multiplyScalar(altitude)
        .add(horizontalComponent.multiplyScalar(altitude));

      // calculate distance for angular offset, below.
      distanceToMarker = marker.length();
    }

    // angular offset
    const offset = distanceToMarker * Math.tan(this.in.offsetRadians.v());
    marker.add(camPos).sub(offsetDir.clone().multiplyScalar(offset));

    // if we have wind, then add it in based on the frame offset from the startFrame
    // so when it's at the startFrame, the position will be on the track (+ .
    if (this.in.wind !== undefined) {
      const frameOffset = f - this.startFrame;
      //     console.log(f+" - "+frameOffset);
      marker.add(this.in.wind.v(0).multiplyScalar(frameOffset));
    }

    return { position: marker };
  }
}
