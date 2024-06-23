// Buffer node just holds an array of the GetValueFrame for each frame
// of another node, and has a getBuffer() method to return it
import { CNode } from './CNode';
import { assert } from '../assert.js';

export class CNodeBuffer extends CNode {
  constructor(v) {
    super(v);
    this.checkInputs(['node']);
    assert(
      this.in.node.frames !== 0,
      'CNodeBuffer need non-zero frames source node'
    );
    this.frames = this.in.node.frames;
    this.recalculate();
  }

  recalculate() {
    this.buffer = new Array(this.in.node.frames);
    for (let i = 0; i < this.frames; i++) {
      this.buffer[i] = this.in.node.getValueFrame(i);
    }
  }

  getValueFrame(f) {
    return this.buffer[f];
  }

  getBuffer() {
    return this.buffer;
  }
}
