import {Camera, PerspectiveCamera, Vector3} from "three";
import {f2m, m2f, vdump} from "../utils";
import {guiMenus, NodeMan} from "../Globals";
import {ECEFToLLAVD_Sphere, EUSToECEF, EUSToLLA, LLAVToEUS} from "../LLA-ECEF-ENU";
import {altitudeAboveSphere, getLocalSouthVector, getLocalUpVector, raisePoint} from "../SphericalMath";
import {CNode3D} from "./CNode3D";
import {MV3} from "../threeUtils";

export class CNodeCamera extends CNode3D {
    constructor(v, camera = null) {
        super(v);

        this.isCamera = true;
        
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

        if (this.id === "mainCamera") {
            guiMenus.view.add(this, "snapshotCamera").name("Snapshot Camera")
                .tooltip("Save the current camera position and heading for use with 'Reset Camera'")
            guiMenus.view.add(this, "resetCamera").name("Reset Camera")
                .tooltip("Reset the camera to the default, or to .last snapshot position and heading\nAlso Numpad-.")
        }

    }

    adjustOrigin(diff) {
        // adjust the camera position
        this.camera.position.add(diff);

        // do we need to adjust the startPos, lookAt, startPosLLA, lookAtLLA?
        // the seems mostly uses as default value

    //    startpos undefined?????

        this.startPos.add(diff);
        this.lookAt.add(diff);
        this.startPosLLA = EUSToLLA(this.startPos);
        this.lookAtLLA = EUSToLLA(this.lookAt);

    }


    modSerialize() {
    // calculate the current position and lookAt in LLA format
        // dump a camera location to the console
        const p = this.camera.position.clone()
        const v = new Vector3();
        v.setFromMatrixColumn(this.camera.matrixWorld,2);
        v.multiplyScalar(-1000)
        v.add(p)
        const posLLA = EUSToLLA(this.camera.position)
        const atLLA = EUSToLLA(v)

        return {
            ...super.modSerialize(),
            startPosLLA: [posLLA.x, posLLA.y, posLLA.z],
            lookAtLLA: [atLLA.x, atLLA.y, atLLA.z],
            fov: this.camera.fov,
        }
    }

    // cameras with controllers can overwrite this
    // but it's useful for cameras like the main camera
    modDeserialize(v) {
        super.modDeserialize(v);
        this.startPosLLA = v.startPosLLA;
        this.lookAtLLA = v.lookAtLLA;
        this.camera.fov = v.fov;
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

        if (this.startPosLLA !== undefined) {
            this._object.position.copy(LLAVToEUS(MV3(this.startPosLLA)));  // MV3 converts from array to a Vector3
        }

        // set the up vector to be the local up vector at the camera position
        const localUp = getLocalUpVector(this._object.position);
        this._object.up.copy(localUp);


        if (this.lookAt !== undefined) {
            this._object.lookAt(MV3(this.lookAt));
        }


        if (this.lookAtLLA !== undefined) {
            this._object.lookAt(LLAVToEUS(MV3(this.lookAtLLA)));

        }
    }


    snapshotCamera() {
        this.camera.updateMatrixWorld();
        var p = this.camera.position.clone()
        const v = new Vector3();
        v.setFromMatrixColumn(this.camera.matrixWorld,2);
        v.multiplyScalar(-1000)
        v.add(p)
        this.startPosLLA = EUSToLLA(this.camera.position)
        this.lookAtLLA = EUSToLLA(v)
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


    goToPoint(point, above = 200, back = 20) {
        const altitude = altitudeAboveSphere(point);
        console.log("Track altitude = " + altitude)


        // get the local up vector at the track point
        const up = getLocalUpVector(point);
        // and south vector
        const south = getLocalSouthVector(point);
        // make a point 200m above, and 20m south
        const newCameraPos = point.clone().add(up.clone().multiplyScalar(above)).add(south.clone().multiplyScalar(back));

        const newCameraPosAltitude = altitudeAboveSphere(newCameraPos);
        console.log("newCameraPos altitude = " + newCameraPosAltitude)

        // set the position to the target
        this.camera.position.copy(newCameraPos);
        // Set up to local up
        this.camera.up.copy(up);
        // and look at the target point
        this.camera.lookAt(point);
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



