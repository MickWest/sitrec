import { CNodeEmptyArray } from './CNodeArray';
import { GlobalDateTimeNode } from '../Globals';
import { EUSToLLA } from '../LLA-ECEF-ENU';

export class CNodeTrack extends CNodeEmptyArray {
  exportTrackCSV() {
    let csv = 'Frame,time,Lat,Lon,Alt\n';
    let pos = this.v(0);
    if (pos === undefined || pos.position === undefined) {
      console.error('No position data to export');
      return;
    }
    for (let f = 0; f < this.frames; f++) {
      pos = this.v(f);
      const LLA = EUSToLLA(pos.position);

      const time = GlobalDateTimeNode.frameToMS(f);

      //        csv += f + "," + (pos[0]) + "," + (pos[1]) + "," + f2m(pos[2]) + "\n"
      csv += `${f},${time},${LLA.x},${LLA.y},${LLA.z}\n`;
    }
    saveAs(new Blob([csv]), `trackFromMISB-${this.id}.csv`);
  }

  // calculate min and max LLA extents of the track
  // from the ESU positions
  getLLAExtents() {
    let pos = this.v(0);
    if (pos === undefined || pos.position === undefined) {
      console.error('No position data to find extents of track');
      return;
    }
    let minLat = 90;
    let maxLat = -90;
    let minLon = 180;
    let maxLon = -180;
    let minAlt = 1000000;
    let maxAlt = -1000000;
    for (let f = 0; f < this.frames; f++) {
      pos = this.v(f);
      const LLA = EUSToLLA(pos.position);
      minLat = Math.min(minLat, LLA.x);
      maxLat = Math.max(maxLat, LLA.x);
      minLon = Math.min(minLon, LLA.y);
      maxLon = Math.max(maxLon, LLA.y);
      minAlt = Math.min(minAlt, LLA.z);
      maxAlt = Math.max(maxAlt, LLA.z);
    }
    return { minLat, maxLat, minLon, maxLon, minAlt, maxAlt };
  }
}

export function trackLength(node) {
  const frames = node.frames;
  let len = 0;
  let A = node.p(0);
  for (let i = 1; i < frames; i++) {
    const B = node.p(i);
    len += B.clone().sub(A).length();
    A = B;
  }
  return len;
}
