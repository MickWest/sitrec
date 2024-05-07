// a simple camera track that takes a named camera node and returns position and heading
// using the position and orientation of that camera
// assumes the camera does not move per frame
// but will update based on changed to the camera node
import {CNode} from "./CNode";
import {assert} from "../utils";
import {Vector3} from "../../three.js/build/three.module";
import {NodeMan, Sit} from "../Globals";
import {CNodeEmptyArray} from "./CNodeArray";
import {PerspectiveCamera} from "three";

export class CNodeLOSFromCamera extends CNodeEmptyArray {
    constructor(v) {
        super(v);
        this.input("cameraNode");

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

        // then extract the position and heading from the dummy camera
        camera.updateMatrixWorld()
        assert(camera !== undefined, "CNodeLOSFromCamera has Missing Camera = " + this.cameraName)
        var position = camera.position.clone()
        var fwd = new Vector3();
        fwd.setFromMatrixColumn(camera.matrixWorld, 2);
        fwd.multiplyScalar(-1)
        return {position: position, heading: fwd};
    }
}
