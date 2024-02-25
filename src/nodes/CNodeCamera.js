import {Camera, PerspectiveCamera} from "../../three.js/build/three.module";
import {MV3} from "../threeExt";
import {assert, f2m, m2f} from "../utils";
import {NodeMan} from "../Globals";
import {ECEFToLLAVD_Sphere, EUSToECEF, LLAVToEUS} from "../LLA-ECEF-ENU";
import {raisePoint} from "../SphericalMath";
import {CNode3D} from "./CNode3D";

export class CNodeCamera extends CNode3D {
    constructor(v, camera = null) {
        super(v);

        this.addInput("altAdjust", "altAdjust", true);

        this.startPos = v.startPos;
        this.lookAt = v.lookAt;
        this.startPosLLA = v.startPosLLA;
        this.lookAtLLA = v.lookAtLLA;

        if (camera) {
            this._object = camera;
        } else {
            this._object = new PerspectiveCamera(v.fov, v.aspect, v.near, v.far);
        }

        if (v.layers !== undefined) {
            this._object.layers.mask = v.layers;
        }

        this.resetCamera()


    }

    // when a camera object is treated like a track
    // it can only return the current position
    // so if you want to get the position at a specific frame
    // you need to use a CNodeTrack object or similar
    getValueFrame(f) {
        return this._object.position;
    }

    resetCamera() {
        if (this.startPos !== undefined) {
            this._object.position.copy(MV3(this.startPos));  // MV3 converts from array to a Vector3
        }

        if (this.lookAt !== undefined) {
            this._object.lookAt(MV3(this.lookAt));
        }

        if (this.startPosLLA !== undefined) {
            this._object.position.copy(LLAVToEUS(MV3(this.startPosLLA)));  // MV3 converts from array to a Vector3
        }

        if (this.lookAtLLA !== undefined) {
            this._object.lookAt(LLAVToEUS(MV3(this.lookAtLLA)));

        }
    }



    get camera() {
        return this._object
    }

    update(f) {
        super.update(f);


        if (this.in.altAdjust !== undefined) {
            // raise or lower the position
            this.camera.position.copy(raisePoint(this.camera.position, f2m(this.in.altAdjust.v())))
        }

    }


    updateUIPosition() {
        // propagate the camera position values value to the camera position UI (if there is one)
        if (NodeMan.exists("cameraLat")) {
            const ecef = EUSToECEF(this.camera.position)
            const LLA = ECEFToLLAVD_Sphere(ecef)
            NodeMan.get("cameraLat").value = LLA.x
            NodeMan.get("cameraLon").value = LLA.y
            NodeMan.get("cameraAlt").value = m2f(LLA.z)
        }
    }


    syncUIPosition() {
        // propogate the camera position values value to the camera position UI (if there is one)
        // and then recalculate dependent nodes
        if (NodeMan.exists("cameraLat")) {
            this.updateUIPosition();

            // we should not even need this, UI changes will trigger a recalculation cascade
            // if they change
            //    NodeMan.get("cameraLat").recalculateCascade() // manual update
        }
    }
}

// given a camera object that's either:
//  - a Three.js Camera
//  - a CNodeCamera object
//  - the name of a CNodeCamera object
// then return a CNodeCamera object, creating one if needed ot wrap the Camera
export function getCameraNode(cam) {
    var cameraNode;
    if (cam instanceof Camera) {
        // It's a THREE.JS Camaera, so encapsulate it in a CNodeCamera
        cameraNode = new CNodeCamera("cameraNode",cam)
    } else {
        cameraNode = NodeMan.get(cam) // this handles disambiguating Nodes and Node Names.
        //assert(cameraNode instanceof CNodeCamera, "CNodeView3D ("+this.id+") needs a camera node")
    }
    return cameraNode;
}



