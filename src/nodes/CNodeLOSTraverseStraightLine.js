// attempt to traverse the LOS in a stright line (straight in the horizontal plane, i.e. viewed from above)
// given start distance and a heading track
import {CNode} from "./CNode";
import {metersFromMiles, radians} from "../utils";
import {Color, Plane, Ray} from "three";
import {wgs84} from "../LLA-ECEF-ENU";
import {CNodeTrack} from "./CNodeTrack";
import {assert} from "../assert.js";
import {V3} from "../threeUtils";

export class CNodeLOSTraverseStraightLine extends CNodeTrack {
    constructor(v) {
        super(v);
        this.requireInputs(["LOS", "startDist", "lineHeading"])
        this.array = []
        this.recalculate()
    }

    recalculate() {
        this.array = [];
        this.frames = this.in.LOS.frames
        let startDistance = this.in.startDist.v(0)
        var position, startPosition;
        var oldDistance;
//        const radius = metersFromMiles(this.in.radius.v0)
        const radius = wgs84.RADIUS;
        for (var f = 0; f < this.frames; f++) {

            const los = this.in.LOS.v(f)

            var result = {}
            if (f === 0) {
                // First frame, we just take the start Distance
                position = los.position.clone();
                let heading = los.heading.clone();
                heading.multiplyScalar(startDistance)
                position.add(heading)
                startPosition = position.clone();
            } else {
                let losPosition = los.position.clone();
                let losHeading = los.heading.clone()

                // STRAIGHT LINE
                // given our current position, calculate a frame
                // which this heading, and local up
                const lineHeading = this.in.lineHeading.v(f);
                let fwd = V3(0, 0, -1)
                const upAxis = V3(0, 1, 0)
                // test if lineHeading is a number
                // if not, it's a vector
                if (typeof lineHeading !== "number") {
                    fwd = lineHeading;
                } else {
                    // if it's a number, it's a heading
                    // and we need to rotate the fwd vector

                    assert(!(isNaN(lineHeading)), "lineHeadingNAN");

                    if (isNaN(lineHeading) && f < 5) {
                        console.warn("lineHeading is NaN in CNodeLOSTraverseStraightLine - probably a bug")
                    }
                    fwd.applyAxisAngle(upAxis, -radians(lineHeading))
                }

                //
                var rightAxis = V3()
                rightAxis.crossVectors(upAxis, fwd)  // right is calculated as being at right angles to up and fwd

                // does not seem like this would do anything
                // if we started with orthogonal
                fwd.crossVectors(rightAxis, upAxis) // then fwd is a right angles to right and up

                // so we could use rightAxis as the normal of a plane
                // and intersect the ray with it.
                // need to find the distance to the origin from the plane
                // the point position is in the plane
                // The dot product of the rightAxis with the position gives the distance to the plane from the origin
                // assuming "position" is a point in the the plane, and rightAxis is the normal of the plane

                // Note, this Plane is CONSTANT if we use startposition as the point in te lane
                // and theoretically constant if we pick "position"
                // as that should be another point in the plane
                // but is seems not
                var planeDistance = startPosition.dot(rightAxis)
//                var planeDistance = position.dot(rightAxis)

                rightAxis.negate()   // always?
                let plane = new Plane(rightAxis, planeDistance)

                // The collision ray is the LOS
                // we have a line from losPosition, heading vector losHeading
                //
                let ray = new Ray(losPosition, losHeading)

                let target0 = V3() // there's only one possible intersection of a line and a plane (unless parallel/coplanar)
                let lastPosition = position.clone()
                if (ray.intersectPlane(plane, target0)) {
                    position = target0;

                } else {
                    // no intersection, so we use the same distance along the new LOS as the previous point

//                    let oldDistance = los.position.distanceTo(position)
                    position = los.position.clone();
                    let heading = los.heading.clone();
                    heading.multiplyScalar(oldDistance)
                    position.add(heading)

                    // override color to red for segments that are not in a straight line
                    result.color = new Color(1, 0, 0)
                }

            }
            oldDistance = los.position.distanceTo(position)
            result.position = position
            this.array.push(result)
        }

    }

    getValueFrame(f) {
        return this.array[f]
    }

}


export class CNodeLOSTraverseStraightLineFixed extends CNodeTrack {
    constructor(v) {
        super(v);
        this.requireInputs(["LOS", "speed", "startDist", "lineHeading", "radius"])
        this.array = []
        this.recalculate()
    }

    recalculate() {
        this.array = [];
        this.frames = this.in.LOS.frames
        let startDistance = this.in.startDist.v(0)
        var position, startPosition;
        var oldDistance;
        let perFrameMotion = this.in.speed.v(f) / this.fps
        const radius = metersFromMiles(this.in.radius.v0)
        for (var f = 0; f < this.frames; f++) {

            const los = this.in.LOS.v(f)

            var result = {}
            if (f === 0) {
                // First frame, we just take the start Distance
                position = los.position.clone();
                let heading = los.heading.clone();
                heading.multiplyScalar(startDistance)
                position.add(heading)
                startPosition = position.clone();
            } else {
                // let losPosition = los.position.clone();
                // let losHeading = los.heading.clone()

                // STRAIGHT LINE
                // given our current position, calculate a frame
                // which this heading, and local up
                const lineHeading = radians(this.in.lineHeading.v(f))
                var fwd = V3(0, 0, -1)

                //           var upAxis = getLocalUpVector(position, radius)
                var upAxis = V3(0, 1, 0)

                fwd.applyAxisAngle(upAxis, -lineHeading)

                position.add(fwd.multiplyScalar(perFrameMotion))

            }
            oldDistance = los.position.distanceTo(position)
            result.position = position.clone()
            this.array.push(result)
        }

    }

    getValueFrame(f) {
        return this.array[f]
    }

}



