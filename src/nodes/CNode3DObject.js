// CNode3DObject.js - CNode3DObject
// a 3D object node - a sphere, cube, etc, with gnerated geometry and material from the input parameters


import {CNode3DGroup} from "./CNode3DGroup";
import * as LAYER from "../LayerMasks";
import {BoxGeometry, Color, LineSegments, Mesh, SphereGeometry, WireframeGeometry} from "three";

export class CNode3DObject extends CNode3DGroup {
    constructor(v) {
        v.layers ??= LAYER.MASK_HELPERS;
        v.color ??= "white"

        super(v);

        this.input("size", true); // size input is optional

        this.color = v.color;

        // make a geometry based on v.geometry, "sphere", "cube", etc
        switch (v.geometry) {
            case "sphere":
                v.widthSegments ??= 20;
                v.heightSegments ??= 20;
                v.radius ??= 0.5;
                this.geometry = new SphereGeometry(v.radius, v.widthSegments, v.heightSegments);
                break;
            case "cube":
                this.geometry = new BoxGeometry(1,1,1);
                break;
            default:
                console.error("CNode3DObject: unknown geometry type: ", v.geometry)
        }

        if (v.wireframe) {
            this.wireframe = new WireframeGeometry(this.geometry);
            this.object = new LineSegments(this.wireframe);
        } else {
            this.object = new Mesh(this.geometry);
        }

        const matColor = new Color(this.color.v())
        this.object.material.color = matColor;

        this.object.material.depthTest = true;
        this.object.material.opacity = 0.75;
        this.object.material.transparent = true;

        this.group.add(this.object);
        this.propagateLayerMask()
        this.recalculate()

    }

    dispose() {
        this.object.geometry.dispose();
        this.object.material.dispose();
        this.group.remove(this.object);
        super.dispose();
    }

    recalculate() {
        const scale = this.in.size.v0
        this.group.scale.setScalar(scale);
    }
}