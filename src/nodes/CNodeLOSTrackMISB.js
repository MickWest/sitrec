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
import {CNodeEmptyArray} from "./CNodeArray";
import {getLocalEastVector, getLocalNorthVector, getLocalUpVector} from "../SphericalMath";
import {Matrix4} from "../../three.js/build/three.module";
import {radians} from "../utils";
import {Vector3} from "three";
import {DebugMatrixAxes} from "../threeExt";

export class CNodeLOSTrackMISB extends CNodeEmptyArray {

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
        if (f >= 0 && f < this.frames) {
            const v = this.array[f]

            // DebugAxes("MISB Axes", v.position, 1000)
            DebugMatrixAxes("MISB Axes", v.position, v.matrix, 1000)
        }
    }


}