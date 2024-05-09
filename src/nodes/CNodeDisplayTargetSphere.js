import {CNode3DTarget} from "./CNode3DTarget";
import {Color, LineSegments, SphereGeometry, WireframeGeometry} from "../../three.js/build/three.module";
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
        sphere.material.color = matColor;

        sphere.material.depthTest = true;
        sphere.material.opacity = 0.75;
        sphere.material.transparent = true;

        this.group.add(sphere);
        this.targetObject = sphere;
        this.propagateLayerMask()
        this.recalculate()

    }

    dispose() {
        this.targetObject.geometry.dispose();
        this.targetObject.material.dispose();
        this.group.remove(this.targetObject);
        super.dispose();
    }

    recalculate() {
        // with a 1 meter diameter sphere, the "size" input is the diameter in meters.
        const scale = this.in.size.v0
//        console.log("TARGET SPHERE DIAMETER = " + scale + "m "+ m2f(scale) + "f");
        this.group.scale.setScalar(scale);
    }
}



