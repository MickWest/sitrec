//import * as THREE from "../../three.js/build/three.module";
import {f2m, m2f} from "../utils";
import {CNode3DTarget} from "./CNode3DTarget";
import {LineSegments, SphereGeometry, WireframeGeometry, Color} from "../../three.js/build/three.module";
import {NodeMan} from "../Globals";
import {CNode} from "./CNode";
import {V3} from "../threeExt";

export class CNodeDisplayTargetSphere extends CNode3DTarget {
    constructor(v) {
        super(v);

        this.color = v.color ?? "white"

        // we make a sphere of radius 0.5 so it has a 1 METER diameter
        // so scale passed in must be in meters.
        const geometry = new SphereGeometry(0.5, 20, 20);
        const wireframe = new WireframeGeometry(geometry);
        const sphere = new LineSegments(wireframe);
        sphere.material.color = new Color(this.color)
        sphere.material.depthTest = true;
        sphere.material.opacity = 0.75;
        sphere.material.transparent = true;

        this.group.add(sphere);
        this.targetObject = sphere;
        this.propagateLayerMask()
        this.recalculate()

    }

    recalculate() {
        // with a 1 meter diameter sphere, the "size" input is the diameter in meters.
        const scale = this.in.size.v0
//        console.log("TARGET SPHERE DIAMETER = " + scale + "m "+ m2f(scale) + "f");
        this.group.scale.setScalar(scale);
    }
}



// a fixed point track that returns a point on the LOS between a camera and
// the track at at given frame.
// can be used to put an object inbetween the camera and the track
export class  CNodeLOSTargetAtDistance extends CNode {
    constructor(v) {
        super(v);
        this.input("track");
        this.input("camera");
        this.input("distance");
        this.input("offsetRadians");
        this.frame = v.frame;

    }

    getValueFrame(f) {
        const trackPos = this.in.track.p(this.frame);
        const trackDir = this.in.track.p(this.frame+1).clone().sub(trackPos).normalize();
        const camPos = this.in.camera.camera.position.clone()
        const toTrack = trackPos.clone().sub(camPos).normalize()
        const offsetDir = V3().crossVectors(toTrack,trackDir)
        const distance = this.in.distance.v()

        const offset = distance * Math.tan(this.in.offsetRadians.v())

        const marker = toTrack.multiplyScalar(distance).add(camPos).sub(offsetDir.clone().multiplyScalar(offset))
        return {position: marker}
    }

}