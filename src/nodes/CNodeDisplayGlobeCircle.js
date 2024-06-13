import {CNode3DGroup} from "./CNode3DGroup";
import * as LAYER from "../LayerMasks";
import {DebugArrowAB, dispose} from "../threeExt";
import {LineGeometry}               from "three/addons/lines/LineGeometry.js";
import {wgs84} from "../LLA-ECEF-ENU";
import {Line2} from "three/addons/lines/Line2.js";
import {makeMatLine} from "../MatLines";
import {perpendicularVector, V3} from "../threeUtils";



export class CNodeDisplayGlobeCircle extends CNode3DGroup {
    constructor(v) {
        v.layers ??= LAYER.MASK_HELPERS;
        super(v);
        this.input("color");
        this.input("width");

        this.normal = v.normal.clone() ?? V3(0, 0, 1);
        this.normal.normalize()
        this.offset = v.offset ?? 300000;
        this.radius = v.radius ?? wgs84.RADIUS*1.001;

        this.circleGeometry = null;
        this.circleLine = null;

        this.matLine = makeMatLine(this.in.color.v(), this.width)

        this.rebuild();
    }

    dispose() {
        this.removeCircle();
        super.dispose();
    }

    removeCircle() {
        this.group.remove(this.circleLine);
        dispose(this.circleGeometry)
    }

    rebuild() {
        this.removeCircle()
        const line_points = [];

        const perpendicular = perpendicularVector(this.normal).normalize();
        const otherPerpendicular = this.normal.clone().cross(perpendicular);

        const globeCenter = V3(0,-wgs84.RADIUS,0);
        const circleCenter = globeCenter.clone().add(this.normal.multiplyScalar(this.offset));
        const circleRadius = Math.sqrt(this.radius*this.radius - this.offset*this.offset);
        const segments = 100;
        for (let i = 0; i < segments; i++) {
            const theta = i / (segments-1) * 2 * Math.PI;
            const point = circleCenter.clone()
            point.add(perpendicular.clone().multiplyScalar(Math.cos(theta) * circleRadius))
            point.add(otherPerpendicular.clone().multiplyScalar(Math.sin(theta) * circleRadius));
            line_points.push(point.x, point.y, point.z);
        }

        // create a geometry from those points
        const _lineGeometry = new LineGeometry();
        _lineGeometry.setPositions(line_points);
        this.circleGeometry = _lineGeometry;
        this.circleLine = new Line2( this.circleGeometry, this.matLine );
        this.circleLine.computeLineDistances();
        this.circleLine.scale.setScalar( 1 );
        this.group.add(this.circleLine);

    }



}