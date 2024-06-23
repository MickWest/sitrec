import { CNode } from './CNode';

class CNodeWatch extends CNode {
  constructor(v) {
    super(v);
    this.watchObject = v.ob;
    this.watchID = v.watchID;
  }

  getValueFrame(frame) {
    this.value = this.watchObject[this.watchID];
    return this.value;
  }
}

export { CNodeWatch };
