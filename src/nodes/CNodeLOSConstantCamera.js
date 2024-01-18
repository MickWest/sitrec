// a simple camera track that takes a named camera node and returns position and heading
// using the position and orientation of that camera
// assumes the camera does not move per frame
// but will update based on changed to the camera node
import {CNode} from "./CNode";
import {assert} from "../utils";
import {Vector3} from "../../three.js/build/three.module";
import {NodeMan, Sit} from "../Globals";

export class CNodeLOSConstantCamera extends CNode {
    constructor(v) {
        super(v);
        this.input("camera");


        if (this.frames == 0) this.frames = Sit.frames;
    }

    getValueFrame(f) {
        const camera = this.in.camera.camera
        camera.updateMatrixWorld()
        assert(camera !== undefined, "CNodeLOSConstantCamera has Missing Camera = " + this.cameraName)
        var position = camera.position.clone()
        var fwd = new Vector3();
        fwd.setFromMatrixColumn(camera.matrixWorld, 2);
        fwd.multiplyScalar(-1)
        return {position: position, heading: fwd};
    }
}

