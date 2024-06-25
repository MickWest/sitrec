// Dispaly an arrow from an object to a celestial body

import {assert} from "../assert";
import {DebugArrow, removeDebugArrow} from "../threeExt";
import {CNode} from "./CNode";
import {GlobalDateTimeNode} from "../Globals";
import {convertColorInput} from "../ConvertColorInputs";
import {getCelestialDirection} from "../CelestialMath";

export class CNodeCelestialArrow extends CNode {
    constructor(v) {
        super(v);
        convertColorInput(v,"color",this.id)
        v.length ??= 1000;
        this.body = v.body;    // "Sun", "Moon", "Mars", etc
        this.input("object");  // object to display arrow from
        this.input("length");  // length of arrow
        this.input("color");   // color of arrow
    }

    update(f) {
        const ob = this.in.object._object;
        assert(ob !== undefined, "CNodeDebugMatrixAxes: object is undefined");
        // get a date object from the global date manager
         const date = GlobalDateTimeNode.dateNow;
         const dir = getCelestialDirection(this.body, date, ob.position);

         this.arrowName = ob.id+"_toSun"
         DebugArrow(this.arrowName, dir, ob.position, this.in.length.v0, this.in.color.v0);

    }

    dispose() {
        removeDebugArrow(this.arrowName)
        super.dispose();
    }


}