import {assert} from "../utils";
import {CNode} from "./CNode";
import {NodeMan, Sit} from "../Globals";

export class CNodeArray extends CNode {
    constructor(v) {
        v.frames = v.frames ?? v.array.length
        assert (v.array !== undefined, "CNodeArray array undefined")
        super(v);
        // frames?
        this.array = v.array

        this.exportable = v.exportable ?? false;
        if (this.exportable) {
            NodeMan.addExportButton(this, "exportArray", "Export Array ")
        }
    }

    exportArray () {
        let csv = "frame, value\n";
        for (let f=0; f<this.frames; f++) {
            csv += f + "," + this.array[f] + "\n";
        }
        saveAs(new Blob([csv]), "sitrecArray-"+this.id+".csv")
    }


    getValueFrame(frame) {
        return this.array[frame]
    }
}


export class CNodeEmptyArray extends CNodeArray {
    constructor(v) {
        assert (v.array === undefined, "CNodeEmptyArray passed an array, use CArray if that's what you intended")
        v.array = []
        super(v)
    }
}

// example (data driven):
//     focalLength: {kind: "ManualData", data: [0,3000,  745, 1000,]},
export class CNodeManualData extends CNodeEmptyArray {
    constructor(v) {
        super(v);
        this.frames = Sit.frames;
        this.useSitFrames = true;
        this.data = v.data;
        this.array = new Array(this.frames);
        let dataIndex = 0;
        let dataLength = this.data.length;
        for (let f=0; f<this.frames;f++) {
            // if the NEXT frame value is less than or equal to the current frame,
            // then we need to move to the next data value
            while (dataIndex < dataLength-2 && this.data[dataIndex+2] <= f) {
                dataIndex += 2;
            }
            this.array[f] = this.data[dataIndex + 1];
        }

    }



}




