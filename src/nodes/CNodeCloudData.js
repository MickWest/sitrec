import { CNode } from './CNode';

// Note: this JUST has three input which gets repackaged as an object,
// might it be better to have a generic node that does this?
export class CNodeCloudData extends CNode {
  constructor(v) {
    super(v);
    // maybe later add wind speed and direction - or a wind node
    //        this.checkInputs(["altitude", "near", "far"])
    this.checkInputs(['altitude']);
    this.recalculate();
  }

  getValue(f) {
    return {
      altitude: this.in.altitude.v(f),
      //      near: this.in.near.v(f),
      //      far: this.in.far.v(f),
    };
  }
}
