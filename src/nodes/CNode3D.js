import { CNode } from './CNode';
import { guiShowHide, mainLoopCount, NodeFactory } from '../Globals';
import { par } from '../par';
import { assert } from '../assert.js';

// wrapper class for THREE.JS objects, like cameras, groups, 3D models, etc.
// Mostly to allow hooking up of controllers, which previous were camera-only
export class CNode3D extends CNode {
  constructor(v) {
    super(v);
    this._object = null; // a 3D object
  }

  update(f) {
    super.update(f);
    this.applyControllers(f);
  }

  // add a gui checkbox toggle for a member variable
  guiToggle(member, name) {
    guiShowHide
      .add(this, member)
      .name(name ?? member)
      .listen()
      .onChange((v) => {
        par.renderOne = true;
      });
  }

  applyControllers(f, depth = 0) {
    // To prevent loops, we only apply controllers at most twice per frame
    // remember the f value called with
    // if it's new, then reset count to zero
    // if not new, increment count
    // if count > 100, then it's an inifite loop
    if (mainLoopCount !== this.lastF) {
      //            console.log("Resetting applyControllersCount for " + this.id + " at mainLoop " + mainLoopCount);
      this.lastF = mainLoopCount;
      this.applyControllersCount = 0;
    } else {
      //            console.log("Incrementing applyControllersCount to " + this.applyControllersCount+ " for " + this.id + " at mainLoop " + mainLoopCount);
      this.applyControllersCount++;
      if (this.applyControllersCount === 100) {
        console.log(
          `ApplyControllersCount reached 100 for ${this.id} at mainLoop ${mainLoopCount}`
        );
      }
      if (this.applyControllersCount > 100) {
        console.warn(
          `Infinite loop detected in controllers for ${this.id} at mainLoop ${mainLoopCount}`
        );
        for (const inputID in this.inputs) {
          const input = this.inputs[inputID];
          if (input.isController) {
            console.log(`Controller:  ${input.id}`);
          }
        }
        return;
      }
    }

    // Note: JS will iterate object in the order they were added
    // assuming all the keys are non-numeric strings
    // and your browser is reasonable (ES2015+)
    // see https://www.stefanjudis.com/today-i-learned/property-order-is-predictable-in-javascript-objects-since-es2015/
    for (const inputID in this.inputs) {
      const input = this.inputs[inputID];
      if (input.isController && input.enabled) {
        if (par.paused) {
          //if (depth === 0) {
          //    console.log("Apply: "+ input.id +" to " + this.id + "frame " + f + " depth " + depth);
          //} else {
          //    console.log("|---".repeat(depth) + " Apply:  " + input.id)
          //}
        }

        input.apply(f, this);
      }
    }
  }

  addController(type, def) {
    console.log(`Adding CONTROLLER ${type} to ${this.id}`);
    assert(
      def.camera === undefined,
      'Adding a controller with a camera defined, should be object!'
    );
    if (def.id === undefined) {
      def.id = `${this.id}_Controller${type}`;
      console.warn(`Controller added without id, using ${def.id}`);
    }
    this.addControllerNode(NodeFactory.create(`Controller${type}`, def));
    return this;
  }

  addControllerNode(node) {
    // having this introduces circular dependency with CNodeView's including CNodeCamera
    //        assert(node instanceof CNodeController || node instanceof CNodeSwitch,
    //            "Calling addControllerNode with non Controller or Switch");
    node.isController = true;
    this.addInput(node.id, node);
    return this;
  }
}
