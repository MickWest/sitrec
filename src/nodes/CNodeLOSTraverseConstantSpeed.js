// attempt to traverse the LOS at constant speed
import {NodeMan, Sit} from "../Globals";
import {CNode} from "./CNode";
import {abs, angleDifferenceDeg, atan2, degrees, f2m, metersPerSecondFromKnots, radians} from "../utils";
import {Color, Ray, Sphere} from "three";
import {DebugArrowAB, intersectSphere2, V3} from "../threeExt";
import {CNodeCloudData} from "./CNodeCloudData";
import {GlobalScene} from "../LocalFrame";
import {CNodeTrack} from "./CNodeTrack";

export class CNodeLOSTraverseConstantSpeed extends CNodeTrack {
    constructor(v) {
        super(v);
        this.checkInputs(["LOS", "startDist", "speed", "wind"])
        this.optionalInputs(["keyframeSource", "preferredDirection", "slack"])
        this.array = []
        this.recalculate()
        this.useKeyFrames = true;
        this.airSpeed = v.airSpeed ?? false;
        this.recalculate();
    }

    recalculate() {
        this.array = [];

//        console.log("Recalculating, airSpeed = "+ this.airSpeed)

        // We want to be able to use keyframes
        // so we need an array of all the frame numbers of the keyframes
        // this can be all the frames (i.e. every frame is considered a keyframe)
        // or it can be a select few, like if using a line/spline editor
        // if no keyframes are supplied, then we can create a keyframe array of all the frame

        this.frames = this.in.LOS.frames
        let startDistance = this.in.startDist.v(0)

        var position;
        for (var f = 0; f < this.frames; f++) {

            var wind = this.in.wind.v(f)
            // how many feet do we want to move per frame?
            let perFrameMotion = this.in.speed.v(f) / this.fps

            // flag to indicate if the target is moving away from the camera
            // if so then we pick the intersection that's further away from the camera
            // this might not be good when we are orbiting a target
            // because we'll be moving away at some point, and then towards at others.
            let movingAway = perFrameMotion > 0;
            perFrameMotion = abs(perFrameMotion)

            const los = this.in.LOS.v(f)

            var lastPosition

            var result = {}
            if (f === 0) {
                position = los.position.clone();
                let heading = los.heading.clone();
                heading.multiplyScalar(startDistance)
                position.add(heading)

                if (this.in.preferredDirection) {
                    const preferredHeading = this.in.preferredDirection.v(0)
                    let fwd = V3(0, 0, -500);
                    fwd.applyAxisAngle(V3(0,1,0), radians(-preferredHeading))
                    DebugArrowAB("Preferred Heading",position,position.clone().add(fwd),0xffffff,true,GlobalScene)
                }


            } else {
                lastPosition = position.clone()

                let losPosition = los.position.clone();
                let losHeading = los.heading.clone().normalize()
                // we have a line from losPosition, heading vector losHeading
                // and a sphere at position, radius perFrameMotion
                // so find the intersections between the line and the sphere
                let ray = new Ray(losPosition, losHeading)

                // if we don't find it, then we use the closest position.
                var closestPosition = V3()
                ray.closestPointToPoint(lastPosition, closestPosition)

                // these are the radii to test.
                var A = perFrameMotion/8
                var B = perFrameMotion*8 + 1 // +1 in case perFrameMotion is 0, which is other problems

                let target0 = V3() // first intersection
                let target1 = V3() // second intersection

                while (Math.abs(A-B) > 0.00001) {

                    var mid = (A+B) / 2;

                    // old single intersect check
//                let sphere = new Sphere(position.clone().add(wind), perFrameMotion)

                    // binary search
                    let sphere = new Sphere(lastPosition.clone(), mid)


                    if (intersectSphere2(ray, sphere, target0, target1)) {

                       // result.color = new Color(0, 1, 0)

                        if (this.in.preferredDirection !== undefined) {
                            const preferredHeading = this.in.preferredDirection.v(f)
                            const dir0 = target0.clone().sub(position)
                            const dir1 = target1.clone().sub(position)
                            const heading0 = degrees(atan2(dir0.x, -dir0.z))
                            const heading1 = degrees(atan2(dir1.x, -dir1.z))

                            // pick the one that is closest in headint in the x,z plane
                            // to the desired heading
                            if (angleDifferenceDeg(heading0, preferredHeading) < angleDifferenceDeg(heading1, preferredHeading)) {
                                position = target0;
                            } else {
                                position = target1;
                            }


                        } else {
                            // default behaviour is based on if the target is initailly moving away
                            // hit the sphere, pick the near or far point
                            if (movingAway)
                                position = target1;
                            else
                                position = target0;
                        }
                    } else {
                        // no intersection, so we use the same distance as the precious point

                        // this is rather ad-hoc, what do we REALLY want to do here?
                        // I think find the closest point on the next ray

                        // let oldDistance = los.position.distanceTo(position)
                        // position = los.position.clone();
                        // let heading = los.heading.clone();
                        // heading.multiplyScalar(oldDistance)
                        // position.add(heading)

                        position = closestPosition

                        // override color to red for segments that are not constant speed.
                        //result.color = new Color(1, 0, 0)
                        result.bad = true;
                    }

                    var midSpeed
                    if (this.airSpeed)
                        midSpeed = position.clone().sub(lastPosition).sub(wind).length()
                    else
                        midSpeed = position.clone().sub(lastPosition).length()
                    if (midSpeed < perFrameMotion) {
                        // calculated ground speed for mid point is too small, so use the larger half
                        A = mid;
                    } else {
                        B = mid;
                    }

                }

            }

            if (f>0) {
             //   var groundSpeed = position.clone().sub(lastPosition).length()
             //   console.log(groundSpeed - perFrameMotion)
            }

            result.position = position.clone()
            this.array.push(result)
        }

    }

    getValueFrame(f) {
        return this.array[f]
    }

}

