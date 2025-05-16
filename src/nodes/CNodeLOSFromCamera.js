// a simple camera track that takes a named camera node and returns position and heading
// using the position and orientation of that camera
// assumes the camera does not move per frame
// but will update based on changed to the camera node
import {PerspectiveCamera, Vector3} from "three";
import {Sit} from "../Globals";
import {CNodeEmptyArray} from "./CNodeArray";
import {assert} from "../assert.js";
import {getAzElFromPositionAndForward} from "../SphericalMath";

export class CNodeLOSFromCamera extends CNodeEmptyArray {
    constructor(v) {
        super(v);
        this.input("cameraNode");

        this.useRecorded = v.useRecorded ?? false;

        if (this.frames == 0) {
            this.frames = Sit.frames;
            this.useSitFrames = true;
        }

        // we'll be using a dummy camera to get the position and heading
        this.dummyCamera = new PerspectiveCamera();
    }

    getValueFrame(f) {

        // swap in a dummy camera and update the camera node
        // this seems imperfect, as it does not account for state changes in
        // a camera node that might affect the camera's position
        // I don't think we have any examples of that yet
        // cameras are controlled by controllers
        const cameraNode = this.in.cameraNode
        const oldCamera = cameraNode.camera;
        cameraNode._object = this.dummyCamera; // _object is the camera object
        // patch so this does not count as a controller update (recursion check)
        // applyControllersCount will be incremented by the cameraNode.update call
        // (in applyControllers), so will be unchanged after this call
        cameraNode.applyControllersCount--;
        cameraNode.update(f);
        const camera = cameraNode.camera;

        // restore the original camera
        cameraNode._object = oldCamera;

        if (this.useRecorded) {
            return cameraNode.recordedLOS;
        }

        // then extract the position and heading from the dummy camera
        camera.updateMatrixWorld()
        assert(camera !== undefined, "CNodeLOSFromCamera has Missing Camera = " + this.cameraName)
        var position = camera.position.clone()
        var fwd = new Vector3();
        fwd.setFromMatrixColumn(camera.matrixWorld, 2);
        fwd.multiplyScalar(-1)
        // also return the up and right vectors of the camera
        var up = new Vector3();
        up.setFromMatrixColumn(camera.matrixWorld, 1);
        var right = new Vector3();
        right.setFromMatrixColumn(camera.matrixWorld, 0);
        return {position: position, heading: fwd, up: up, right: right};
    }
}


export class CNodeAzFromLOS extends CNodeEmptyArray {
    constructor(v) {
        super(v);
        this.input("LOS");
        this.recalculate()
    }

    recalculate() {
        this.array = [];
        this.frames = this.in.LOS.frames

        for (let f = 0; f < this.frames; f++) {
            const los = this.in.LOS.v(f)
            const start = los.position.clone();
            const heading = los.heading.clone();

            const [az, el] = getAzElFromPositionAndForward(start, heading)

            this.array.push(az)
        }
    }

}
