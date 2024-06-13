import {NodeMan} from "./Globals";
import {radians} from "./utils";
import {trackHeading} from "./trackUtils";
import {V3} from "./threeUtils";

// move the main camera based on the lock track
// this makes the camera follow the track (i.e. a plane)
// the camera is moved based on the difference between the current
// position and the last position
// the camera is rotated based on the difference between the current
// heading and the last heading
export function updateLockTrack(view, f) {
    if (view.lockTrackName !== "default" && view.lockTrackName !== undefined) {
        const lockTrack = NodeMan.get(view.lockTrackName);
        // get the current position and heading from the track
        const lockPos = lockTrack.p(f);
        const lockHeading = trackHeading(lockTrack, f)
        if (view.lastLockPos !== null && view.lastLockPos !== undefined) {
            const mainCam = view.camera;
            // TODO: this is a about the Y axis, should it not be local up?
            // TODO: that would require that trackHeading() use the same up vector
            const upAxis = V3(0, 1, 0)
            const offset = lockPos.clone().sub(view.lastLockPos)
            let headingChange = lockHeading - view.lastLockHeading;

            //    console.log("Frame = "+f+" lockPos = "+lockPos.x+","+lockPos.y+","+lockPos.z+" lockHeading = "+lockHeading+" offset = "+offset.x+","+offset.y+","+offset.z+" headingChange = "+headingChange);


            mainCam.position.add(offset)

            // we ignore large heading changes, which will typically be 180s
            // such as in gimbalnear
            // this generally does not happen.
            if (Math.abs(headingChange) > 90) {
                headingChange = 0;
            }

            mainCam.position.sub(lockPos)
            mainCam.position.applyAxisAngle(upAxis, -radians(headingChange))
            mainCam.position.add(lockPos)
            mainCam.rotateOnAxis(upAxis, -radians(headingChange))


            mainCam.updateMatrix()
            mainCam.updateMatrixWorld()
        }

        view.lastLockPos = lockPos;
        view.lastLockHeading = lockHeading;

    } else {
        // if we are not following, then reset the last lock position
        // so that we don't get a jump when we start following again
        view.lastLockPos = null;
        view.lastLockHeading = null;
    }
}