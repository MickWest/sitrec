import { CNode } from './CNode';
import { NodeMan } from '../Globals';

export class CNodeController extends CNode {}

// Utility function to add a controller to a named node
export function addControllerTo(target, controller, def) {
  return NodeMan.get(target).addController(controller, def);
}
