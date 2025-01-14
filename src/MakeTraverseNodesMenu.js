// IMPORTANT node here
// The LOSTraverseSelect node is the selected LOS traversal method
// We pass in which ones of the above we want, plue any extra ones
// (For example in Agua we add the ufoSplineEditor node)
import {CNodeSwitch} from "./nodes/CNodeSwitch";
import {guiMenus, Sit} from "./Globals";

export function MakeTraverseNodesMenu(id, traverseInputs, defaultTraverse, idExtra = "", exportable = true) {


    let traverseInputs2 = {}
    for (var inputID in traverseInputs) {
        traverseInputs2[inputID] = traverseInputs[inputID] + idExtra
    }

    let nodeMenu = new CNodeSwitch({
        id: id,
        inputs: traverseInputs2,
        desc: "LOS Traverse Method " + idExtra,
        default: defaultTraverse,
        exportable: exportable,

    }, guiMenus.traverse)

    // bit of a patch
    nodeMenu.frames = Sit.frames;
    nodeMenu.useSitFrames = true;
    return nodeMenu;

}