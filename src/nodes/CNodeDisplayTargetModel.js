// fiddly temporary class to handle the jet target
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {CNode3DTarget} from "./CNode3DTarget";
import {FileManager, gui, NodeMan, Sit} from "../Globals";
import {V3} from "../threeExt";

import {Matrix4} from "three";

import {trackAcceleration, trackDirection, trackVelocity} from "./CNode";
import {degrees, radians, tan} from "../utils";
import {getGlareAngleFromFrame} from "../JetStuff";
import {par} from "../par";


// By default it will create a model from the file tagged "TargetObjectFile"
// or you can passa "TargetObjectFile" member in the input structure (v, here)
export class CNodeDisplayTargetModel extends CNode3DTarget {
    constructor(v) {
        super(v);

        this.input("track")
        this.optionalInputs(["wind", "airTrack"])

        this.tiltType = v.tiltType ?? "none"

        const data = FileManager.get(v.TargetObjectFile ?? "TargetObjectFile")

        const loader = new GLTFLoader()
          loader.parse(data, "", (gltf2) => {
            this.model = gltf2.scene //.getObjectByName('FA-18F')
            this.model.scale.setScalar(1);
            this.model.visible = true
            this.group.add(this.model)
        })


        // This ia specific to the flying saucer
        if (this.tiltType !== "banking") {
            gui.add(this,"tiltType",{
                axialPush:"axialPush",
                axialPull:"axialPull",
                axialPushZeroG:"axialPushZeroG",
                axialPullZeroG:"axialPullZeroG",
                frontPointing:"frontPointing",
                frontPointingAir:"frontPointingAir",
                bottomPointing:"bottomPointing",
                bottomPointingAir:"bottomPointingAir",
                glareAngle:"glareAngle",
            }).name("saucer tilt type")
                .listen(()=>{par.renderOne = true})
        }

    }

    modSerialize() {
        return {
            ...super.modSerialize(),
            tiltType: this.tiltType,
        }
    }

    modDeserialize(v) {
        super.modDeserialize(v)
        this.tiltType = v.tiltType
    }

    update(f) {
        super.update(f)
        if (this.model != undefined) {
            if (f >= 0) {

                var next = this.in.track.p(f + 1)

                // if we have a wind vector then subtract that to get the nose heading
                if (this.in.wind !== undefined) {
                    next.sub(this.in.wind.v(f))
                }

                this.model.lookAt(next)

                var pos = this.in.track.p(f);
                var next = this.in.track.p(f + 1)

                switch (this.tiltType.toLowerCase()) {
                    case "banking":
                        // with banking, we calculate the angular velocity
                        // from the track, and then use that to rotate the model
                        // around the track direction

                        const sampleDuration = 1;
                        // first get the
                        const velocityA = trackDirection(this.in.track, f-sampleDuration*Sit.fps/2)
                        const velocityB = trackDirection(this.in.track, f+sampleDuration*Sit.fps/2)
                        const velocity = trackVelocity(this.in.track, f)
                        const fwd = velocity.clone().normalize()
                        let angularVelocity = velocityA.angleTo(velocityB) / sampleDuration;  // radians per second

                        // is it left or right turn? If the cross product of the two velocities is up, then it's a right turn
                        const cross = V3().crossVectors(velocityA, velocityB)
                        const right = cross.y > 0
                        if (right)
                            angularVelocity = -angularVelocity


                        const speed = velocity.length()*Sit.fps; // meters per second
                        // convert angular velocity to bank angle
                    // function turnRate(bankDegrees, speedMPS) {
                    //     var g = 9.77468   // local gravity at 36°latitude, 25000 feet https://www.sensorsone.com/local-gravity-calculator/
                    //     var rate = (g * tan(radians(bankDegrees))) / speedMPS
                    //     return degrees(rate);
                    // }
                        // rate = g * tan(bank) / speed
                        // so bank = atan(rate * speed / g)

                        const bankAngle = Math.atan(angularVelocity * speed / 9.77468)

                        // and rotate the model about fwd by the bank angle
                        const m = new Matrix4()
                        m.makeRotationAxis(fwd, bankAngle)

                        // // apply the rotation to the model's existing orientation
                        // this.model.quaternion.multiply(m)
                        // this.model.updateMatrix()
                        // this.model.updateMatrixWorld()

                        this.model.rotateOnWorldAxis(fwd, bankAngle);
                        this.model.updateMatrix()
                        this.model.updateMatrixWorld()


                        break;

                    case "axialpush":
                    case "axialpull":
                    case "axialpullzerog":
                    case "axialpushzerog":
                        // In Lazarian thrust, the vertical axis is aligned in the net force vector,
                        // including gravity.
                        // so a saucer tilts in the direction it is going in
                        // like a helicopter

                        if (f > this.frames - 4)
                            f = this.frames - 4;

                       // this.model.quaternion.identity()
                        this.model.updateMatrix()
                        this.model.updateMatrixWorld()

                        var accelerationDir = trackAcceleration(this.in.track, f)

                        if (this.tiltType === "axialPull")
                            accelerationDir.negate()

                        if (this.tiltType === "axialPull" || this.tiltType === "axialPush") {
                            const gravity = V3(0, -9.81 / this.fps / this.fps, 0) // 9.81 is per sercond, so divide by fps^2 to get per frame
                            accelerationDir.sub(gravity) // add in a force opposite gravity
                        }

                        this.pointBottomAt(pos, pos.clone().add(accelerationDir))


                        break;
                    case "bottompointing":
                        this.pointBottomAt(pos, next)
                        break;

                    case "bottompointingair":
                        var from = this.in.airTrack.p(f)
                        var to = this.in.airTrack.p(f + 1)
                        var fwdAir = to.sub(from);
                        next = pos.clone().add(fwdAir)
                        this.pointBottomAt(pos, next)
                        break;

                    case "frontpointing":
                        this.model.lookAt(next)
                        this.model.updateMatrix()
                        this.model.updateMatrixWorld()
                        break;

                    case "frontpointingair":

                        var from = this.in.airTrack.p(f)
                        var to = this.in.airTrack.p(f + 1)
                        var fwdAir = to.sub(from);
                        next = pos.clone().add(fwdAir)


                        this.model.lookAt(next)
                        this.model.updateMatrix()
                        this.model.updateMatrixWorld()
                        break;

                    case "glareangle":
                        // so we just need to rotate it around the line of sight by the glare angle
                        var glare = radians(getGlareAngleFromFrame(f) + 90);
                        var mg = new Matrix4()
                        // get LOS from the camera to the target
                        var to = this.in.airTrack.p(f)

                        if (NodeMan.exists("jetTrack")) {

                            var from = NodeMan.get("jetTrack").p(f)
                            var fwdLOS = to.clone().sub(from).normalize()
                            // make mg a rotation matrix that rotates around the line of sight
                            mg.makeRotationAxis(fwdLOS, glare)

                            // and appy it to the model
                            this.model.quaternion.setFromRotationMatrix(mg);
                            this.model.updateMatrix()
                            this.model.updateMatrixWorld()
                        } else {
                            console.warn("jetTrack not found for glare angle in CNodeDisplayTargetModel.js")
                        }
                        break;

                }

            }
        }
        this.recalculate() // every frame so scale is correct after the jet loads

    }


    pointBottomAt(pos, next)
    {

        // we just use the point at function, and then change axis order to y,z,x
        this.model.lookAt(next)
        this.model.updateMatrix()
        this.model.updateMatrixWorld()

        // debug only
        var direction = next.clone().sub(pos)
        direction.normalize()
        direction.multiplyScalar(300)
  //      DebugArrow("pointing", direction, pos.clone(), 300, "#ff00ff")


        var _x = V3()
        var _y = V3()
        var _z = V3()
        this.model.matrix.extractBasis(_x, _y, _z)
        _x.normalize()
        _y.normalize()
        _z.normalize()
   //     DebugArrow("saucer X", _x, pos.clone(), 300, "#ff0000")
   //     DebugArrow("saucer Y", _y, pos.clone(), 300, "#00FF00")
   //    DebugArrow("saucer Z", _z, pos.clone(), 300, "#0000FF")


        var m = new Matrix4()
//      m.makeBasis(_x, _y, _z)
        m.makeBasis(_y, _z, _x)    // z goes into the y slot


        this.model.quaternion.setFromRotationMatrix(m);

        // the local matrix is composed from position, quaternion, and scale.
        // the world matrix is the parent's world matrix multipled by this local matrix

        // not sure if this finalization is needed.
        this.model.updateMatrix()
        this.model.updateMatrixWorld()
    }


    recalculate() {
        super.recalculate()
        this.propagateLayerMask()

    }

}

