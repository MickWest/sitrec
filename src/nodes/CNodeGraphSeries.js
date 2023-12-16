// info for a data series to be displayed on a graph
import {NodeMan} from "../Globals";
import {CNode} from "./CNode";
import {CNodeCloudData} from "./CNodeCloudData";

export class CNodeGraphSeries extends CNode {
    constructor(v) {
        super(v);
        this.name = v.name ?? "??"
        this.color = v.color ?? "#00FF00"  // default to green line
        //     assert (v.inputs.source instanceof CNode, "CNodeGraphSeries source is not a node")
        this.input("source")
        this.frames = this.in.source.frames;
        this.lines = v.lines
        this.min = v.min
        this.max = v.max
    }

    getValueFrame(f) {
        return this.in.source.getValueFrame(f)
    }
}

