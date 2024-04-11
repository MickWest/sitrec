import {NodeMan} from "../Globals";
import {CNode} from "./CNode";
import {assert, metersFromMiles, radians, vdump} from "../utils";
import {getLocalEastVector, getLocalNorthVector, getLocalUpVector} from "../SphericalMath";
import {Matrix4} from "../../three.js/build/three.module";
import {CNodeCloudData} from "./CNodeCloudData";
import {DebugArrow, DebugAxes, DebugMatrixAxes, V3} from "../threeExt";
import {Vector3} from "three";
import {CNodeEmptyArray} from "./CNodeArray";

// CNodeLOSTrackAzEl calculates lines of sight from jetTrack, az and el tracks
// LOS track consists of {position:, heading:) where heading is a unit vector
export class CNodeLOSTrackAzEl extends CNode {
    constructor(v) {
        super(v);
        assert(this.in.jetTrack !== undefined)
        assert(this.in.az !== undefined)
        assert(this.in.el !== undefined)
        this.recalculate()
    }

    recalculate() {
        this.array = []
        this.frames = this.in.jetTrack.frames
        for (var f = 0; f < this.in.jetTrack.frames; f++) {
            var A = this.in.jetTrack.p(f)

            var fwd = V3(0, 0, -1)

            // first get the fwd vector rotated by Az and El in the frame of the jet
            var rightAxis = V3(1, 0, 0)
            fwd.applyAxisAngle(rightAxis, radians(this.in.el.v(f)))

            var upAxis = V3(0, 1, 0)  // rotate around 0,1,0, i.e. up at the origin
            //fwd.applyAxisAngle(upAxis, radians(-this.in.az.v(f) - this.in.jetTrack.getValue(f).heading))

            // we are not using the heading any more, we use the local frame
            // which we can calculate from the jetFwd and the the local up
            fwd.applyAxisAngle(upAxis, radians(-this.in.az.v(f)))

            var _x = V3()
            var _y = getLocalUpVector(A, metersFromMiles(this.in.jetTrack.inputs.radius.v0))
            var _z = this.in.jetTrack.v(f).fwd.clone().negate()

            _x.crossVectors(_y, _z)
            _z.crossVectors(_x, _y)
            var m = new Matrix4()
            m.makeBasis(_x, _y, _z)

            // so m shoiuld be the transform matrix for the frame of reference of the jet
            // (maybe only need a 3x3 matix, but we pnly have makeBasis for 4)

            // so we take the local vector calculated from El and Az, and apply the frame of the jet to it
            // this will rotate it and tilt down relative to local gravity
            fwd.applyMatrix4(m)


            //   console.log("LOSTrackAzEl fwd = "+fwd.x+","+fwd.y+","+fwd.z )


            this.array.push({position: A, heading: fwd})
        }
    }

    getValueFrame(f) {
        return this.array[f]
    }

}

// For this we will need the Platform position and orientation, and the sensor orientation
// we return a track that has position (of the platform) and the absolute heading of the sensor
// Similar to CNodeLOSTrackAzEl (which only used Az and El
//
// the camera track (position) will be passed in, but comes from
//     SensorLatitude: 13,
//     SensorLongitude: 14,
//     SensorTrueAltitude: 15,
//
// the platform orientation is from:
//     PlatformHeadingAngle: 5,
//     PlatformPitchAngle: 6,
//     PlatformRollAngle: 7,
//
// the sensor (gimballed camera) orientation relative to the platfrom is:
//     SensorRelativeAzimuthAngle: 18,
//     SensorRelativeElevationAngle: 19,
//     SensorRelativeRollAngle: 20,
//
// A CNodeLOSTrackMISB will reuting per-frame data like:
// {position: Vector3, heading: Vector3, matrix: Matrix4}
// where the matrix is the orientation of the sensor
// and position heading are the usual LOS values
export class CNodeLOSTrackMISB extends CNodeEmptyArray{

    constructor(v) {
        super(v);
        this.input("cameraTrack")
        this.input("platformHeading")
        this.input("platformPitch")
        this.input("platformRoll")
        this.input("sensorAz")
        this.input("sensorEl")
        this.input("sensorRoll")
        this.recalculate();
    }

    recalculate() {
        this.array = []
        this.frames = this.in.cameraTrack.frames
        for (var f = 0; f < this.frames; f++) {
            var A = this.in.cameraTrack.p(f)

            var platformHeading = this.in.platformHeading.v(f)
            var platformPitch = this.in.platformPitch.v(f)
            var platformRoll = this.in.platformRoll.v(f)
            var sensorAz = this.in.sensorAz.v(f)
            var sensorEl = this.in.sensorEl.v(f)
            var sensorRoll = this.in.sensorRoll.v(f)

            // get the basis vectors for the platform
            var right = getLocalEastVector(A)       //
            var fwd = getLocalNorthVector(A)        // z
            var up = getLocalUpVector(A)            // y

            // create a matrix for the platform
            var platformMatrix = new Matrix4()
            platformMatrix.makeBasis(right, up, fwd)

            // We now want to rotate the platformMatric about the up axis by the platformHeading
            // apply a rotation of the platformHeading about the up axis

            // Create a rotation matrix around the up vector by the platformHeading
            // note we use the negative of the heading, as it's clockwise about down, not up
            var rotationMatrix = new Matrix4();
            rotationMatrix.makeRotationAxis(up.normalize(), -radians(platformHeading));
            platformMatrix.premultiply(rotationMatrix);  // This rotates the platform matrix around the 'up' axis by the platformHeading

            // Now we want to rotate the platformMatrix about the right axis by the platformPitch
            right = new Vector3().setFromMatrixColumn(platformMatrix, 0); // Extracts the first column, which is the right vector
            rotationMatrix.makeRotationAxis(right.normalize(), radians(platformPitch));
            platformMatrix.premultiply(rotationMatrix);
            right = new Vector3().setFromMatrixColumn(platformMatrix, 0); // Extracts the first column, which is the right vector

            // finally do roll, about the forward axis (z basis vector)
            fwd = new Vector3().setFromMatrixColumn(platformMatrix, 2); // Extracts the third column, which is the forward vector
            rotationMatrix.makeRotationAxis(fwd.normalize(), radians(platformRoll));
            platformMatrix.premultiply(rotationMatrix);

            let sensorMatrix = platformMatrix.clone(); // clone the platform matrix to start with the same orientation

            // Now we want to rotate the sensor about the platformMatrix by the sensorAz
            // this time we'll need to extract the up vector from the platformMatrix
            up = new Vector3().setFromMatrixColumn(sensorMatrix, 1); // Extracts the second column, which is the up vector
            rotationMatrix.makeRotationAxis(up.normalize(), -radians(sensorAz));
            sensorMatrix.premultiply(rotationMatrix);  // This rotates the platform matrix around the 'up' axis by the sensorAz

            // Now we want to rotate the sensor about the right vector by the sensorEl
            right = new Vector3().setFromMatrixColumn(sensorMatrix, 0); // Extracts the first column, which is the right vector
            rotationMatrix.makeRotationAxis(right.normalize(), radians(sensorEl));
            sensorMatrix.premultiply(rotationMatrix);  // This rotates the platform matrix around the 'right' axis by the sensorEl

            // finally do roll, about the forward axis (z basis vector)
            fwd = new Vector3().setFromMatrixColumn(sensorMatrix, 2); // Extracts the third column, which is the forward vector
            rotationMatrix.makeRotationAxis(fwd.normalize(), radians(sensorRoll));
            sensorMatrix.premultiply(rotationMatrix);  // This rotates the platform matrix around the 'forward' axis by the sensorRoll

            // we now have a platform matrix and a sensor matrix, we want to get the heading of the sensor
            // the heading of the sensor is the forward vector of the sensor matrix
            var heading = new Vector3().setFromMatrixColumn(sensorMatrix, 2); // Extracts the third column, which is the forward vector
            heading.normalize(); // should be normalized, but just tighten it up.

            // we might need to calculate the roll angle here
            //
            this.array.push({position: A, heading: heading, matrix: sensorMatrix.clone()})


        }
    }

    update(f) {
        if (f>=0 && f<this.frames) {
            const v = this.array[f]

            // DebugAxes("MISB Axes", v.position, 1000)
            DebugMatrixAxes("MISB Axes", v.position, v.matrix, 1000)
        }
    }


}
