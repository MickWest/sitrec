import {CNode3DTarget} from "./CNode3DTarget";
import {LineSegments, SphereGeometry, WireframeGeometry, Color} from "../../three.js/build/three.module";
import {CNode} from "./CNode";
import {V3} from "../threeExt";
import {getLocalUpVector} from "../SphericalMath";
import {assert} from "../utils"
import * as LAYER from "../LayerMasks";

export class CNodeDisplayTargetSphere extends CNode3DTarget {
    constructor(v) {
        v.layers      ??= LAYER.MASK_HELPERS;
        v.color ??= "white"

        super(v);


        this.color = v.color;

        // we make a sphere of radius 0.5 so it has a 1 METER diameter
        // so scale passed in must be in meters.
        const geometry = new SphereGeometry(0.5, 20, 20);
        const wireframe = new WireframeGeometry(geometry);
        const sphere = new LineSegments(wireframe);

        const matColor = new Color(this.color.v())
        console.log("COLOR = "+matColor.toString());
        sphere.material.color = matColor;
        console.log("COLOR = "+sphere.material.color.toString());

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
        this.input("distance",true);
        this.input("altitude",true);
        this.input("offsetRadians");
        this.input("wind", true);
        this.startFrame = v.frame;
        this.frames = this.in.track.frames;

    }

    getValueFrame(f) {
        const trackPos = this.in.track.p(this.startFrame);
        const trackDir = this.in.track.p(this.startFrame+1).clone().sub(trackPos).normalize();
        const camPos = this.in.camera.camera.position.clone()
        const toTrack = trackPos.clone().sub(camPos).normalize()
        const offsetDir = V3().crossVectors(toTrack,trackDir)
        let marker;
        let distanceToMarker;
        if (this.in.distance !== undefined) {
            const distance = this.in.distance.v0
            marker = toTrack.multiplyScalar(distance)
            distanceToMarker = distance;
        } else {
            assert (this.in.altitude !== undefined, "need altitude or distance in CNodeLOSTargetAtDistance")
            const altitude = this.in.altitude.v0;
            // we separate toTrack unit vector into component vectors parallel and perpendicular to the local up
            // then scale then both so the up component is 1
            const up = getLocalUpVector(camPos)
            const upDot = up.dot(toTrack)
            let upComponent = up.clone().multiplyScalar(upDot)
            let horizontalComponent = toTrack.clone().sub(upComponent)
            horizontalComponent.multiplyScalar(1/upDot);

            // then we scale the component by altitude.
            // since up is a unit vector this gives up the correct altitude
            // and the horizontal component is scaled the same
            marker = up.multiplyScalar(altitude).add(horizontalComponent.multiplyScalar(altitude))

            // calculate distance for angular offset, below.
            distanceToMarker = marker.length();
        }

        // angular offset
        const offset = distanceToMarker * Math.tan(this.in.offsetRadians.v())
        marker.add(camPos).sub(offsetDir.clone().multiplyScalar(offset))

        // if we have wind, then add it in based on the frame offset from the startFrame
        // so when it's at the startFrame, the position will be on the track (+ .
        if (this.in.wind !== undefined) {
            const frameOffset = f-this.startFrame;
       //     console.log(f+" - "+frameOffset);
            marker.add(this.in.wind.v(0).multiplyScalar(frameOffset))
        }

        return {position: marker}
    }

}