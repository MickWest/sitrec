import {CNode} from "./CNode";
import {PerspectiveCamera} from "../../three.js/build/three.module";
import {MV3} from "../threeExt";
import {assert, m2f, radians} from "../utils";
import {NodeMan} from "../Globals";
import {ECEFToLLAVD_Sphere, EUSToECEF} from "../LLA-ECEF-ENU";

export class CNodeCamera extends CNode {
    constructor(v) {
        super(v);

        this._camera = new PerspectiveCamera(v.fov, v.aspect, v.near, v.far);

        if (v.layers !== undefined) {
            this._camera.layers.mask = v.layers;
        }

        if (v.startPos !== undefined) {
            this._camera.position.copy(MV3(v.startPos));  // MV3 converts from array to a Vector3
        }

        if (v.lookAt !== undefined) {
            this._camera.lookAt(MV3(v.lookAt));
        }

        this.controllers = [];

    }

    addController(type, def, id) {

        this.controllers.push(NodeMan.create("CameraController"+type, def, id))
        return this;
    }

    get camera() { return this._camera}

    update(f) {
        for (const controller of this.controllers) {
            controller.apply(f, this);
        }
    }

    syncUIPosition() {
        // propogate the camera position values value to the camera position UI (if there is one)
        if (NodeMan.exists("cameraLat")) {
            const ecef = EUSToECEF(this._camera.position)
            const LLA = ECEFToLLAVD_Sphere(ecef)
            NodeMan.get("cameraLat").value = LLA.x
            NodeMan.get("cameraLon").value = LLA.y
            NodeMan.get("cameraAlt").value = m2f(LLA.z)
            NodeMan.get("cameraLat").recalculateCascade() // manual update
        }
    }

}



export class CNodeCameraController extends CNode {
    constructor(v) {
        super(v);
        // this.cameraNode = NodeMan.get(v.cameraNode);
        // assert (this.cameraNode !== undefined, "CNodeCameraController needs a camera node to control")
        // assert (v.camera === undefined, "CNodeCameraController passed a camera as well as cameraNode")

    }
}

export class CNodeCameraControllerTrackToTrack extends CNodeCameraController {
    constructor(v) {
        super(v);
        this.input("cameraTrack")
        this.input("targetTrack")
    }

    apply(f, cameraNode) {
        const camera = cameraNode.camera
        var camPos = this.in.cameraTrack.p(f)
        var targetPos = this.in.targetTrack.p(f)
        camera.position.copy(camPos);
        camera.lookAt(targetPos)

        cameraNode.syncUIPosition(); //
    }
}

export class CNodeCameraControllerTilt extends CNodeCameraController {
    constructor(v) {
        super(v);
        this.input("tilt")
    }

    apply(f,cameraNode) {
        const camera = cameraNode.camera
        const tilt = this.in.tilt.v(f)
        camera.rotateX(-radians(tilt))
    }
}


export class CNodeCameraControllerTrackAzEl extends CNodeCameraController {
    constructor(v) {
        super(v);
        this.input("cameraTrack")
    }

    apply(f, cameraNode) {
        const camera = cameraNode.camera
        var camPos = this.in.cameraTrack.p(f)
        camera.position.copy(camPos);
        cameraNode.syncUIPosition();
    }

}

