import {Color} from "three";
import {assert} from "./assert";
import {CNodeConstant} from "./nodes/CNode";

export function convertColorInput(v, name, id="unnamedColorInput") {
    if (v[name] !== undefined && !(v[name] instanceof CNodeConstant)) {
        var colorObject = v[name];
        if (! (colorObject instanceof Color)) {
            if (typeof colorObject === "string" || typeof colorObject === "number" ) {
                // hex string or number
                colorObject = new Color(colorObject)
            } else if (Array.isArray(colorObject)) {
                colorObject = new Color(colorObject[0], colorObject[1], colorObject[2])
            } else {
                assert(0, "CNode color input not understood");
                console.log("CNode color input not understood")
            }
        }

        v[name] = new CNodeConstant({id:id+"_"+name+"_colorInput", value: colorObject})
    }

}