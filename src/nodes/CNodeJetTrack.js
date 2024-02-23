import {assert, degrees, metersFromMiles, metersPerSecondFromKnots, radians} from "../utils";
import {getLocalUpVector} from "../SphericalMath";
import {NodeMan, Sit, Units} from "../Globals";
import {CNodeEmptyArray} from "./CNodeArray";
import {V3} from "../threeExt";
import {CNode} from "./CNode";
import {CNodeTrack} from "./CNodeTrack";
import {LLAToEUS} from "../LLA-ECEF-ENU";

export class CNodeJetTrack extends CNodeTrack {
    constructor(v) {
        super(v);
        this.checkInputs(["speed", "altitude", "radius", "turnRate", "wind", "heading"])
        this.isNumber = false;
        this.recalculate()
    }

    recalculate() {
        this.array = []
        var jetHeading = this.in.heading.getHeading()
        var radius = metersFromMiles(this.in.radius.v0)
        // note this is assuming constant altitude!!


        if (Sit.jetLat === undefined) {
            // TODO: Make Sit.jetOrigin be a node, so it fits into everything better

            assert (Sit.jetOrigin.x === 0 && Sit.jetOrigin.z === 0,
                "non-zero jet Origin" + Sit.jetOrigin.x+","+Sit.jetOrigin.z +"with no Sit.jetLat" )

            Sit.jetOrigin.y = this.in.altitude.v0;  // for now we update it here
        } else {
            const jetAltitude = this.in.altitude.v0;
            var enu = LLAToEUS(Sit.jetLat, Sit.jetLon, jetAltitude)
            Sit.jetOrigin.copy(enu)

        }


        var jetPos = Sit.jetOrigin.clone();


        var jetFwd = V3(0, 0, -1) // start out pointing north (Z = -1 in EUS
        jetFwd.applyAxisAngle(V3(0,1,0), radians(-jetHeading))

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

            // add in the wind vector. This
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


