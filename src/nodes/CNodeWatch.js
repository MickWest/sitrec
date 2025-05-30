import {CNode} from "./CNode";
import {Globals, NodeMan, Sit} from "../Globals";
import {assert} from "../assert";

class CNodeWatch extends CNode {
    constructor(v) {
        super(v);
        if (typeof v.ob !== 'string') {
            this.watchObject = v.ob;
        } else {
            switch (v.ob) {
                case "Globals":
                    this.watchObject = Globals;
                    break;
                case "Sit":
                    this.watchObject = Sit;
                    break;
                case "par":
                    this.watchObject = par;
                    break;
                default:
                    assert(false, "CNodeWatch: unknown watch object " + v.ob);
            }
        }
        this.watchID = v.watchID;
        this.value = this.watchObject[this.watchID];
    }

    getValueFrame(frame) {
        return this.value;
    }

    // if it has changed, then we need to recalculate anything that depends on this
    update() {
        if (this.value !== this.watchObject[this.watchID]) {
            this.value = this.watchObject[this.watchID]
            this.recalculateCascade();
        }
    }

}

export {CNodeWatch};
