import { BufferGeometry, Float32BufferAttribute, Mesh, Vector3 } from 'three';
import seedrandom from 'seedrandom';
import { metersFromMiles } from '../utils';
import { drop } from '../SphericalMath';
import { dispose } from '../threeExt';
import { CNode3DGroup } from './CNode3DGroup';
import { assert } from '../assert.js';

class SimpleOceanGeometry extends BufferGeometry {
  constructor(w, h, alt, radius) {
    super();
    this.type = 'SimpleOceanGeometry';
    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];
    const xz = w / Math.sqrt(2);

    // using a fixed see for this RNG so clouds are in same place
    const rng = seedrandom('x');

    const rm = metersFromMiles(radius);

    const step = 0.1;
    const sm = metersFromMiles(step);

    let index = 0;
    for (let x = -13; x < 13; x += step) {
      for (let y = -13; y < 13; y += step) {
        const xm = metersFromMiles(x);
        const ym = metersFromMiles(y);

        // get the four corners, A, B, C, D
        const A = new Vector3(xm, 0 - drop(xm, ym, rm), -ym);
        const B = new Vector3(xm + sm, 0 - drop(xm + sm, ym, rm), -ym);
        const C = new Vector3(
          xm + sm,
          0 - drop(xm + sm, ym + step, rm),
          -(ym + sm)
        );
        const D = new Vector3(xm, 0 - drop(xm, ym + sm, rm), -(ym + sm));

        vertices.push(B.x, B.y, B.z);
        vertices.push(A.x, A.y, A.z);
        vertices.push(C.x, C.y, C.z);
        vertices.push(D.x, D.y, D.z);

        // normal is just the positive Z direction, i.e. back twards the camera
        normals.push(0, 0, 1);
        normals.push(0, 0, 1);
        normals.push(0, 0, 1);
        normals.push(0, 0, 1);

        uvs.push(0, 1);
        uvs.push(1, 1);
        uvs.push(0, 0);
        uvs.push(1, 0);

        // default winding order for visibility is counter clockwise.
        indices.push(index, index + 2, index + 1);
        indices.push(index + 2, index + 3, index + 1);

        index += 4;
      }
    }
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  }

  toJSON() {
    assert(false, 'SimpleOceanGeometry toJSON unimplemented');
  }
}

export class CNodeDisplayOcean extends CNode3DGroup {
  constructor(v) {
    super(v);
    this.checkInputs(['material']);

    this.oceanMesh = null;

    this.recalculate();
  }

  rebuild() {
    this.group.remove(this.oceanMesh);
    dispose(this.oceanGeometry);

    // now batch the geometry in a single mesh
    //   const cloudData = this.in.cloudData.v0
    const radius = this.in.radius.v0;
    //   this.altitude = cloudData.altitude;
    this.oceanGeometry = new SimpleOceanGeometry(
      this.w,
      this.h,
      this.altitude,
      radius
    );
    this.oceanMesh = new Mesh(this.oceanGeometry, this.in.material.v(0));
    this.group.add(this.oceanMesh);

    this.propagateLayerMask();
  }

  recalculate() {
    this.rebuild();
  }
}
