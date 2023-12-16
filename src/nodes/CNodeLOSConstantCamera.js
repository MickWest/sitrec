// a simple camera track that takes a named camera node and returns position and heading
// using the position and orientation of that camera
// assumes the camera does not move
import {CNode} from "./CNode";
import {assert} from "../utils";
import {Vector3} from "../../three.js/build/three.module";
import {NodeMan} from "../Globals";

export class CNodeLOSConstantCamera extends CNode {
    constructor(v) {
        super(v);
        this.cameraName = v.camera;
    }

    getValueFrame(f) {
        const camera = NodeMan.get(this.cameraName).camera
        camera.updateMatrixWorld()
        assert(camera !== undefined, "CNodeLOSConstantCamera has Missing Camera = " + this.cameraName)
        var position = camera.position.clone()
        var fwd = new Vector3();
        fwd.setFromMatrixColumn(camera.matrixWorld, 2);
        fwd.multiplyScalar(-1)
        return {position: position, heading: fwd};

    }
}

