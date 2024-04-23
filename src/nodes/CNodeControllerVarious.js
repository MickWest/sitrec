import {assert, atan, degrees, getArrayValueFromFrame, radians, tan} from "../utils";
import {ECEFToLLAVD_Sphere, EUSToECEF, LLAToEUSMAP, wgs84} from "../LLA-ECEF-ENU";
import {isKeyHeld} from "../KeyBoardHandler";
import {ViewMan} from "./CNodeView";
import {gui, NodeMan, Sit} from "../Globals";
import {getLocalEastVector, getLocalNorthVector, getLocalUpVector} from "../SphericalMath";
import {DebugArrow} from "../threeExt";
import {CNodeController} from "./CNodeController";

import {MISB} from "../MISBUtils";
import {Quaternion, Vector3} from "three";


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


//
export class CNodeControllerTrackPosition extends CNodeController {
    constructor(v) {
        super(v);
        this.input("sourceTrack")
    }

    apply(f, objectNode) {
        const camera = objectNode.camera
        var camPos = this.in.sourceTrack.p(f)
        assert(!Number.isNaN(camPos.x),"CNodeControllerTrackPosition: camera.position.x NaN")

        updateCameraAndUI(camPos, camera, objectNode);
    }
}

function updateCameraAndUI(camPos, camera, objectNode) {
    if (camPos.equals(camera.position)) return;

    camera.position.copy(camPos);
    objectNode.syncUIPosition();
}


// Potential usage
//     NodeMan.get("lookCamera").addController("GUIFOV", {
//         id:"lookFOV",
//         fov: this.lookFOV,
//     })
export class CNodeControllerGUIFOV extends CNodeController {
    constructor(v) {
        super(v);

        this.fov = v.fov ?? 60;

        gui.add(this, 'fov', 0.35, 120, 0.01).onChange(value => {
            this.fov = value
        }).listen().name("Look FOV")
    }

    apply(f, objectNode) {
        const camera = objectNode.camera
        camera.fov = this.fov;
        camera.updateProjectionMatrix()
    }
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
        let focal_len = this.in.focalLength.v(f)
        assert(focal_len !== undefined, "CNodeControllerFocalLength: focal_len is undefined")
        assert(focal_len !== null, "CNodeControllerFocalLength: focal_len is null")

        // if it's a number then it's a single value, if it's an object, get the .focal_len member
        if (typeof focal_len === "object") focal_len = focal_len.focal_len
        assert(!Number.isNaN(focal_len), "CNodeControllerFocalLength: focal_len is NaN");

        // focal_len of 0 means we don't have a focal length data field, so use the UI FOV
        if (focal_len === 0) return;

        const camera = objectNode.camera
        const sensorSize = 2 * this.referenceFocalLength * tan(radians(this.referenceFOV) / 2)

        const vFOV = degrees(2 * atan(sensorSize / 2 / focal_len))

        camera.fov = vFOV;
        assert(!Number.isNaN(camera.fov), "CNodeControllerFocalLength: camera.fov is NaN, focal_len="+focal_len+" vFOV="+vFOV);
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

// control FOV directly with a source node that can be a value, an object with a vFOV, or a track with MISB data
export class CNodeControllerFOV extends CNodeController {
    constructor(v) {
        super(v);
        this.input("source")
    }

    apply(f, objectNode) {
        const camera = objectNode.camera
        const value = this.in.source.v(f);

        // if it's a number then use that directly as the FOV
        if (typeof value === "number") {
            camera.fov = value;
        } else if (value.misbRow !== undefined) {
            camera.fov = value.misbRow[MISB.SensorVerticalFieldofView];
        } else if (value.vFOV !== undefined) {
            // it's a track with a vFOV member
            camera.fov = value.vFOV;
        } else {
            assert(0, "CNodeControllerFOV: no vFOV or misbRow member in source track, can't set FOV")
        }
        camera.updateProjectionMatrix()
    }

}


export class CNodeControllerMatrix extends CNodeController {
    constructor(v) {
        super(v);
        this.input("source")
    }

    apply(f, objectNode) {
        const camera = objectNode.camera
        const matrix = this.in.source.v(f).matrix;
        assert(typeof matrix === "object", "CNodeControllerMatrix: worldMatrix is not an object")

        const worldMatrix = matrix.clone();
        // invert the Z basis of worldMatrix as camera is along -Z
        worldMatrix.elements[8] = -worldMatrix.elements[8];
        worldMatrix.elements[9] = -worldMatrix.elements[9];
        worldMatrix.elements[10] = -worldMatrix.elements[10];


// Assuming 'worldMatrix' is the THREE.Matrix4 instance representing the camera's orientation
// And 'camera' is your THREE.PerspectiveCamera or THREE.OrthographicCamera instance

        const position = new Vector3();
        const quaternion = new Quaternion();
        const scale = new Vector3();

// Decompose the world matrix into position, quaternion, and scale
        worldMatrix.decompose(position, quaternion, scale);

// Apply the decomposed values to the camera's quaternion, but not position or scale
//        camera.position.copy(position);
        camera.quaternion.copy(quaternion);
//        camera.scale.copy(scale);

        camera.updateMatrixWorld();
    }

}




//Az and El from a data track that returns a structur with pitch and heading members
export class CNodeControllerAzElData extends CNodeController {
    constructor(v) {
        super(v);
        this.input("sourceTrack")
    }

    apply( f, objectNode) {
        const data = this.in.sourceTrack.v(f)
        const pitch = data.pitch;
        const heading = data.heading;
        const object = objectNode._object;

        applyPitchAndHeading(object, pitch, heading)
    }
}

// Az and El as inputs (so generally single numbers, but can also be tracks
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


export class CNodeControllerATFLIRCamera extends CNodeController {
    constructor(v) {
        super(v);
        this.input("focalMode")
   //     this.input("sensorMode")
        this.input("zoomMode")

    }

    apply(f, objectNode) {
        // frame, mode, Focal Leng
        var focalMode = this.in.focalMode.v(f)
      //  var mode = this.in.sensorMode.v(f)
        var zoom = this.in.zoomMode.v(f)

        var vFOV = 0.7;
        if (focalMode === "MFOV")
            vFOV = 3;
        if (focalMode === "WFOV")
            vFOV = 6
        if (zoom === 2)
            vFOV /= 2

        const camera = objectNode.camera

        camera.fov = vFOV;
        camera.updateProjectionMatrix()
    }
}


// TODO - this like PTZ control, but not using a local up vector
// is it used?
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








