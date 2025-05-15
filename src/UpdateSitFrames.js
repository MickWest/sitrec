import {GlobalDateTimeNode, Sit} from "./Globals";
import {assert} from "./assert";

export function updateSitFrames() {
    if (Sit.framesFromVideo) {
        console.log(`updateSitFrames() setting Sit.frames to Sit.videoFrames=${Sit.videoFrames}`)
        assert(Sit.videoFrames !== undefined, "Sit.videoFrames is undefined")
        Sit.frames = Sit.videoFrames;
        //Sit.aFrame = 0;
        //Sit.bFrame = Sit.frames - 1;

        // just clamp A and B to the new range
        // leave them alone otherwise (they are serialized from Sit)
        Sit.aFrame = Math.min(Sit.aFrame, Sit.frames - 1);
        Sit.bFrame = Math.min(Sit.bFrame, Sit.frames - 1);


    }
    // NodeMan.updateSitFramesChanged();
    // updateGUIFrames();
    // updateFrameSlider();
    GlobalDateTimeNode.changedFrames();
}