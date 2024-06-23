import { radians } from '../utils';
import { getLocalNorthVector, getLocalUpVector } from '../SphericalMath';
import { Matrix4 } from 'three';
import { CNodeTrack } from './CNodeTrack';
import { assert } from '../assert.js';
import { V3 } from '../threeUtils';

// CNodeLOSTrackAzEl calculates lines of sight from jetTrack, az and el tracks
// LOS track consists of {position:, heading:) where heading is a unit vector
export class CNodeLOSTrackAzEl extends CNodeTrack {
  constructor(v) {
    super(v);
    assert(this.in.jetTrack !== undefined);
    assert(this.in.az !== undefined);
    assert(this.in.el !== undefined);
    this.absolute = v.absolute;
    this.recalculate();
  }

  recalculate() {
    this.array = [];
    this.frames = this.in.jetTrack.frames;
    for (let f = 0; f < this.in.jetTrack.frames; f++) {
      const A = this.in.jetTrack.p(f);

      const fwd = V3(0, 0, -1);

      // first get the fwd vector rotated by Az and El in the frame of the jet
      const rightAxis = V3(1, 0, 0);
      fwd.applyAxisAngle(rightAxis, radians(this.in.el.v(f)));

      const upAxis = V3(0, 1, 0); // rotate around 0,1,0, i.e. up at the origin
      //fwd.applyAxisAngle(upAxis, radians(-this.in.az.v(f) - this.in.jetTrack.getValue(f).heading))

      // we are not using the heading any more, we use the local frame
      // which we can calculate from the jetFwd and the the local up
      fwd.applyAxisAngle(upAxis, radians(-this.in.az.v(f)));

      const _x = V3();
      const _y = getLocalUpVector(A);
      let _z;
      if (this.absolute) {
        // absolute mode, so relative to the local north at the jet
        _z = getLocalNorthVector(A).negate();
      } else {
        // otherwise it's relative to the jet's forward vector
        _z = this.in.jetTrack.v(f).fwd.clone().negate();
      }

      _x.crossVectors(_y, _z);
      _z.crossVectors(_x, _y);
      const m = new Matrix4();
      m.makeBasis(_x, _y, _z);

      // so m shoiuld be the transform matrix for the frame of reference of the jet
      // (maybe only need a 3x3 matix, but we pnly have makeBasis for 4)

      // so we take the local vector calculated from El and Az, and apply the frame of the jet to it
      // this will rotate it and tilt down relative to local gravity
      fwd.applyMatrix4(m);

      //   console.log("LOSTrackAzEl fwd = "+fwd.x+","+fwd.y+","+fwd.z )

      this.array.push({ position: A, heading: fwd });
    }
  }

  getValueFrame(f) {
    return this.array[f];
  }
}
