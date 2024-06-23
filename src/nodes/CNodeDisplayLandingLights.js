import { CNodeDisplayTargetSphere } from './CNodeDisplayTargetSphere';
import { degrees } from '../utils';

// currently just modulate the size of a sphere based on the angle to the
export class CNodeDisplayLandingLights extends CNodeDisplayTargetSphere {
  constructor(v) {
    super(v);

    // It's viewed from the camera
    this.input('cameraTrack');

    this.angleFullBeam = v.angleFullBeam ?? 7; // angle at which it starts to fall off
    this.angleFallOff = v.angleFallOff ?? 8; // angle at which falloff is complete

    this.minSize = v.minSize ?? 150; // varies from size to minSize
  }

  recalculate() {}

  update(f) {
    super.update(f);

    // just duplicate the last frame, as there's no next frame to calculate v from
    if (f === this.frames - 1) {
      f--;
    }

    const camera = this.in.cameraTrack.v(f);
    const target = this.in.track.v(f);
    const targetToCamera = camera.position.clone().sub(target.position);
    const fwd = this.in.track.p(f + 1).sub(this.in.track.p(f));
    const angle = degrees(targetToCamera.angleTo(fwd));
    let scale = this.in.size.v0;
    if (angle > this.angleFallOff || angle < 0) {
      scale = this.minSize;
    } else {
      if (angle < this.angleFullBeam) {
        // leave full size
      } else {
        const fraction =
          (angle - this.angleFullBeam) /
          (this.angleFallOff - this.angleFullBeam);
        scale = this.in.size.v0 + fraction * (this.minSize - this.in.size.v0);
      }
    }
    //        console.log ("Angle = "+angle+" scale = "+scale)

    this.group.scale.setScalar(scale);
  }
}
