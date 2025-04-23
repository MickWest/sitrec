import {atan, degrees, radians, tan} from "../utils";
import {ECEFToLLAVD_Sphere, EUSToECEF, LLAToEUS, wgs84} from "../LLA-ECEF-ENU";
import {isKeyHeld} from "../KeyBoardHandler";
import {gui, NodeMan, Sit} from "../Globals";
import {getLocalEastVector, getLocalNorthVector, getLocalUpVector} from "../SphericalMath";
import {adjustHeightAboveGround, DebugArrow} from "../threeExt";
import {CNodeController} from "./CNodeController";

import {MISB} from "../MISBUtils";
import {Quaternion, Vector2, Vector3} from "three";
import {assert} from "../assert.js";
import {ViewMan} from "../CViewManager";


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
        camera.up = objectNode.getUpVector(camera.position)
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
        camera.up = objectNode.getUpVector(camera.position)
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
        const object = objectNode._object; // could be a camera or ony THREE.Object3D
        assert(this.in.sourceTrack !== undefined, "CNodeControllerTrackPosition: sourceTrack is undefined, id=" + this.id)
        var pos = this.in.sourceTrack.p(f)
        assert(!Number.isNaN(pos.x), "CNodeControllerTrackPosition: track's position.x NaN")

        if (object.isCamera) {
            updateCameraAndUI(pos, object, objectNode);
        } else {
            object.position.copy(pos)
        }
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
        assert(this.fov !== undefined && this.fov>0 && this.fov <= 180, `bad fov ${this.fov}` )
        camera.fov = this.fov;
        assert(!Number.isNaN(camera.fov), "CNodeControllerFocalLength: camera.fov is NaN, focal_len="+focal_len+" vFOV="+vFOV);
        assert(camera.fov !== undefined && camera.fov>0 && camera.fov <= 180, `bad fov ${camera.fov}` )
        camera.updateProjectionMatrix()
    }
}

export class CNodeControllerManualPosition extends CNodeController {
    constructor(v) {
        super(v);

        this.aboveGround = v.aboveGround;

        // bit of a patch to only apply this once in an update cycle
        // the problem being that recalculateCastcade() will make the camera node call apply() again
        // this.applying = false;
    }

    apply(f, objectNode) {

        if (this.applying) {
            this.applying = false;
            return;
        }

        // get the camera position, and forward and right vectors
        const camera = objectNode.camera
        let camPos = camera.position.clone()
        const fwd = camera.getWorldDirection(new Vector3())
        const right = new Vector3().crossVectors(fwd, camera.up)

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

            // convert that to a camera position
            camPos = LLAToEUS(LLA.x, LLA.y, LLA.z)
            if (this.aboveGround !== undefined) {
                camPos.y = adjustHeightAboveGround(camPos, this.aboveGround).y
            }
        }



        let speed = 0.1;  // meters per frame
        if (isKeyHeld('Shift')) {
            speed *= 10;
        }
        if (isKeyHeld('w')) {
            camPos.add(fwd.multiplyScalar(speed))
        }
        if (isKeyHeld('s')) {
            camPos.sub(fwd.multiplyScalar(speed))
        }
        if (isKeyHeld('a')) {
            camPos.sub(right.multiplyScalar(speed))
        }
        if (isKeyHeld('d')) {
            camPos.add(right.multiplyScalar(speed))
        }
        if (isKeyHeld('q')) {
            camPos.y += speed
        }
        if (isKeyHeld('e')) {
            camPos.y -= speed
        }

        if (this.aboveGround !== undefined) {
            camPos = adjustHeightAboveGround(camPos, this.aboveGround)
        }

        updateCameraAndUI(camPos, camera, objectNode);


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
        assert(camera.fov !== undefined && camera.fov>0 && camera.fov <= 180, `bad fov ${camera.fov}` )
        camera.updateProjectionMatrix()

        objectNode.syncUIPosition();
    }

}

// look at a specified LLA point
export class CNodeControllerLookAtLLA extends CNodeController {
    constructor(v) {
        assert(0,"Unexpect usage of CNodeControllerLookAtLLA")
        super(v);
        this.input("lat")
        this.input("lon")
        this.input("alt")
    }

    apply(f, objectNode) {
        const camera = objectNode.camera
        var radius = wgs84.RADIUS

        var to = LLAToEUS(
            this.in.lat.v(f),
            this.in.lon.v(f),
            this.in.alt.v(f),
            radius
        )
        camera.lookAt(to)

        objectNode.syncUIPosition();
    }

}

export function extractFOV(value) {

    // if it's a number then use that directly as the FOV
    if (typeof value === "number") {
        return value;
    } else if (value.misbRow !== undefined) {
        return value.misbRow[MISB.SensorVerticalFieldofView];
    } else if (value.vFOV !== undefined) {
        // it's a track with a vFOV member
        return  value.vFOV;
    } else {
        assert(0, "extractFOV: no vFOV or misbRow member in value, can't find FOV, value = "+value);
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
        assert(value !== undefined, "CNodeControllerFOV: source.v(f) is undefined, id = "+this.id+ " f="+f);

        camera.fov = extractFOV(value);

        assert(camera.fov !== undefined && camera.fov>0 && camera.fov <= 180, `bad fov ${this.fov}` )

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

        // check if there's a pixelZoom effect
        // and if so, flag that to do the doubling
        // so we get the same base resolution
        // first get the look view
        const lookView = NodeMan.get("lookView")
        if (lookView.effectsEnabled && NodeMan.exists("digitalZoomGUI")) {
            NodeMan.get("digitalZoomGUI").value = 100 * zoom;
        } else {
            if (zoom === 2) {
                vFOV /= 2
            }
        }

        const camera = objectNode.camera

        camera.fov = vFOV;
        camera.updateProjectionMatrix()
    }
}

export class CNodeControllerCameraShake extends CNodeController {
    constructor(v) {
        super(v);
        this.input("frequency");
        this.input("decay");
        this.input("xScale");
        this.input("yScale");
        this.input("spring");
        this.optionalInputs(["multiply"]);
        this.recalculate();
    }

    // we want the same offset each frame
    // so we calculate them all whenever the inputs change
    recalculate() {
        this.frames = Sit.frames;
        this.offsets = []
        let offset = new Vector2()
        let velocity = new Vector2()
        // console.log("CNodeControllerCameraShake: recalculate")
        // console.log("frames="+this.frames)
        // console.log("frequency="+this.in.frequency.v0)
        // console.log("decay="+this.in.decay.v0)
        // console.log("xScale="+this.in.xScale.v0)
        // console.log("yScale="+this.in.yScale.v0)
        // console.log("spring="+this.in.spring.v0)

        for (let f = 0; f<this.frames;f++){

            if (Math.random() < this.in.frequency.v(f)) {

                const multiply = this.in.multiply !== undefined ? this.in.multiply.v(f) : 1;

                velocity.x += 1/10000*this.in.xScale.v(f) * multiply * (Math.random() - 0.5);
                velocity.y += 1/10000*this.in.yScale.v(f) * multiply * (Math.random() - 0.5);
            }
            // apply the velocity to the offset
            offset.add(velocity);
//            console.log("offset="+offset.x+","+offset.y)

            // adjsut the velocity based on the offset
            // so it returns to center
            let spring = this.in.spring.v(f);
            velocity.x -= offset.x * spring;
            velocity.y -= offset.y * spring;

            // decay the velocity
            velocity.multiplyScalar((1.0 - this.in.decay.v(f)));
            this.offsets.push(offset.clone())
        }
    }

    apply(f, objectNode) {
        // rotate the camera about the up axis by the Y offset
        // and the right axis by the X offset
        const camera = objectNode.camera;
        if (this.offsets[f] === undefined) {
            console.warn("CNodeControllerCameraShake: offset is undefined, f="+f)
            return;
        }
        const offset = this.offsets[f];
        camera.rotateX(offset.y);
        camera.rotateY(offset.x);
     //   camera.updateMatrix();
     //   camera.updateMatrixWorld();

        // const fwd = camera.getWorldDirection(new Vector3())
        // const up = camera.up.clone()
        // const right = new Vector3().crossVectors(fwd, up)
        //
        // // rotate the fwd vector by the offset
        // fwd.applyAxisAngle(up, offset.x)
        // fwd.applyAxisAngle(right, offset.y)
        // fwd.add(camera.position)
        // camera.lookAt(fwd)



    }
}

// record the current position and heading of the camera
// we insert this controller into the the chain of controllers
// before "noise" controllers, so we cna get the pointing position
// without the noise
// we can then use this to calculate the LOS for example
// JetLOS: {kind: "LOSFromCamera", cameraNode: "lookCamera", useRecorded: true},
//
export class CNodeControllerRecordLOS extends CNodeController {
    constructor(v) {
        super(v);
    }

    apply(f, objectNode) {
        const camera = objectNode.camera
        camera.updateMatrixWorld()
        var position = camera.position.clone()
        var fwd = new Vector3();
        fwd.setFromMatrixColumn(camera.matrixWorld, 2);
        fwd.multiplyScalar(-1)
        // also record the up and right vectors
        var up = new Vector3();
        up.setFromMatrixColumn(camera.matrixWorld, 1);
        var right = new Vector3();
        right.setFromMatrixColumn(camera.matrixWorld, 0);

        objectNode.recordedLOS = {position: position, heading: fwd, up: up, right: right}
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








