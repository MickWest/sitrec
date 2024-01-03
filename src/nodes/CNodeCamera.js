import {PerspectiveCamera} from "../../three.js/build/three.module";
import {MV3} from "../threeExt";
import {f2m, m2f} from "../utils";
import {NodeMan} from "../Globals";
import {ECEFToLLAVD_Sphere, EUSToECEF} from "../LLA-ECEF-ENU";
import {raisePoint} from "../SphericalMath";
import {CNode3D} from "./CNode3D";

export class CNodeCamera extends CNode3D {
    constructor(v) {
        super(v);

        this.addInput("altAdjust", "altAdjust", true);

        this._object = new PerspectiveCamera(v.fov, v.aspect, v.near, v.far);

        if (v.layers !== undefined) {
            this._object.layers.mask = v.layers;
        }

        if (v.startPos !== undefined) {
            this._object.position.copy(MV3(v.startPos));  // MV3 converts from array to a Vector3
        }

        if (v.lookAt !== undefined) {
            this._object.lookAt(MV3(v.lookAt));
        }

    }

    get camera() { return this._object}





    update(f) {
        super.update(f);


        if (this.in.altAdjust !== undefined) {
            // raise or lower the position
            this.camera.position.copy(raisePoint(this.camera.position,f2m(this.in.altAdjust.v())))
        }

    }

    syncUIPosition() {
        // propogate the camera position values value to the camera position UI (if there is one)
        if (NodeMan.exists("cameraLat")) {
            const ecef = EUSToECEF(this.camera.position)
            const LLA = ECEFToLLAVD_Sphere(ecef)
            NodeMan.get("cameraLat").value = LLA.x
            NodeMan.get("cameraLon").value = LLA.y
            NodeMan.get("cameraAlt").value = m2f(LLA.z)
            NodeMan.get("cameraLat").recalculateCascade() // manual update
        }
    }
}



