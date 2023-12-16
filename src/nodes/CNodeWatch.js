import {NodeMan} from "../Globals";
import {CNode} from "./CNode";
import {CNodeCloudData} from "./CNodeCloudData";

class CNodeWatch extends CNode {
    constructor(v) {
        super(v);
        this.watchObject = v.ob;
        this.watchID = v.id;
    }

    getValueFrame(frame) {
        this.value = this.watchObject[this.watchID]
        return this.value;
    }

}

export {CNodeWatch};
