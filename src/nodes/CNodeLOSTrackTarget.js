// given two tracks, join the cameraTrack to the targetTrack to creat a LOS track
// i.e. a series of lines of sight positions and headings
// So basically it contains the camera track, and the direction the camera is looking in
import { CNodeEmptyArray } from './CNodeArray';
import { assert } from '../assert.js';

export class CNodeLOSTrackTarget extends CNodeEmptyArray {
  constructor(v) {
    super(v);
    this.input('cameraTrack');
    this.input('targetTrack');
    this.recalculate();
  }

  recalculate() {
    this.array = [];
    this.frames = this.in.cameraTrack.frames;
    assert(
      this.in.targetTrack.frames === this.frames,
      `Frame number mismatch, target = ${this.in.targetTrack.frames} camera = ${this.frames}`
    );
    for (let f = 0; f < this.in.cameraTrack.frames; f++) {
      const pos = this.in.cameraTrack.p(f);
      const heading = this.in.targetTrack.p(f).sub(pos).normalize();
      this.array.push({ position: pos, heading: heading });
    }
  }
}
