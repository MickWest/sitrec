import {GlobalDateTimeNode, Sit} from "./Globals";
import {assert} from "./assert";

export function updateSitFrames() {
    if (Sit.framesFromVideo) {
        console.log(`updateSitFrames() setting Sit.frames to Sit.videoFrames=${Sit.videoFrames}`)
        assert(Sit.videoFrames !== undefined, "Sit.videoFrames is undefined")
        Sit.frames = Sit.videoFrames;
        Sit.aFrame = 0;
        Sit.bFrame = Sit.frames - 1;
    }
    // NodeMan.updateSitFramesChanged();
    // updateGUIFrames();
    // updateFrameSlider();
    GlobalDateTimeNode.changedFrames();
}