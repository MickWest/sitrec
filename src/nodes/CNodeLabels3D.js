// 3D labels (and other text that exists in 3D)
// uses the SpriteText library
// and adjusts the scale of the sprites on a per-camera basis

import SpriteText from '../js/three-spritetext';
import * as LAYER from "../LayerMasks";
import {calculateAltitude, DebugArrowAB, propagateLayerMaskObject, removeDebugArrow} from "../threeExt";
import {altitudeAboveSphere, pointOnSphereBelow} from "../SphericalMath";
import {CNodeMunge} from "./CNodeMunge";
import {Globals, guiShowHide, infoDiv, NodeMan, Units} from "../Globals";
import {CNode3DGroup} from "./CNode3DGroup";
import {par} from "../par";
import {LLAToEUS} from "../LLA-ECEF-ENU";

import {assert} from "../assert.js";
import {V2, V3} from "../threeUtils";

import {ViewMan} from "../CViewManager";


export const measurementUIVars = {
}

// a global flag to show/hide all measurements
let measurementUIDdone = false;
let measureArrowGroupNode = null;
let measureDistanceGroupNode = null;

let labelsGroupNode = null;
let labelsControllerMain = null;
let labelsControllerLook = null;


// adds a new group for measurements, and a GUI controller to toggle it.
export function setupMeasurementUI() {
    if (measurementUIDdone) return;
    measurementUIDdone = true;

    // We create a group node to hold all the measurement arrows
    measureArrowGroupNode = new CNode3DGroup({id: "MeasurementsGroupNode"});
    measureArrowGroupNode.isMeasurement = true

    labelsGroupNode = new CNode3DGroup({id: "LabelsGroupNode"});

    measureDistanceGroupNode = new CNode3DGroup({id: "MeasureDistanceGroupNode"});
  //  measureDistanceGroupNode.isMeasurement = true;



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

    Globals.showLabelsMain = true;
    Globals.showLabelsLook = false;





    labelsControllerMain = guiShowHide.add(Globals, "showLabelsMain").name("Labels in Main").listen().onChange( (value) => {
       refreshLabelVisibility();
    });

    labelsControllerLook = guiShowHide.add(Globals, "showLabelsLook").name("Labels in Look").listen().onChange( (value) => {

        refreshLabelVisibility();
    })

}

export function refreshLabelsAfterLoading() {
    measurementUIVars.controller._callOnChange(); // PATCH: call the onChange function to update the UI for the visibility of the measurements

    labelsControllerMain._callOnChange();
    labelsControllerLook._callOnChange


    refreshLabelVisibility();
}

export function refreshLabelVisibility() {
    // we just set the layers mask to the appropriate value
    let mask = 0;
    if (Globals.showLabelsMain) {
        mask |= LAYER.MASK_MAIN;
    }
    if (Globals.showLabelsLook) {
        mask |= LAYER.MASK_LOOK;
    }
    labelsGroupNode.group.layers.mask = mask;
    propagateLayerMaskObject(labelsGroupNode.group);
}

export function removeMeasurementUI() {
    if (measureArrowGroupNode) {
        measureArrowGroupNode.dispose();
        measureArrowGroupNode = null;
        measureDistanceGroupNode.dispose();
        measureDistanceGroupNode = null;
        labelsGroupNode.dispose();
        labelsGroupNode = null;
        measurementUIDdone = false
    }
}

export class CNodeLabel3D extends CNode3DGroup {
    constructor(v) {
        const groupNode = NodeMan.get(v.groupNode ?? "MeasurementsGroupNode");
        v.container = groupNode.group;
        super(v)
        this.groupNode = groupNode;
        this.unitType = v.unitType ?? "big";
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
        this.input("color",true)

        let color = '#FFFFFF';
        if (this.in.color !== undefined) {
            color = this.in.color.v(0)
            // convert from THREE.Color to hex
            if (color.getStyle !== undefined) {
                color = color.getStyle();
            }
        }

        this.sprite.color = color;
        this.sprite.layers.mask = v.layers ?? LAYER.MASK_HELPERS;
        this.group.add(this.sprite);
        this.isMeasurement = true;

        // for sprite center (anchor point), 0,0 is lower left
        this.sprite.center = V2(v.centerX ?? 0.5, v.centerY ?? 0.5);
        this.offset = V2(v.offsetX ?? 0, v.offsetY ?? 0);

//        setupMeasurementUI();

    }

    preRender(view) {
        this.updateVisibility(view);
        this.updateScale(view);
    }

    updateVisibility(view) {
        // text is draw with no depth test, so it's always visible
        // so here we check if it's underground, and hide it if it is
        const altitude = calculateAltitude(this.position);
        let transparency = 1;
        if (altitude > 0) {
        } else {
            const fadeDepth = 25000;
            if (altitude < -fadeDepth) {
                transparency = 0 ;
            } else {
                transparency = (1 + altitude / fadeDepth);
            }

        }


        //console.log("transparency = " + transparency + " altitude = " + altitude)
        this.sprite.setTransparency(transparency);



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
        if (this.offset !== undefined) {
            pos = view.offsetScreenPixels(pos, this.offset.x, this.offset.y);
        }

        this.sprite.position.copy(pos);

        const mask = camera.layers.mask;
        const fovScale = 0.0025 * Math.tan((camera.fov / 2) * (Math.PI / 180))
         const sprite = this.sprite;
        if (sprite.layers.mask & mask) {
            const distance = camera.position.distanceTo(sprite.position);
            let scale = distance * fovScale * this.size * ViewMan.heightPx/view.heightPx;
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

        let color = 0x00FF00;
        if (this.in.color !== undefined) {
            color = this.in.color.v(f)
        }

        // add an arrow from A to C and B to D
        DebugArrowAB(this.id + "start", this.C, this.A, color, true, this.groupNode.group);
        DebugArrowAB(this.id + "end", this.D, this.B, color, true, this.groupNode.group);

        let length

        if (this.altitude) {
            // if we are measuring altitude, then we need to use the altitude of A and B
            // to calculate the length
            length = altitudeAboveSphere(this.A) - altitudeAboveSphere(this.B);
        } else {
            length = this.A.distanceTo(this.B);
        }



        let text;
        if (this.altitude) {
            // TODO: verify this is correct, use the fixed camera and target
            var alt = altitudeAboveSphere(this.A)
            if (Math.abs(alt-length) < 1) {
                // if the altitude is within 1 meter of the length, then just show the length
                // as that means we are over the ocean (zero altitude msl))
                text = Units.withUnits(length, this.decimals, this.unitType) + " msl\n ";
            } else {
                text = Units.withUnits(length, this.decimals, this.unitType) + " agl";
                text += "\n " + Units.withUnits(alt, this.decimals, this.unitType) + " msl";
            }
            //text += "\n "+Units.withUnits(alt, this.decimals, this.unitType)+ " msl";
        } else {
            text = Units.withUnits(length, this.decimals, this.unitType);
        }
        this.changeText(text);

    }

    dispose() {
        removeDebugArrow(this.id+"start");
        removeDebugArrow(this.id+"end");
        super.dispose();
    }
}

export class CNodeLabeledArrow extends CNodeLabel3D {
    constructor(v) {
        super(v);
        this.input("start");
        this.input("direction")
        this.input("length");
        this.input("color")

        this.label = v.label ?? "";

        this.recalculate(0);
    }

    recalculate(f) {
        this.start = this.in.start.p(f);
        this.length = this.in.length.v(f);
        this.direction = this.in.direction.p(f);

        // normalize the direction
        this.direction.normalize();

        this.end = this.start.clone().add(this.direction.clone().multiplyScalar(this.length));
        this.position.copy(this.end);

        const color = this.in.color.v(f)
        // add an arrow from A to C and B to D
        DebugArrowAB(this.id+"arrow", this.start, this.end, color, true, this.groupNode.group);


        this.changeText(this.label);

    }

    updateDirection(dir) {
        this.direction.copy(dir);
        this.update(0);
    }

    // scale things based on the camera's position
    preRender(view) {

        // change the length of the arrows based on the camera's position
        if (this.length < 0) {
            const lengthPixels = -this.length;
            const lengthMeters = view.pixelsToMeters(this.start, lengthPixels);
            const color = this.in.color.v(0)
            this.end = this.start.clone().add(this.direction.clone().multiplyScalar(lengthMeters));

            // just calling this again will update the length of the arrow
            DebugArrowAB(this.id+"arrow", this.start, this.end, color, true, this.groupNode.group);
        }

        // update the position of the text
        this.position.copy(this.end);
        super.preRender(view);
    }

    dispose() {
        removeDebugArrow(this.id+"arrow");
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

        v.unitType ??= "small";
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


