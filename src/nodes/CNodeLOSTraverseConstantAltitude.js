// given a LOS node and a radius
// we either have an "altitude" node for constant altitude
// or "startDist" to start at a particular distance along the first line
import { metersFromMiles } from '../utils';
import { Color, Ray, Sphere } from 'three';
import { CNodeTrack } from './CNodeTrack';
import { intersectSphere2, V3 } from '../threeUtils';

export class CNodeLOSTraverseConstantAltitude extends CNodeTrack {
  constructor(v) {
    super(v);
    this.checkInputs(['LOS', 'radius']);
    this.checkExclusiveInputs(['altitude', 'startDist']);
    this.array = [];
    this.recalculate();
  }

  recalculate() {
    this.array = [];
    this.frames = this.in.LOS.frames;
    const earthRadius = metersFromMiles(this.in.radius.v0);
    let startRadius = earthRadius;
    let position;
    let altitudeSphere;

    if (this.in.altitude !== undefined) {
      altitudeSphere = new Sphere(
        V3(0, -earthRadius, 0),
        earthRadius + this.in.altitude.v0
      );
      position = this.in.LOS.v0.position.clone(); // in case there's no initial intersection, default
    }

    for (let f = 0; f < this.frames; f++) {
      const los = this.in.LOS.v(f);

      const result = {};
      if (f === 0 && this.in.startDist !== undefined) {
        position = los.position.clone();
        const heading = los.heading.clone();
        const startDistance = this.in.startDist.v(0);
        heading.multiplyScalar(startDistance);
        position.add(heading);
        startRadius = V3(0, -earthRadius, 0).sub(position).length();
        altitudeSphere = new Sphere(V3(0, -earthRadius, 0), startRadius);
      } else {
        const losPosition = los.position.clone();
        const losHeading = los.heading.clone();
        // we have a line from losPosition, heading vector losHeading
        // and a sphere at position, radius perFrameMotion
        // so find the intersections between the line and the sphere
        const ray = new Ray(losPosition, losHeading);

        const target0 = V3(); // first intersection
        const target1 = V3(); // second intersection
        if (intersectSphere2(ray, altitudeSphere, target0, target1)) {
          // hit the sphere, pick the near or far point
          // if (movingAway)
          //     position = target1;
          //else
          position = target0;
        } else {
          // no intersection, so we use the same distance as the precious point
          const oldDistance = los.position.distanceTo(position);
          position = los.position.clone();
          const heading = los.heading.clone();
          heading.multiplyScalar(oldDistance);
          position.add(heading);

          // override color to red for segments that are not constant speed.
          result.color = new Color(1, 0, 0);
        }
      }
      result.position = position;

      this.array.push(result);
    }
  }

  getValueFrame(f) {
    return this.array[f];
  }
}
