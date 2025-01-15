import {CNodeController} from "./CNodeController";
import {guiMenus, NodeMan, Sit} from "../Globals";
import {par} from "../par";
import {trackAcceleration, trackDirection, trackVelocity} from "../trackUtils";
import {V3} from "../threeUtils";
import {Matrix4} from "three";
import {radians} from "../utils";
import {getLocalUpVector} from "../SphericalMath";
import {CNodeSmoothedPositionTrack} from "./CNodeSmoothedPositionTrack";
import {getGlareAngleFromFrame} from "../JetUtils";


export class CNodeControllerObjectTilt extends CNodeController {
    constructor(v) {
        super(v);

        this.input("track")
        this.optionalInputs(["wind", "airTrack"])
        this.tiltType = v.tiltType ?? "none"

        // the input track is likely not smooth enought, so create a smoothed version
        this.smoothedTrack = new CNodeSmoothedPositionTrack({
            id: this.id + "Smoothed",
            source: this.in.track,
            method: "sliding",
            window: 200}
        )

        // with a large smoothing sliding window, the smoothed track will be offset from the original track
        // when going around a corner.
        // so we use the original track for the position, and the smoothed track for the heading


        // Debug display
        // new CNodeDisplayTrack({
        //     id: this.id + "Disp",
        //     track: this.id + "Smoothed",
        //     color: "#0030FF",
        //     width: 1,
        //     ignoreAB: true,
        //     layers: LAYER.MASK_HELPERS,
        //     skipGUI: true,
        //
        // })



        // This is specific to the flying saucer
        if (this.tiltType !== "banking" && !v.noMenu) {
            guiMenus.physics.add(this,"tiltType",{
                banking:"banking",
                frontPointing:"frontPointing",
                frontPointingAir:"frontPointingAir",
                axialPush:"axialPush",
                axialPull:"axialPull",
                axialPushZeroG:"axialPushZeroG",
                axialPullZeroG:"axialPullZeroG",
                bottomPointing:"bottomPointing",
                bottomPointingAir:"bottomPointingAir",
                glareAngle:"glareAngle",
            }).name("Object Orientation type")
                .listen(()=>{par.renderOne = true})
        }

        // optional input for the angle of attack
        this.input("angleOfAttack",true);

    }

    dispose() {
        super.dispose()
        NodeMan.unlinkDisposeRemove(this.smoothedTrack)
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

    apply(f, objectNode ) {

        const object = objectNode._object;

        if (object != undefined) {
            if (f >= 0) {

                var next = this.in.track.p(f + 1)

                // if we have a wind vector then subtract that to get the nose heading
                if (this.in.wind !== undefined) {
                    next.sub(this.in.wind.v(f))
                }

                // for "lookAt" to work, we need to set the up vector
                // to account for the curvature of the Earth
                // it defaults to 0,1,0, which is only correct at the origin
                object.up = getLocalUpVector(object.position)

                object.lookAt(next)

                // calculate the heading on the SMOOTHED track
                var from = this.in.track.p(f)
                var to = this.in.track.p(f + 1)
                var fwdAir = to.sub(from);

                // but we need to use the actual track for the position
                // i.e. pos and next
                var pos = this.in.track.p(f); //
                var next = pos.clone().add(fwdAir)


                // var pos = this.smoothedTrack.p(f);
                // var next = this.smoothedTrack.p(f + 1)

                let tiltType = this.tiltType.toLowerCase()

                // if we don't have an air track, then we can't use the air tilt types
                // so we just use the non-air versions
                if (this.in.airTrack === undefined) {
                    if (tiltType === "frontpointingair")
                        tiltType = "frontpointing";
                    if (tiltType === "bottompointingair")
                        tiltType = "bottompointing";
                }

                switch (tiltType) {
                    case "banking":
                        // with banking, we calculate the angular velocity
                        // from the track, and then use that to rotate the model
                        // around the track direction

                        const sampleDuration = 1;
                        // first get the angular velocity
                        const velocityA = trackDirection(this.smoothedTrack, f - sampleDuration * Sit.fps / 2, 2)
                        const velocityB = trackDirection(this.smoothedTrack, f + sampleDuration * Sit.fps / 2, 3)
                        const velocity = trackVelocity(this.smoothedTrack, f)
                        const fwd = velocity.clone().normalize()
                        let angularVelocity = velocityA.angleTo(velocityB) / sampleDuration;  // radians per second

                        // is it left or right turn? If the cross product of the two velocities is up, then it's a right turn
                        const cross = V3().crossVectors(velocityA, velocityB)
                        const right = cross.y > 0
                        if (right)
                            angularVelocity = -angularVelocity


                        const speed = velocity.length() * Sit.fps; // meters per second
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
                        object.rotateOnWorldAxis(fwd, bankAngle);

                        if (this.in.angleOfAttack !== undefined) {
                            const aoa = this.in.angleOfAttack.v(f)
                            const aoaRad = radians(aoa)
                            const up = getLocalUpVector(object.position)
                            const left = up.cross(fwd)
                            object.rotateOnWorldAxis(left, -aoaRad)
                        }

                        object.updateMatrix()
                        object.updateMatrixWorld()


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

                        // object.quaternion.identity()
                        object.updateMatrix()
                        object.updateMatrixWorld()

                        var accelerationDir = trackAcceleration(this.smoothedTrack, f)

                        if (this.tiltType === "axialPull")
                            accelerationDir.negate()

                        if (this.tiltType === "axialPull" || this.tiltType === "axialPush") {
                            const gravity = V3(0, -9.81 / this.fps / this.fps, 0) // 9.81 is per sercond, so divide by fps^2 to get per frame
                            accelerationDir.sub(gravity) // add in a force opposite gravity
                        }

                        this.pointBottomAt(object, pos, pos.clone().add(accelerationDir))


                        break;
                    case "bottompointing":
                        this.pointBottomAt(object, pos, next)
                        break;

                    case "bottompointingair":
                        var from = this.in.airTrack.p(f)
                        var to = this.in.airTrack.p(f + 1)
                        var fwdAir = to.sub(from);
                        next = pos.clone().add(fwdAir)
                        this.pointBottomAt(object, pos, next)
                        break;

                    case "frontpointing":
                        object.lookAt(next)
                        object.updateMatrix()
                        object.updateMatrixWorld()
                        break;

                    case "frontpointingair":

                        var from = this.in.airTrack.p(f)
                        var to = this.in.airTrack.p(f + 1)
                        var fwdAir = to.sub(from);
                        next = pos.clone().add(fwdAir)


                        object.lookAt(next)
                        object.updateMatrix()
                        object.updateMatrixWorld()
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
                            object.quaternion.setFromRotationMatrix(mg);
                            object.updateMatrix()
                            object.updateMatrixWorld()
                        } else {
                            console.warn("jetTrack not found for glare angle in CNodeDisplayTargetModel.js")
                        }
                        break;

                }

            }
        }
    }

    pointBottomAt(object, pos, next) {

        // we just use the point at function, and then change axis order to y,z,x
        object.lookAt(next)
        object.updateMatrix()
        object.updateMatrixWorld()

        // debug only
        var direction = next.clone().sub(pos)
        direction.normalize()
        direction.multiplyScalar(300)
        //      DebugArrow("pointing", direction, pos.clone(), 300, "#ff00ff")


        var _x = V3()
        var _y = V3()
        var _z = V3()
        object.matrix.extractBasis(_x, _y, _z)
        _x.normalize()
        _y.normalize()
        _z.normalize()
        //     DebugArrow("saucer X", _x, pos.clone(), 300, "#ff0000")
        //     DebugArrow("saucer Y", _y, pos.clone(), 300, "#00FF00")
        //    DebugArrow("saucer Z", _z, pos.clone(), 300, "#0000FF")


        var m = new Matrix4()
        m.makeBasis(_y, _z, _x)    // z goes into the y slot


        object.quaternion.setFromRotationMatrix(m);

        // the local matrix is composed from position, quaternion, and scale.
        // the world matrix is the parent's world matrix multipled by this local matrix

        // not sure if this finalization is needed.
        object.updateMatrix()
        object.updateMatrixWorld()
    }

}