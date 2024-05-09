// given a source track and a start and end frame
// linearly interpolate all frames from that
import {CNodeTrack} from "./CNodeTrack";

export class CNodeInterpolateTwoFramesTrack extends CNodeTrack {
    constructor(v) {
        super(v);
        this.input("source")

        v.start ??= 0;
        v.end ??= this.in.source.frames - 1;

        this.input("start")
        this.input("end")
        this.frames = this.in.source.frames;
        this.fps = this.in.source.fps;
    }

    getValueFrame(frame) {
        const startFrame = this.in.start.v()
        const endFrame = this.in.end.v()
        const startPos = this.in.source.p(startFrame)
        const endPos = this.in.source.p(endFrame)
        const step = endPos.clone().sub(startPos).divideScalar(endFrame - startFrame)
        const value = startPos.clone().add(step.clone().multiplyScalar(frame - startFrame))
        return {position: value}
    }


}