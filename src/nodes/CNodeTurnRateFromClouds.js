
import {NodeMan} from "../Globals";
import {assert, degrees, metersFromMiles, metersPerSecondFromKnots, radians} from "../utils";
import {calcHorizonPoint, getLocalUpVector} from "../SphericalMath";
import {CNodeArray, CNodeEmptyArray} from "./CNodeArray";
import {V3} from "../threeExt";

/*
    cloudAlt = altitude of the top of the cloud layer above the ground
    cloudSpeed = REFERENCE track of angular speed of the clouds. This is what we are trying to duplicate
    az = az track of the ATFLIR pod
    speed = true airspeed of the jet with the ATFLIR pod
    altitude = track of the jet altitude (i.e. 25,000 for Gimbal)
    radius = earth radius, adjusted for refraction

    So this combines aspect of both CNodeJetTrack and CNodeLOSHorizonTrack
    we are going to progressively calculate the new jet position using the last turn rate as in CNodeJetTrack
    then see what the angular speed of the clouds is
    then subtract this from the desired angular speed
    and we get a new turn rate. This is stored in the per-frame array
    and we repeat

 */
export class CNodeTurnRateFromClouds extends CNodeEmptyArray {
    constructor(v) {
        super(v);
        this.startTurnRate = v.startTurnRate ?? 0
        // cloud speed is the desired speed of the clouds
        this.checkInputs(["cloudAlt","cloudSpeed","az", "speed", "altitude", "radius"])
        this.frames = this.in.az.frames
        this.fps = this.in.az.fps
        assert(this.frames >0, "Need frames in az input to CNodeTurnRateFromClouds")
        this.recalculate()
    }

    // like the code in CNodeLOSHorizonTrack
    // we calculate the angular speed at the horizon given the jetTack
    // then see what angular speed we need
    // and put the difference (the needed turn rate) in the array
    recalculate() {
        this.array = []
        var jetHeading = 0
        var radius = metersFromMiles(this.in.radius.v0)
        var jetPos = V3(0,this.in.altitude.v0,0)   // this is above the EUS (East, Up, South) origin
        var jetFwd = V3(0,0,-1) // start out pointing north (Z = -1 in EUS

        var turnRate = this.startTurnRate // initial value of turn rate - could start with something better

        for (var f=0;f<this.frames-1;f++) {

            /////////////////////////////////////////////////////////////////////
            // This is essentially from CNodeJetTrack

            const lastPosition = jetPos.clone()
            const lastFwd = jetFwd.clone()
            // move the jet along the fwd vector
            var jetSpeed = metersPerSecondFromKnots(this.in.speed.getValueFrame(f))  // 351 from CAS of 241 (239-242)
            jetPos.add(jetFwd.clone().multiplyScalar(jetSpeed / this.fps)) // one frame

            // rotate around local up (opposite of gravity)
            var upAxis = getLocalUpVector(jetPos, radius)
            jetFwd.applyAxisAngle(upAxis, -radians(turnRate / this.fps))
            var rightAxis = V3()
            rightAxis.crossVectors(upAxis, jetFwd)  // right is calculated as being at right angles to up and fwd
            jetFwd.crossVectors(rightAxis,upAxis) // then fwd is a right angles to right and up

            ///////////////////////////////////////////////////////////////////////
            // Now we have the old and new positions for this frame
            // so need to calculate the adjustment to the turn rate
            const cloudAlt = this.in.cloudAlt.v(f) // unlikely to change, but what the heck!

            /*
            let horizon1 = calcHorizonPoint(lastPosition, lastFwd, cloudAlt, radius)
            horizon1.sub(lastPosition).normalize()
            let horizon2 = calcHorizonPoint(jetPos, jetFwd, cloudAlt, radius)
            horizon2.sub(jetPos).normalize()
//            const angleChange = degrees(Math.acos(horizon1.dot(horizon2)))
            let angle1 = Math.atan2(horizon1.z, horizon1.x)
            let angle2 = Math.atan2(horizon2.z, horizon2.x)
            let angleChange = (angle2-angle1);
            */

            // the change in angle we are looking for is how much a point on the horizon moves
            // when we move to the next position
            // TODO - also in graph of cloud speed?


            let LOS = lastFwd.clone()
        //    var upAxis = V3(0, 1, 0)
            var upAxis = getLocalUpVector(lastPosition, radius) // not a real difference

            LOS.applyAxisAngle(upAxis, radians(-this.in.az.v(f)))

            let horizon1 = calcHorizonPoint(lastPosition, LOS, cloudAlt, radius)
            let from1 = horizon1.clone().sub(lastPosition).normalize()
            let from2 = horizon1.clone().sub(jetPos).normalize()
            let angle1 = Math.atan2(from1.z, from1.x)
            let angle2 = Math.atan2(from2.z, from2.x)
            let angleChange = degrees((angle2-angle1));

            angleChange -= this.in.az.getValueFrame(f+1) - this.in.az.getValueFrame(f)
            turnRate = angleChange * this.fps
            turnRate += this.in.cloudSpeed.v(f)


            ///////////////////////////////////////////////////////////
            // finally store and add that turn rate
            this.array.push(turnRate)
        }
        // as we don't predict from the last frame, just duplicate the final turn rate
        this.array.push(turnRate)

    }

}

