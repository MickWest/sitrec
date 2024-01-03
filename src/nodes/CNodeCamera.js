import {CNode} from "./CNode";
import {PerspectiveCamera} from "../../three.js/build/three.module";
import {MV3} from "../threeExt";
import {assert, atan, degrees, f2m, m2f, radians, tan} from "../utils";
import {GlobalPTZ, NodeMan, Sit} from "../Globals";
import {ECEFToLLAVD_Sphere, EUSToECEF, LLAToEUSMAP, wgs84} from "../LLA-ECEF-ENU";
import {raisePoint} from "../SphericalMath";
import {isKeyHeld} from "../KeyBoardHandler";
import {ViewMan} from "./CNodeView";

export class CNodeCamera extends CNode {
    constructor(v) {
        super(v);

        this.addInput("altAdjust", "altAdjust", true);

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

    addControllerNode(node) {

        this.controllers.push(node)
        return this;
    }

    get camera() { return this._camera}

    update(f) {
        super.update(f);
        for (const controller of this.controllers) {
            controller.apply(f, this);
        }

        if (this.in.altAdjust !== undefined) {
            // raise or lower the position
            this.camera.position.copy(raisePoint(this.camera.position,f2m(this.in.altAdjust.v())))
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


export class CNodeCameraControllerManualPosition extends CNodeCameraController {
    constructor(v) {
        super(v);
    }

    apply(f, cameraNode) {
        if (isKeyHeld('l')) {
            const mainView = ViewMan.get("mainView")
            const cursorPos = mainView.cursorSprite.position.clone();
            // convert to LLA
            const ecef = EUSToECEF(cursorPos)
            const LLA = ECEFToLLAVD_Sphere(ecef)

            // we set the values in the UI nodes, which creates an
            // automatic cascade recalculation for anything that uses them.
            NodeMan.get("cameraLat").value = LLA.x
            NodeMan.get("cameraLon").value = LLA.y
            NodeMan.get("cameraLat").recalculateCascade() // manual update

            // patch refresh any ptz controls
            if (GlobalPTZ !== undefined) {
                GlobalPTZ.refresh();
            }
            cameraNode.syncUIPosition();
        }

    }

}



export class CNodeCameraControllerFocalLength extends CNodeCameraController {
    constructor(v) {
        super(v);
        this.input("focalLength")
    }

    apply(f, cameraNode) {
        const camera = cameraNode.camera
        const focal_len = this.in.focalLength.v(f).focal_len;
        const referenceFocalLength = 166;               // reference focal length
        const referenceFOV = radians(5)         // reference FOV angle
        const sensorSize = 2 * referenceFocalLength * tan(referenceFOV / 2)

        const vFOV = degrees(2 * atan(sensorSize / 2 / focal_len))

        camera.fov = vFOV;
        camera.updateProjectionMatrix()

        cameraNode.syncUIPosition();
    }

}

// look at a specified LLA point
export class CNodeCameraControllerLookAtLLA extends CNodeCameraController {
    constructor(v) {
        super(v);
        this.input("lat")
        this.input("lon")
        this.input("alt")
    }

    apply(f, cameraNode) {
        const camera = cameraNode.camera
        var radius = wgs84.RADIUS

        var to = LLAToEUSMAP(
            this.in.lat.v(f),
            this.in.lon.v(f),
            this.in.alt.v(f),
            radius
        )
        camera.lookAt(to)

        cameraNode.syncUIPosition();
    }

}
