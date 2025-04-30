import {CNodeVideoView} from "./CNodeVideoView";

export class CNodeMirrorVideoView extends CNodeVideoView {
    constructor(v) {
        super(v);
        this.input("mirror")

        // a mirror video just shows the same frames as another video view
        // so we are just reusing the data, and should not have to recalculate anything.

        this.Video = this.in.mirror.Video;
    }

    // update just checks to see if the video has changed
    // use the new video if it has
    update() {
        if (this.in.mirror.Video !== this.Video) {
            this.Video = this.in.mirror.Video;
        }
    }
}