import {CNode3DGroup} from "./CNode3DGroup";
import {CDisplayLine, pointAbove, pointOnGroundLL} from "../threeExt";
import * as LAYER from "../LayerMasks";
import {getLocalNorthVector, getLocalUpVector} from "../SphericalMath";
import {radians} from "../utils";
import {Color} from "three";

export class CNodeLineMarker extends CNode3DGroup {
    constructor(v) {
        super(v);
        this.input("lat");
        this.input("lon");
        this.input("height");
        this.input("color");
        this.line = null
        this.recalculate();
    }

    recalculate() {
        const lat = this.in.lat.v0;
        const lon = this.in.lon.v0;
        const height = this.in.height.v0;
        const color = this.in.color.v0;
        const ground = pointOnGroundLL(lat, lon);
        const above = pointAbove(ground, height);
        if (this.line) {
            this.line.dispose();
        }
        this.line = new CDisplayLine({
            color: [color.r, color.g, color.b],
            A: ground,
            B: above,
            width: 1,
            group: this.group,
            layers: LAYER.MASK_LOOKRENDER
        });
    }

}

export class CNodeLaserMarker extends CNode3DGroup {
    constructor(v) {
        super(v);
        this.input("lat");
        this.input("lon");
        this.input("height");
        this.input("weight");
        this.input("color");
        this.input("radius");
        this.input("angle");
        this.input("sides")
        this.cloudBands = [];
        if (v.cloudBand1) {
            this.cloudBands.push(v.cloudBand1);
        }
        if (v.cloudBand2) {
            this.cloudBands.push(v.cloudBand2);
        }
        this.halveColors = v.halveColors ?? false;
        this.lines = null
        this.recalculate();
        // initial calculation will not have terrain heights, so add a callback
        // for when it has loaded.
        this.onTerrainLoaded(() => this.recalculate());
    }

    recalculate() {
        const lat = this.in.lat.v0;
        const lon = this.in.lon.v0;
        const height = this.in.height.v0;
        const weight = this.in.weight.v0;
        const color = new Color(this.in.color.v0);
        const ground = pointOnGroundLL(lat, lon);
        const above = pointAbove(ground, height);
        this.angle = this.in.angle.v0;
        this.sides = this.in.sides.v0;
        if (this.lines) {
            for (let line of this.lines) {
                line.dispose();
            }
        }

        const heading = getLocalNorthVector(ground);
        heading.multiplyScalar(this.in.radius.v0)
        const up = getLocalUpVector(ground);

        let angle = radians(this.angle);
        let angleStep = 2*Math.PI / this.sides;

        // rotate north vector 120 degrees
        heading.applyAxisAngle(up, angle);

        this.lines = [];

        for (let i = 0; i < this.sides; i++) {
            const groundA = ground.clone().add(heading);
            this.lines.push(new CDisplayLine({
                color: color,
                A: groundA,
                B: above.clone().add(heading),
                width: weight,
                group: this.group,
                layers: LAYER.MASK_LOOKRENDER
            }));

            for (let band of this.cloudBands) {
                const cloudBase = pointAbove(groundA, band.start);
                const cloudTop = pointAbove(groundA, band.start + band.depth);
                this.lines.push(new CDisplayLine({
                    color: band.color ?? color,
                    A: cloudBase,
                    B: cloudTop,
                    width: band.weight ?? weight,
                    group: this.group,
                    layers: LAYER.MASK_LOOKRENDER
                }));
            }


            if (this.halveColors) {
                color.r /= 2;
                color.g /= 2;
                color.b /= 2;
            }
            heading.applyAxisAngle(up, angleStep);
        }

    }
}
