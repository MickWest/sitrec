import { CNode, CNodeOrigin } from './CNode';
import { radians } from '../utils';
import { DebugArrowAB } from '../threeExt';
import { GlobalScene } from '../LocalFrame';
import { V3 } from '../threeUtils';

export class CNodeHeading extends CNode {
  constructor(v, guiMenu) {
    super(v);

    // if no jetOrigin specificed, then we use the global origin
    // which is traditionally what was used for Gimbal and Gofast
    this.input('jetOrigin', true);
    if (!this.in.jetOrigin) {
      this.addInput('jetOrigin', new CNodeOrigin({ id: 'jetOrigin' }));
    }

    this.setGUI(v, guiMenu);

    this.heading = v.heading; // true heading
    this.name = v.name ?? '';
    this.arrowColor = v.arrowColor ?? 'white';

    this.headingController = this.gui
      .add(this, 'heading', 0, 359, 1)
      .name(`${this.name} Heading`)
      .onChange((x) => this.recalculateCascade());

    this.recalculate();
  }

  modSerialize() {
    return {
      ...super.modSerialize(),
      heading: this.heading,
      name: this.name,
    };
  }

  modDeserialize(v) {
    super.modDeserialize(v);
    this.heading = v.heading;
    this.name = v.name;
    this.headingController.updateDisplay();
  }

  getValueFrame(f) {
    const fwd = V3(0, 0, -1);
    fwd.applyAxisAngle(V3(0, 1, 0), radians(-this.heading));
    return fwd;
  }

  getHeading(f) {
    return this.heading;
  }

  recalculate() {
    //var A = Sit.jetOrigin.clone()

    const A = this.in.jetOrigin.p(0);

    const B = A.clone().add(this.p().multiplyScalar(10000));
    DebugArrowAB(
      `${this.name} Heading`,
      A,
      B,
      this.arrowColor,
      true,
      GlobalScene
    );
  }
}
