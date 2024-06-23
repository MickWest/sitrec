import { degrees, metersPerSecondFromKnots, radians, tan } from '../utils';
import { CNode } from './CNode';
import { assert } from '../assert.js';

// rate of turn is [(g * Tan(Bank Angle)) / V]
// with g and V in same units
//
function turnRate(bankDegrees, speedMPS) {
  const g = 9.77468; // local gravity at 36°latitude, 25000 feet https://www.sensorsone.com/local-gravity-calculator/
  const rate = (g * tan(radians(bankDegrees))) / speedMPS;
  return degrees(rate);
}

// given bank and speed inputs, calculate turn rate
export class CNodeTurnRateBS extends CNode {
  constructor(v) {
    super(v);
    assert(this.in.speed !== undefined);
    assert(this.in.bank !== undefined);

    // really need a more general way of setting the nubmer of frames
    this.frames = this.in.bank.frames;
  }

  getValueFrame(f) {
    const jetSpeed = metersPerSecondFromKnots(this.in.speed.getValueFrame(f)); // 351from CAS of 241 (239-242)
    const bank = this.in.bank.getValueFrame(f);
    return turnRate(bank, jetSpeed);
  }
}
