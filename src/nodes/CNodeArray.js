import {assert, RollingAverage, RollingAverageDegrees} from "../utils";
import {CNode} from "./CNode";
import {MISB} from "../MISB";

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




