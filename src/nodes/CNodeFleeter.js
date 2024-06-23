import { metersFromNM, radians } from '../utils';
import { Sit, Units } from '../Globals';
import { CNodeEmptyArray } from './CNodeArray';

import { V3 } from '../threeUtils';

const fleeterScale = 1.5;

export class CNodeFleeter extends CNodeEmptyArray {
  constructor(v) {
    super(v);
    this.input('gimbal'); // the gimbal input node is the calculated traversal track
    this.input('turnFrame');
    this.input('turnRate');
    this.input('acc');
    this.input('spacing');
    this.input('fleetX');
    this.input('fleetY');

    this.offX = v.offX;
    this.offY = v.offY;
    this.offZ = v.offZ;

    this.recalculate();
  }

  recalculate() {
    this.array = [];
    this.frames = this.in.gimbal.frames;
    // position is relative to gimbal at frame 0
    const pos = this.in.gimbal.v0.position.clone();

    // offsetting by offX,offY,offZ
    // needs XZ to be relative to the heading of the Gimbal object

    const gv = this.in.gimbal.p(1).sub(this.in.gimbal.p(0));
    gv.normalize();
    const heading = Math.atan2(gv.z, gv.x) + Math.PI / 2;
    const off = V3(this.offX, this.offY, this.offZ);
    off.applyAxisAngle(V3(0, 1, 0), -heading);

    const fleeterScale = this.in.spacing.v0;
    // pos.x += metersFromNM(this.offX*fleeterScale+this.in.fleetX.v0)
    // pos.y += metersFromNM(this.offY*fleeterScale)
    // pos.z += metersFromNM(this.offZ*fleeterScale+this.in.fleetY.v0)
    pos.x += metersFromNM(off.x * fleeterScale + this.in.fleetX.v0);
    pos.y += metersFromNM(off.y * fleeterScale);
    pos.z += metersFromNM(off.z * fleeterScale + this.in.fleetY.v0);

    //      console.log("TUrnframe = "+this.in.turnFrame.v0)

    const upAxis = V3(0, 1, 0); // rotate around 0,1,0, i.e. up at the origin

    // velocity comes from the first two frames of the gimbal object track
    // and give us a per-frame
    const vel = this.in.gimbal.p(1).sub(this.in.gimbal.p(0));
    let turnStarted = false;
    let turnEnded = false;
    let turnTotal = 0;
    for (let f = 0; f < this.frames; f++) {
      this.array.push({ position: pos.clone() });
      pos.add(vel);

      if (!turnStarted && f > this.in.turnFrame.v0) {
        turnStarted = true;
        let speed = Units.m2Speed * vel.length() * Sit.fps;
        //   console.log("Fleet speed WAS "+speed)
        vel.multiplyScalar(this.in.acc.v0);
        speed = Units.m2Speed * vel.length() * Sit.fps;
        //   console.log("Fleet speed scaled to "+speed)

        //            this.turnRate*=2 // PATCH
      }
      if (turnStarted && !turnEnded) {
        const turn = radians(this.in.turnRate.v0 / Sit.fps);
        vel.applyAxisAngle(upAxis, turn);

        turnTotal += this.in.turnRate.v0 / Sit.fps;
        if (turnTotal >= 180) {
          turnEnded = true;
        }
      }
    }
  }
}
