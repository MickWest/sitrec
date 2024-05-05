import {assert, degrees, metersFromMiles, metersPerSecondFromKnots, radians} from "../utils";
import {getLocalNorthVector, getLocalUpVector} from "../SphericalMath";
import {NodeMan, Sit, Units} from "../Globals";
import {CNodeEmptyArray} from "./CNodeArray";
import {V3} from "../threeExt";
import {CNode} from "./CNode";
import {CNodeTrack} from "./CNodeTrack";
import {LLAToEUS} from "../LLA-ECEF-ENU";

export class CNodeJetTrack extends CNodeTrack {
    constructor(v) {
        if (v.frames === undefined) {
            v.frames = Sit.frames;
            super(v);
            this.useSitFrames = true;
        } else {
            super(v);
        }
        this.checkInputs(["speed", "altitude", "radius", "turnRate", "wind", "heading", "origin"])
        this.isNumber = false;
        this.recalculate()
    }

    recalculate() {
        this.array = []
        var jetHeading = this.in.heading.getHeading()
        var radius = metersFromMiles(this.in.radius.v0)

        var jetPos = this.in.origin.p(0)

        //  new code, jet is at jetOrigin, an arbitrary point in EUS
        var jetFwd = getLocalNorthVector(jetPos)
        var jetUp = getLocalUpVector(jetPos)

        jetFwd.applyAxisAngle(jetUp, radians(-jetHeading))

        for (var f = 0; f < this.frames; f++) {
            // first store the current position
            var trackPoint = {
                position: jetPos.clone(),
                heading: jetHeading,
                fwd: jetFwd.clone(),
            }
            this.array.push(trackPoint)

            // move the jet along the fwd vector
            var jetSpeed = metersPerSecondFromKnots(this.in.speed.getValueFrame(f))  // 351 from CAS of 241 (239-242)
            jetPos.add(jetFwd.clone().multiplyScalar(jetSpeed / Sit.fps)) // one frame

            // add in the wind vector, uses the local North and Up vectors for reference
            this.in.wind.setPosition(jetPos)
            jetPos.add(this.in.wind.v(f))

            // get the angle we rotate around the up axis this frame
            var turnRate = this.in.turnRate.getValueFrame(f)

            // rotate around local up (opposite of gravity)
            var upAxis = getLocalUpVector(jetPos, radius)
            jetFwd.applyAxisAngle(upAxis, -radians(turnRate / Sit.fps))

            // x = cross(y,z)
            // y = cross(z,x)
            // z = cross(x,y)

            // normalize fwd is at right angles to up
            var rightAxis = V3()
            rightAxis.crossVectors(upAxis, jetFwd)  // right is calculated as being at right angles to up and fwd
            jetFwd.crossVectors(rightAxis, upAxis) // then fwd is a right angles to right and up

            jetHeading += turnRate / Sit.fps

        }
        assert(this.frames == this.array.length, "frames length mismatch");
    }
}




// horizontal speed in knots
export class CNodeTrackSpeed extends CNode {
    constructor(v) {
        super(v);
        this.input("source")
        this.horizontal = v.horizontal??false;
        this.frames = this.in.source.frames
    }

    getValueFrame(f) {
        if (f === 0) f = 1;
        let move = this.in.source.p(f)
        move.sub(this.in.source.p(f - 1))
        if (this.horizontal)
            move.y = 0;
        return (move.length() * this.in.source.fps * Units.m2Speed)
    }

}

// angle of the track on screen in degrees
// "on screen" means the angle between the track in the plane defined by
// the camera's forward vector and the track's current position
// and the camera's left vector
// assumes the camera is looking at the target track
export class CNodeTrackScreenAngle extends CNode {
    constructor(v) {
        v.targetTrack ??= "targetTrack";
        v.cameraTrack ??= "cameraTrack";
        super(v);
        this.input("targetTrack")
        this.input("cameraTrack")
        this.frames = this.in.targetTrack.frames
    }

    getValueFrame(f) {
        if (f === 0) f = 1;
        let pos = this.in.targetTrack.p(f)
        let vel = pos.clone().sub(this.in.targetTrack.p(f - 1))
        let cameraPos = this.in.cameraTrack.p(f)

        let cameraFwd = pos.clone().sub(cameraPos)
        cameraFwd.normalize() // this is the normal of the view plane
        let cameraUp = getLocalUpVector(cameraPos)
        let cameraLeft = V3().crossVectors(cameraUp, cameraFwd)
        // project vel onto the plane defined by the camera's forward vector
        vel.projectOnPlane(cameraFwd);

        // and get angle between the projected vel vector and the camera's up
        let angle = degrees(vel.angleTo(cameraLeft))
        return angle
    }

}


