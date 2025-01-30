// a node that displays a 3D arc with a start point, end point

import {V3} from "../threeUtils";
import {wgs84} from "../LLA-ECEF-ENU";
import {Vector3, BufferGeometry, LineBasicMaterial, Line, Quaternion} from "three";
import {CNode3DGroup} from "./CNode3DGroup";

export class CNode3DLLAArc extends CNode3DGroup {
    constructor(v) {
        super(v);
        this.input("A")
        this.input("B")
        this.input("height")
        this.recalculate()
    }

    recalculate() {
        const A = this.in.A.v() + this.in.height.v();
        const B = this.in.B.v() + this.in.height.v();

        const Center = V3(0, -wgs84.RADIUS, 0)
        const Radius = wgs84.RADIUS + this.in.height.v()

        const segments = 64;

        this.arc = createArc(A, B, Center, segments, 0xff0000);


    }


}

/**
 * Creates an arc between points A and B with the specified Center.
 *
 * @param {Vector3} A - Starting point of the arc.
 * @param {Vector3} B - Ending point of the arc.
 * @param {Vector3} Center - Center of curvature.
 * @param {number} segments - Number of segments for the arc.
 * @param {number} color - Color of the arc in hexadecimal.
 */
function createArc(A, B, Center, segments = 32, color = 0xffff00) {
    // Compute normalized vectors from Center to A and B
    const vecA = new Vector3().subVectors(A, Center).normalize();
    const vecB = new Vector3().subVectors(B, Center).normalize();

    // Calculate the angle between vecA and vecB
    let angle = vecA.angleTo(vecB);

    // Determine the direction of rotation using the cross product
    const cross = new Vector3().crossVectors(vecA, vecB);
    // Assuming Z-up. Adjust the axis as needed based on your coordinate system
    if (cross.dot(new Vector3(0, 0, 1)) < 0) {
        angle = -angle;
    }

    // Create a quaternion for incremental rotation
    const axis = cross.clone().normalize();
    const quaternion = new Quaternion();
    quaternion.setFromAxisAngle(axis, angle / segments);

    // Initialize points array with A
    const points = [A.clone()];

    let currentVec = vecA.clone();
    const radius = A.distanceTo(Center); // Assuming A and B are equidistant from Center

    // Generate intermediate points along the arc
    for (let i = 1; i < segments; i++) {
        currentVec.applyQuaternion(quaternion);
        const point = currentVec.clone().multiplyScalar(radius).add(Center);
        points.push(point);
    }

    // Add point B
    points.push(B.clone());

    // Create geometry and material for the arc
    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({ color: color });

    // Create the line (arc) and add it to the scene
    const arc = new Line(geometry, material);
 //   scene.add(arc);
    return arc;
}