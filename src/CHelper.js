import { EA2XYZ, PRJ2XYZ } from './SphericalMath';
// import {LineGeometry} from "three/addons/lines/LineGeometry.js";
// import {Line2} from "three/addons/lines/Line2.js";
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { Line2 } from 'three/addons/lines/Line2.js';

import { Group } from 'three';
import { makeMatLine } from './MatLines';

const matLineHorizon = makeMatLine(0x0000ff, 2.5);
const matLineBlue = makeMatLine(0x8080ff, 1.0);
const matLineRed = makeMatLine(0xff8080, 1.0);

// these are the hemispheres used by CNodeDisplayATFLIR, the appear in front of the pod
class SphericalGridHelper extends Group {
  constructor(vizRadius) {
    super();

    const pitchStep = 2;
    const rollStep = 1;
    const pitchGap = 10;
    const rollGap = 10;

    // Blue Pitch lines (radiating out)
    for (let roll = 0; roll <= 360; roll += rollGap) {
      const line_points = [];
      for (let pitch = 0; pitch <= 90; pitch += pitchStep) {
        const A = PRJ2XYZ(pitch, roll, 0, vizRadius);
        const B = PRJ2XYZ(pitch + pitchStep, roll, 0, vizRadius);
        line_points.push(A.x, A.y, A.z);
      }
      const geometry = new LineGeometry();
      geometry.setPositions(line_points);
      let line2;
      if (roll === 90 || roll === 270)
        line2 = new Line2(geometry, matLineHorizon);
      else line2 = new Line2(geometry, matLineBlue);

      line2.computeLineDistances();
      line2.scale.setScalar(1);
      this.add(line2);
    }

    // Red Roll lines (circling)
    for (let pitch = 0; pitch <= 90; pitch += pitchGap) {
      const line_points = [];
      for (let roll = 0; roll <= 360; roll += rollStep) {
        const A = PRJ2XYZ(pitch, roll, 0, vizRadius);
        const B = PRJ2XYZ(pitch, roll + rollStep, 0, vizRadius);
        line_points.push(A.x, A.y, A.z);
      }
      const geometry = new LineGeometry();
      geometry.setPositions(line_points);
      const line2 = new Line2(geometry, matLineRed);

      line2.computeLineDistances();
      line2.scale.setScalar(1);
      this.add(line2);
    }
  }
}

class AzElHelper extends Group {
  constructor(vizRadius) {
    super();

    const elStep = 2;
    const azStep = 1;
    const elGap = 10;
    const azGap = 10;

    for (let el = -90; el <= 90; el += elGap) {
      const line_points = [];
      for (let az = -90; az <= 90; az += azStep) {
        const A = EA2XYZ(el, az, vizRadius);
        //   var B = EA2XYZ(el+elStep, az, vizRadius)
        line_points.push(A.x, A.y, A.z);
      }
      const geometry = new LineGeometry();
      geometry.setPositions(line_points);
      let line2;
      if (el === 0) line2 = new Line2(geometry, makeMatLine(0xffff00, 2.0));
      else line2 = new Line2(geometry, makeMatLine(0xffff00, 0.75));

      line2.computeLineDistances();
      line2.scale.set(1, 1, 1);
      this.add(line2);
    }

    // vertical EL lines
    for (let az = -90; az <= 90; az += azGap) {
      const line_points = [];
      for (let el = -90; el <= 90; el += azStep) {
        const A = EA2XYZ(el, az, vizRadius);
        //    var B = EA2XYZ(el, az+azStep, vizRadius)
        line_points.push(A.x, A.y, A.z);
      }
      const geometry = new LineGeometry();
      geometry.setPositions(line_points);
      let line2;
      if (az === 0) line2 = new Line2(geometry, makeMatLine(0x00ff00));
      else line2 = new Line2(geometry, makeMatLine(0x00c000, 1.0));

      line2.computeLineDistances();
      line2.scale.set(1, 1, 1);
      this.add(line2);
    }
  }
}

export { AzElHelper, SphericalGridHelper };
