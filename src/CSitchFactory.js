import { CManager } from './CManager';

// This is just a singleton CManager for Sitches.
// Might have extended functionality later.
export class CSitchFactory extends CManager {
  register(sitch) {
    this.add(sitch.name, sitch);
  }
}
