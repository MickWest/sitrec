// info for a data series to be displayed on a graph
import {NodeMan} from "../Globals";
import {CNode} from "./CNode";
import {CNodeCloudData} from "./CNodeCloudData";

export class CNodeGraphSeries extends CNode {
    constructor(v) {
        if (v.id === undefined && v.name !== undefined) {
            v.id = v.name;
        }
        super(v);
        this.name = v.name ?? "??"
        this.color = v.color ?? "#00FF00"  // default to green line
        //     assert (v.inputs.source instanceof CNode, "CNodeGraphSeries source is not a node")
        this.input("source")
        // if the source if frameless (i.e. does have a known number of frames) then this node is frameless
        // that does not mean it's constant, just that it's sources will handle the range of frames
        if (this.in.source.frameless) {
            this.frameless = true
            this.frames = 0;
        } else {
            this.frames = this.in.source.frames;
        }
        this.lines = v.lines
        this.min = v.min
        this.max = v.max
    }

    getValueFrame(f) {
        return this.in.source.getValueFrame(f)
    }
}

