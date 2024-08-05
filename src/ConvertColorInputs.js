import {Color} from "three";
import {assert} from "./assert";
import {CNodeConstant} from "./nodes/CNode";
import {NodeMan} from "./Globals";


// convertColorInput is a helper function that converts a color input to a CNodeConstant
export function convertColorInput(v, name, id="unnamedColorInput") {

    if (v[name] !== undefined) {
        let ob = v[name];

        // if it's the name of a node, get the node
        // will transparently handle ob already being a node
        if (NodeMan.exists(ob)) {
            ob = NodeMan.get(ob);
            v[name] = ob;  // force the color node back into the v parameter
            return;
        }

        // if it's not a CNodeConstant, or derived (like GNodeGUIColor) convert it to one
        if (!(ob instanceof CNodeConstant)) {
            var colorObject = ob;
            if (!(colorObject instanceof Color)) {
                if (typeof colorObject === "string" || typeof colorObject === "number") {
                    // hex string or number
                    colorObject = new Color(colorObject)
                } else if (Array.isArray(colorObject)) {
                    colorObject = new Color(colorObject[0], colorObject[1], colorObject[2])
                } else {
                    assert(0, "CNode color input not understood");
                    console.log("CNode color input not understood")
                }
            }

            v[name] = new CNodeConstant({id: id + "_" + name + "_colorInput", value: colorObject})
        }
    }
}