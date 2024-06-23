import {
  LLAToEUSMAP,
  LLAToEUSMAPGlobe,
  RLLAToECEFV_Sphere,
} from '../LLA-ECEF-ENU';
import { f2m, radians } from '../utils';
import { Sit } from '../Globals';

import { CNodeController } from './CNodeController';
import { assert } from '../assert.js';

// Controller to position the camera at a specified LLA point
// This is a UI controller, so it has inputs for the LLA point

export class CNodeControllerUIPositionLLA extends CNodeController {
  constructor(v) {
    super(v);
    this.input('fromLat');
    this.input('fromLon');
    this.input('fromAltFeet');
  }

  apply(f, cameraNode) {
    const camera = cameraNode.camera;
    Sit.originECEF = RLLAToECEFV_Sphere(radians(Sit.lat), radians(Sit.lon), 0);
    assert(!Number.isNaN(Sit.originECEF.x), 'Sit.originECEF NaN');

    let from;

    let changed = false;

    if (this.in.fromLat) {
      from = LLAToEUSMAPGlobe(
        this.in.fromLat.v(f),
        this.in.fromLon.v(f),
        f2m(this.in.fromAltFeet.v(f))
      );
      if (!camera.position.equals(from)) {
        camera.position.copy(from);
        changed = true;
      }
      assert(!Number.isNaN(camera.position.x), 'camera.position.x NaN');
    }

    // propogate any changes to the camera to output nodes
    // but disabling controller applications

    if (changed) {
      cameraNode.recalculateCascade(f, true);
    }

    //    DebugArrowAB("Lookat", from,to, 0xff00ff,true,GlobalScene)
  }
}

// controller to look at a specified LLA point
export class CNodeControllerLookAtLLA extends CNodeController {
  constructor(v) {
    super(v);
    this.input('toLat');
    this.input('toLon');
    this.input('toAlt');
  }

  apply(f, cameraNode) {
    const camera = cameraNode.camera;

    Sit.originECEF = RLLAToECEFV_Sphere(radians(Sit.lat), radians(Sit.lon), 0);
    assert(!Number.isNaN(Sit.originECEF.x), 'Sit.originECEF NaN');

    let to;

    let changed = false;

    to = LLAToEUSMAP(
      this.in.toLat.v(f),
      this.in.toLon.v(f),
      this.in.toAlt.v(f)
    );
    const oldQuaternion = camera.quaternion.clone();
    camera.lookAt(to);
    if (!oldQuaternion.equals(camera.quaternion)) {
      changed = true;
    }

    // propogate any changes to the camera to output nodes
    // but disabling controller applications

    if (changed) {
      cameraNode.recalculateCascade(f, true);
    }

    //    DebugArrowAB("Lookat", from,to, 0xff00ff,true,GlobalScene)
  }
}
