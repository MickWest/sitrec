import {assert, RollingAverage, RollingAverageDegrees} from "../utils";
import {CNode} from "./CNode";
import {MISB} from "../MISB";
import {Sit} from "../Globals";

export class CNodeArray extends CNode {
    constructor(v) {
        v.frames = v.frames ?? v.array.length
        assert (v.array !== undefined, "CNodeArray array undefined")
        super(v);
        // frames?
        this.array = v.array
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
//            console.log("CNodeManualData: frame="+f+" dataIndex="+dataIndex+" value="+this.array[f]);
        }

    }



}


export class CNodeSmoothedArray extends CNodeEmptyArray {
    constructor(v) {
        super(v)
        this.input("source") // source arrau node
        this.input("smooth") // amount to smooth (rolling average window size)
        v.frames = v.array.length;
        this.recalculate();
    }

    recalculate() {
        this.array = RollingAverage(this.in.source.array, this.in.smooth.v0)
    }
}


// export function makeArrayNodeFromColumn(id, array, columnIndex, smooth=0, degrees=false) {
//     assert(0,"makeArrayNodeFromColumn is deprecated")
//     const extractedArray = array.map(x => x[columnIndex])
//     let smoothedArray;
//     if (smooth !== 0) {
//         if (degrees)
//             smoothedArray = RollingAverageDegrees(extractedArray, smooth);
//         else
//             smoothedArray = RollingAverage(extractedArray, smooth);
//     } else {
//         smoothedArray = extractedArray
//     }
//
//     return new CNodeArray({
//         id: id,
//         array: smoothedArray,
//     })
// }

export function makeArrayNodeFromMISBColumn(id, array, columnIndex, smooth=0, degrees=false) {

    // if columnINdex is a string, we need to convert it to a number
    if (typeof columnIndex === "string") {
        // strip off the initial "MISB." if it exists
        if (columnIndex.startsWith("MISB.")) {
            columnIndex = columnIndex.slice(5);
        }
        columnIndex = MISB[columnIndex];
//        console.log("makeArrayNodeFromMISBColumn: converted columnIndex to number = "+columnIndex)
    }

    //const extractedArray = array.map(x => x[columnIndex])
    // here the requested column is in the MISB data
    // the "array" is a per-frame array of position and misbRow;
    const extractedArray = new Array(array.length);
    for (let i = 0; i < array.length; i++) {
        const value = array[i].misbRow[columnIndex];
//        console.log("makeArrayNodeFromMISBColumn: value = "+value+" i="+i+" columnIndex="+columnIndex);
        extractedArray[i] = value;
    }

    let smoothedArray;
    if (smooth !== 0) {
        if (degrees)
            smoothedArray = RollingAverageDegrees(extractedArray, smooth);
        else
            smoothedArray = RollingAverage(extractedArray, smooth);
    } else {
        smoothedArray = extractedArray
    }

    return new CNodeArray({
        id: id,
        array: smoothedArray,
    })
}




