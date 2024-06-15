import {CNodeEmptyArray} from "./CNodeArray";
import {ExpandKeyframes, radians, RollingAverage, tan} from "../utils";
import {FileManager, Sit} from "../Globals";
import {V3} from "../threeUtils";


/*
example usage:
    motionTrackLOS: {
        id:"motionTrackLOS",
        cameraTrack:new CNodeLOSFromCamera({id:"cameraTrack", camera:"lookCamera"}),
        csv:"hayleCSV",
        width:1280,
        height:714,
        fov:10,
        frameCol:0,
        xCol:1,
        yCol:2,
    },
 */

export class CNodeLOSMotionTrack extends CNodeEmptyArray {
    constructor(v) {
        if (!v.frames) {
            v.frames = Sit.frames;
            super(v);
            this.useSitFrames = true;
        } else {
            super(v);
        }
        this.input("cameraTrack")
        this.csv = FileManager.get(v.csv)
        // we take the two columns of x and y tracking (which will not be every frame)
        // and make two full size arrays, one entry per frame
        // from this we will later create heading vectors
        this.xValues = ExpandKeyframes(this.csv, this.frames, v.frameCol, v.xCol)
        this.yValues = ExpandKeyframes(this.csv, this.frames, v.frameCol, v.yCol)
        if (v.window > 1) {
            this.xValues = RollingAverage(this.xValues, v.window)
            this.yValues = RollingAverage(this.yValues, v.window)
        }
        this.width = v.width;
        this.height = v.height;
        this.fov = v.fov;

        this.recalculate()
    }

    // given a camera track (which can just be a static position and heading
    // and a csv of motion tracking data
    // and info about the vido size and camera FOV
    // then calculate an array of LOS (position and heading)
    // that replicate that track.
    recalculate() {
        this.array = []
        // calculate the distance to the projection plane
        // units are arbitary, but we can think of it as the video scaled up
        // to 1 pixel = 1 meter, then suspended in the air along the camera's -z vector
        // at a distance that fills the full width of the lookCam view
        // we can then take pixel positions calculated by the motion tracking data
        // and just add them to the center position of this virtual distant video
        // and then draw a line to the new pixel/meter position to get a new LOS
        // NOTE: fov in three.js is the full VERTICAL FOV.
        var d = (this.height / 2) / tan(radians(this.fov / 2))
        for (var f = 0; f < this.frames; f++) {
            var cam = this.in.cameraTrack.v(f)
            var pos = cam.position.clone()
            var fwd = cam.heading.clone() // this cannot change
            var up = V3(0, 1, 0) // default up direction, might want this to be variable later
            var right = V3().crossVectors(up, fwd)
            up.crossVectors(fwd, right)

            // find the midpoint of the virtual video (1 pixel = 1 meter, as above
            var mid = pos.clone().add(fwd.clone().multiplyScalar(d))

        //    DebugArrowAB("Cam to vid",pos,mid,0x00ffff,true)

            var xoff = (this.xValues[f] - this.width / 2)
//            var xoff = (this.width/2)
            var yoff = (this.yValues[f] - this.height / 2)

            mid.add(right.clone().multiplyScalar(-xoff))
            mid.add(up.clone().multiplyScalar(-yoff))
            var newFwd = mid.sub(pos).normalize()

            this.array[f] = {position: pos, heading: newFwd}


        }


    }

}


