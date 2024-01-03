import {atan, degrees, radians, tan} from "../utils";
import {CNode} from "./CNode";
import {ECEFToLLAVD_Sphere, EUSToECEF, LLAToEUSMAP, wgs84} from "../LLA-ECEF-ENU";
import {isKeyHeld} from "../KeyBoardHandler";
import {ViewMan} from "./CNodeView";
import {GlobalPTZ, NodeMan} from "../Globals";

export class CNodeController extends CNode {
    constructor(v) {
        super(v);
        // this.cameraNode = NodeMan.get(v.cameraNode);
        // assert (this.cameraNode !== undefined, "CNodeController needs a camera node to control")
        // assert (v.camera === undefined, "CNodeController passed a camera as well as cameraNode")

    }
}

export class CNodeCameraControllerTrackToTrack extends CNodeController {
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

export class CNodeCameraControllerTilt extends CNodeController {
    constructor(v) {
        super(v);
        this.input("tilt")
    }

    apply(f, cameraNode) {
        const camera = cameraNode.camera
        const tilt = this.in.tilt.v(f)
        camera.rotateX(-radians(tilt))
    }
}

export class CNodeCameraControllerTrackAzEl extends CNodeController {
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

export class CNodeCameraControllerManualPosition extends CNodeController {
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

export class CNodeCameraControllerFocalLength extends CNodeController {
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
export class CNodeCameraControllerLookAtLLA extends CNodeController {
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