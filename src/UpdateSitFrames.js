import {GlobalDateTimeNode, Sit} from "./Globals";
import {assert} from "./assert";

export function updateSitFrames() {
    if (Sit.framesFromVideo) {

        if (Sit.bFrame === Sit.frames-1) {
            // if bFrame is at the end of the old range
            // then we need to update it to the new range
            // otherwise, leave it alone
            Sit.bFrame = Sit.videoFrames - 1;
        }

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