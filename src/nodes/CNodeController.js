import {atan, degrees, radians, tan} from "../utils";
import {CNode} from "./CNode";
import {ECEFToLLAVD_Sphere, EUSToECEF, LLAToEUSMAP, wgs84} from "../LLA-ECEF-ENU";
import {isKeyHeld} from "../KeyBoardHandler";
import {ViewMan} from "./CNodeView";
import {GlobalPTZ, NodeMan} from "../Globals";
import {getLocalEastVector, getLocalNorthVector, getLocalUpVector} from "../SphericalMath";
import {DebugArrow} from "../threeExt";

export class CNodeController extends CNode {
    constructor(v) {
        super(v);
        // this.objectNode = NodeMan.get(v.objectNode);
        // assert (this.objectNode !== undefined, "CNodeController needs a camera node to control")
        // assert (v.camera === undefined, "CNodeController passed a camera as well as objectNode")

    }
}

// Position the camera on the source track
// Look at the target track
export class CNodeControllerTrackToTrack extends CNodeController {
    constructor(v) {
        super(v);
        this.input("sourceTrack")
        this.input("targetTrack")
    }

    apply(f, objectNode) {
        const camera = objectNode.camera
        var camPos = this.in.sourceTrack.p(f)
        var targetPos = this.in.targetTrack.p(f)
        camera.position.copy(camPos);
        camera.lookAt(targetPos)
        objectNode.syncUIPosition(); //
    }
}

// Just look at the target track
export class CNodeControllerLookAtTrack extends CNodeController {
    constructor(v) {
        super(v);
        this.input("targetTrack")
    }

    apply(f, objectNode) {
        const camera = objectNode.camera
        var targetPos = this.in.targetTrack.p(f)
        camera.lookAt(targetPos)
        objectNode.syncUIPosition(); //
    }
}


export class CNodeControllerTilt extends CNodeController {
    constructor(v) {
        super(v);
        this.input("tilt")
    }

    apply(f, objectNode) {
        const camera = objectNode.camera
        const tilt = this.in.tilt.v(f)
        camera.rotateX(-radians(tilt))
    }
}

export class CNodeControllerTrackAzEl extends CNodeController {
    constructor(v) {
        super(v);
        this.input("sourceTrack")
    }

    apply(f, objectNode) {
        const camera = objectNode.camera

        var camPos = this.in.sourceTrack.p(f)

        updateCameraAndUI(camPos, camera, objectNode);
    }
}

function updateCameraAndUI(camPos, camera, objectNode) {
    if (camPos.equals(camera.position)) return;

    camera.position.copy(camPos);
    objectNode.syncUIPosition();
}


export class CNodeControllerManualPosition extends CNodeController {
    constructor(v) {
        super(v);

        // bit of a patch to only apply this once in an update cycle
        // the problem being that recalculateCastcade() will make the camera node call apply() again
        // this.applying = false;
    }

    apply(f, objectNode) {

        if (this.applying) {
            this.applying = false;
            return;
        }

        if (isKeyHeld('l')) {
            this.applying = true;
            const mainView = ViewMan.get("mainView")
            const cursorPos = mainView.cursorSprite.position.clone();
            // convert to LLA
            const ecef = EUSToECEF(cursorPos)
            const LLA = ECEFToLLAVD_Sphere(ecef)

            // we set the values in the UI nodes, which creates an
            // automatic cascade recalculation for anything that uses them.
            NodeMan.get("cameraLat").value = LLA.x
            NodeMan.get("cameraLon").value = LLA.y

            // patch refresh any ptz controls
            if (GlobalPTZ !== undefined) {
                GlobalPTZ.refresh();
            }
          //  objectNode.syncUIPosition();
        }

    }

}

export class CNodeControllerFocalLength extends CNodeController {
    constructor(v) {
        super(v);
        this.input("focalLength")

        this.referenceFocalLength = v.referenceFocalLength ?? 166;
        this.referenceFOV = v.referenceFOV ?? 5;

    }

    apply(f, objectNode) {
        const focal_len = this.in.focalLength.v(f).focal_len;

        // focal_len of 0 means we don't have a focal length data field, so use the UI FOV
        if (focal_len === 0) return;

        const camera = objectNode.camera
        //const referenceFocalLength = 166;               // reference focal length
        //const referenceFOV = radians(5)         // reference FOV angle
        const sensorSize = 2 * this.referenceFocalLength * tan(radians(this.referenceFOV) / 2)

        const vFOV = degrees(2 * atan(sensorSize / 2 / focal_len))

        camera.fov = vFOV;
        camera.updateProjectionMatrix()

        objectNode.syncUIPosition();
    }

}

// look at a specified LLA point
export class CNodeControllerLookAtLLA extends CNodeController {
    constructor(v) {
        super(v);
        this.input("lat")
        this.input("lon")
        this.input("alt")
    }

    apply(f, objectNode) {
        const camera = objectNode.camera
        var radius = wgs84.RADIUS

        var to = LLAToEUSMAP(
            this.in.lat.v(f),
            this.in.lon.v(f),
            this.in.alt.v(f),
            radius
        )
        camera.lookAt(to)

        objectNode.syncUIPosition();
    }

}


export class CNodeControllerAzElData extends CNodeController {
    constructor(v) {
        super(v);
        this.input("sourceTrack")
    }

    apply( f, objectNode) {
        // here we'll have:
        // focal_len
        // heading, pitch, roll,
        // gHeading, gPitch, gRoll

        const data = this.in.sourceTrack.v(f)
      //  console.log (data.heading+" - "+data.gHeading)
        const pitch = data.pitch;
        const heading = data.heading;
        const object = objectNode._object;

        applyPitchAndHeading(object, pitch, heading)
    }
}

export class CNodeControllerAbsolutePitchHeading extends CNodeController {
    constructor(v) {
        super(v);
        this.input("pitch")
        this.input("heading")
    }

    apply( f, objectNode) {
        const pitch = this.in.pitch.v(f);
        const heading = this.in.heading.v(f);
        const object = objectNode._object;
        applyPitchAndHeading(object, pitch, heading)
    }
}


export function applyPitchAndHeading(object, pitch, heading)
{

    const upAxis = getLocalUpVector(object.position)
    const eastAxis = getLocalEastVector(object.position);
    const northAxis = getLocalNorthVector(object.position)
    const fwd = northAxis.clone()

    fwd.applyAxisAngle(eastAxis, radians(pitch))
    fwd.applyAxisAngle(upAxis, -radians(heading))
    fwd.add(object.position);
    object.up = upAxis;
    object.lookAt(fwd)
    // if (this.roll !== undefined ) {
    //     object.rotateZ(radians(this.roll))
    // }

    const arrowDir = northAxis.clone().applyAxisAngle(upAxis, -radians(heading))
    DebugArrow("DroneHeading", arrowDir, object.position)
    //    const arrowDir2 = northAxis.clone().applyAxisAngle(upAxis, -radians(data.gHeading))
    //    DebugArrow("DroneGimbalHeading", arrowDir2, object.position, 100,"#FFFF00")
}

// Utility function to add a controller to a named node
export function addControllerTo(target, controller, def) {
    return NodeMan.get(target).addController(controller,def);
}
