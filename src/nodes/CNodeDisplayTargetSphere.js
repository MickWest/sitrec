import { CNode3DObject } from './CNode3DObject';

export class CNode3DSphere extends CNode3DObject {
  constructor(v) {
    v.geometry = 'sphere';

    // these are the original defaults for the legacy CNodeDisplayTargetSphere
    v.radius = 0.5;
    v.widthSegments = 20;
    v.heightSegments = 20;
    v.opacity ??= 0.75;
    v.transparent ??= true;

    super(v);
  }
}

// legacy class using the new CNode3DSphere, and adding the functionality that was in CNode3DTarget
export class CNodeDisplayTargetSphere extends CNode3DSphere {
  constructor(v) {
    super(v);
    this.input('track');
  }

  update(f) {
    this.group.position.copy(this.in.track.p(f));
  }
}
