// A track from a lat, lon, alt source
import { Sit } from '../Globals';
import { LLAToEUS } from '../LLA-ECEF-ENU';
import { CNodeTrack } from './CNodeTrack';

export class CNodeTrackFromLLA extends CNodeTrack {
  constructor(v) {
    super(v);
    this.input('lat');
    this.input('lon');
    this.input('alt');
    this.frames = this.in.lat.frames;
    if (this.frames === 0) {
      this.frames = Sit.frames;
      this.useSitFrames = true;
    }
  }

  // takes LLA inputs and converts to a position in EUS format
  getValueFrame(frame) {
    const lat = this.in.lat.v(frame);
    const lon = this.in.lon.v(frame);
    const alt = this.in.alt.v(frame);
    const eus = LLAToEUS(lat, lon, alt);
    return { position: eus };
  }
}
