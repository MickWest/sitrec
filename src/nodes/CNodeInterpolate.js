// an start/end frames should be given the SMALLEST frame the node is of a certain value
// and then the SMALLEST (closest to zero) frame it's another value
// this gives us a simple perfect linear relationship with no additional interpolating needed
// if we are not passed in the frame numbers, then we use 0 .. this.frame
import {Sit} from "../Globals";
import {CNode} from "./CNode";

class CNodeInterpolate extends CNode {
    constructor(v) {
        super(v)
        // this.start = v.start;
        // this.end   = v.end;

        if (this.frames === 0) {
            console.warn("CNodeInterpolate: frames is zero, setting to Sit.frames")
            this.frames = Sit.frames;
            this.useSitFrames = true;
        }

        this.input("start")
        this.input("end")

        this.startFrame = v.startFrame ?? 0;
        this.endFrame = v.endFrame ?? this.frames - 1;
    }

    getValueFrame(frame) {
        const f = frame - this.startFrame; // might be negative, or > frames, no problem.
        const n = this.endFrame - this.startFrame;
        const result = this.in.start.v(f) + f / n * (this.in.end.getValue(f) - this.in.start.getValue(f))
        return result;
    }
}

export {CNodeInterpolate};
