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
    }

    get camera() { return this._camera}

    update() {

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

export class CNodeCameraTrackToTrack extends CNodeCamera {
    constructor(v) {
        super(v);
        this.input("cameraTrack")
        this.input("targetTrack")
        this.optionalInputs(["tilt"])

    }

    update(f) {
        var camPos = this.in.cameraTrack.p(f)
        var targetPos = this.in.targetTrack.p(f)
        this._camera.position.copy(camPos);
        this._camera.lookAt(targetPos)

        if (this.in.tilt !== undefined) {
            const tilt = this.in.tilt.v(f)
            this._camera.rotateX(-radians(tilt))
        }

        this.syncUIPosition(); //
    }

}

export class CNodeCameraTrackAzEl extends CNodeCamera {
    constructor(v) {
        super(v);
        this.input("cameraTrack")
    }

    update(f) {
        var camPos = this.in.cameraTrack.p(f)
        this._camera.position.copy(camPos);
        this.syncUIPosition();
    }

}

