// 3D labels (and other text that exists in 3D)
// uses the SpriteText library
// and adjusts the scale of the sprites on a per-camera basis

import SpriteText from '../js/three-spritetext';
import * as LAYER from "../LayerMasks";
import {DebugArrowAB, removeDebugArrow} from "../threeExt";
import {altitudeAboveSphere, pointOnSphereBelow} from "../SphericalMath";
import {CNodeMunge} from "./CNodeMunge";
import {Globals, guiShowHide, NodeMan, Units} from "../Globals";
import {CNode3DGroup} from "./CNode3DGroup";
import {par} from "../par";
import {LLAToEUS} from "../LLA-ECEF-ENU";

import {assert} from "../assert.js";
import {V2, V3} from "../threeUtils";


export const measurementUIVars = {
}

// a global flag to show/hide all measurements
let measurementUIDdone = false;
let measureArrowGroupNode = null;

// adds a new group for measurements, and a GUI controller to toggle it.
export function setupMeasurementUI() {
    if (measurementUIDdone) return;
    measurementUIDdone = true;

    // We create a group node to hold all the measurement arrows
    measureArrowGroupNode = new CNode3DGroup({id: "MeasurementsGroupNode"});
    measureArrowGroupNode.isMeasurement = true


//    console.warn("%%%%%%% setupMeasurementUI: Globals.showMeasurements = " + Globals.showMeasurements)

    function refreshMeasurementVisibility() {
        NodeMan.iterate((key, node) => {
            if (node.isMeasurement) {
//                console.log ("Setting visibility of " + key + " to " + Globals.showMeasurements)
                node.group.visible = Globals.showMeasurements;
            }
        })
    }

    refreshMeasurementVisibility();

    measurementUIVars.controller =  guiShowHide.add(Globals, "showMeasurements").name("Measurements").listen().onChange( (value) => {
//        console.warn("%%%%%%% showMeasurements changed to " + value)
        refreshMeasurementVisibility();
        par.renderOne = true;
    })


}

export function removeMeasurementUI() {
    if (measureArrowGroupNode) {
        measureArrowGroupNode.dispose();
        measureArrowGroupNode = null;
        measurementUIDdone = false
    }
}

export class CNodeLabel3D extends CNode3DGroup {
    constructor(v) {
        super(v)
        this.unitSize = v.unitSize ?? "big";
        this.decimals = v.decimals ?? 2;
        this.size = v.size ?? 12;
        this.sprite = new SpriteText(v.text, this.size);
        this.optionalInputs(["position"])
        this.position = V3();
        if (this.in.position !== undefined) {
            const pos = this.in.position.p(0);
//            this.sprite.position.set(pos.x, pos.y, pos.z);
            this.position.copy(pos)
        }
        this.sprite.layers.mask = v.layers ?? LAYER.MASK_HELPERS;
        this.group.add(this.sprite);
        this.isMeasurement = true;

        // for sprite center (anchor point), 0,0 is lower left
        this.sprite.center = V2(v.centerX ?? 0.5, v.centerY ?? 0.5);
        this.offset = V2(v.offsetX ?? 0, v.offsetY ?? 0);

//        setupMeasurementUI();

    }

    preViewportUpdate(view) {
        this.updateScale(view);
    }

    // Update the Scale based on the camera's position
    // Since this is a simple fixed size, we code just use sizeAttenuation:false in the sprite material
    // however I might want to change the size based on distance in the future.
    updateScale(view) {

        const camera = view.camera

        //this.sprite.position.copy(this.position)

        // given:
        // a 3D position in this.position
        // a 2D pixel offset in this.offset
        // a 3D camera position in camera.position
        // the camera vertical FOV in camera.fov
        // then modify the sprites position by the offset
        // accounting for the camera's FOV and distance to the sprite, and the viewport size in pixels
        // to keep the offset in pixels
        let pos = this.position.clone();
        pos.project(camera);
        pos.x += this.offset.x / view.widthPx;
        pos.y += this.offset.y / view.heightPx;
        pos.unproject(camera);
        this.sprite.position.copy(pos);




        const mask = camera.layers.mask;
        const fovScale = 0.0025 * Math.tan((camera.fov / 2) * (Math.PI / 180))
         const sprite = this.sprite;
        if (sprite.layers.mask & mask) {
            const distance = camera.position.distanceTo(sprite.position);
            let scale = distance * fovScale * this.size;
            sprite.scale.set(scale * sprite.aspect, scale, 1);
        }

    }

    update(f) {
        if (this.in.position !== undefined) {
            const pos = this.in.position.p(f);
            this.position.set(pos.x, pos.y, pos.z);
        }
    }

    dispose() {
        this.group.remove(this.sprite)
        this.sprite.material.dispose();
        this.sprite.geometry.dispose();
        super.dispose();
    }

    changeText(text) {
        // using the settor will regenerate the sprite canvas
        this.sprite.text = text;
    }

    // changePosition(position) {
    //     this.position.set(position.x, position.y, position.z);
    // }

}

// a text label that shows a given lat/lon at that position
// for labeling pins, etc
export class CNodeLLALabel extends CNodeLabel3D {
    constructor(v) {
        super(v);
        this.lat = v.lat;
        this.lon = v.lon;
        this.alt = v.alt;
        this.update(0);

    }

    update(f) {
        const lat = this.lat;
        const lon = this.lon;
        const text = `${lat.toFixed(4)} ${lon.toFixed(4)}`;
        this.changeText(text);

        const pos = LLAToEUS(lat, lon, this.alt);
        this.position.set(pos.x, pos.y, pos.z);

    }

    changeLLA(lat, lon, alt) {
        this.lat = lat;
        this.lon = lon;
        this.alt = alt;
        this.update(0);
    }

}

export class CNodeMeasureAB extends CNodeLabel3D {
    constructor(v) {
        v.position = v.A;  // PATCH !! we have A and B, but super needs position
        super(v);
        this.input("A");
        this.input("B");
        this.input("color",true)
        this.update(0)
    }

    update(f) {
        this.A = this.in.A.p(f);
        this.B = this.in.B.p(f);
        const midPoint = this.A.clone().add(this.B).multiplyScalar(0.5);
        this.position.set(midPoint.x, midPoint.y, midPoint.z);

        // get a point that's 90% of the way from A to midPoint
        this.C = this.A.clone().lerp(midPoint, 0.9);
        // and the same for B
        this.D = this.B.clone().lerp(midPoint, 0.9);

        // add an arrow from A to C and B to D
        DebugArrowAB(this.id+"start", this.C, this.A, 0x00ff00, true, measureArrowGroupNode.group);
        DebugArrowAB(this.id+"end", this.D, this.B, 0x00ff00, true, measureArrowGroupNode.group);

        const length = this.A.distanceTo(this.B);
        let text;
        if (this.altitude) {
            text = Units.withUnits(length, this.decimals, this.unitSize) + " agl";
            var alt = altitudeAboveSphere(this.A)
            text += "\n "+Units.withUnits(alt, this.decimals, this.unitSize)+ " msl";
        } else {
            text = Units.withUnits(length, this.decimals, this.unitSize);
        }
        this.changeText(text);

    }

    dispose() {
        removeDebugArrow(this.id+"start");
        removeDebugArrow(this.id+"end");
        super.dispose();
    }
}

export class CNodeMeasureAltitude extends CNodeMeasureAB {
    constructor(v) {

        assert(v.id !== undefined, "CNodeMeasureAltitude id is undefined")
        v.A = v.position; // we are going to add an AB measure, so we need A
// we are going to munge the position to get the altitude
        const B = new CNodeMunge({
            id: v.id + "_Below",
            inputs: {source: v.A},
            munge: (f) => {
                let B;
                const posNode = NodeMan.get(v.A); // cant use this.in.A as super hasnt been called yet
                const A = posNode.p(f);
                if (NodeMan.exists("TerrainModel")) {
                    let terrainNode = NodeMan.get("TerrainModel")
                    B = terrainNode.getPointBelow(A)
                } else {
                    B = pointOnSphereBelow(A);
                }
                return B;
            }
        })
        v.B = B;

        // patch to make it double size with two lines
        // should handle this better
        v.size = 24;

        v.unitSize ??= "small";
        v.decimals ??= 0;

        super(v);

        this.altitude = true;
    }
}


export function doLabel3D(id, pos, text, size, layers) {
    let node = NodeMan.get(id, false);
    if (node == undefined) {
        node = new CNodeLabel3D({id, position: pos, text, size, layers});
        NodeMan.add(id, node);
    }
    return node;

}


