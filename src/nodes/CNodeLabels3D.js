// 3D labels (and other text that exists in 3D)
// uses the SpriteText library
// and adjusts the scale of the sprites on a per-camera basis

import SpriteText from '../js/three-spritetext';
import {CManager} from "../CManager";
import {GlobalScene} from "../LocalFrame";
import * as LAYER from "../LayerMasks";
import {Group} from "three";
import {DebugArrowAB, removeDebugArrow} from "../threeExt";
import {CNode} from "./CNode";
import {pointOnSphereBelow} from "../SphericalMath";
import {CNodeMunge} from "./CNodeMunge";
import {NodeMan} from "../Globals";


export class CNodeLabel3D extends CNode {
    constructor(v) {
        super(v)
        this.size = v.size ?? 12;
        this.sprite = new SpriteText(v.text, this.size);
        this.input("position")
        const pos = this.in.position.p(0);
        this.sprite.position.set(pos.x, pos.y, pos.z);
        this.sprite.layers.mask = v.layers ?? LAYER.MASK_HELPERS;
    }

    update(f) {
        const pos = this.in.position.p(f);
        this.sprite.position.set(pos.x, pos.y, pos.z);
    }

    dispose() {
        this.sprite.dispose();
    }

    changeText(text) {
        // using the settor will regenerate the sprite canvas
        this.sprite.text = text;
    }

    // changePosition(position) {
    //     this.sprite.position.set(position.x, position.y, position.z);
    // }

}

export class CNodeMeasure3D extends CNodeLabel3D {
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
        this.sprite.position.set(midPoint.x, midPoint.y, midPoint.z);

        // get a point that's 90% of the way from A to midPoint
        this.C = this.A.clone().lerp(midPoint, 0.9);
        // and the same for B
        this.D = this.B.clone().lerp(midPoint, 0.9);

        // add an arrow from A to C and B to D
        DebugArrowAB(this.id+"start", this.C, this.A, 0x00ff00, true);
        DebugArrowAB(this.id+"end", this.D, this.B, 0x00ff00, true);

        const length = this.A.distanceTo(this.B);
        const text = length.toFixed(0) + "m";
        this.changeText(text);

    }

    dispose() {
        removeDebugArrow(this.id+"start");
        removeDebugArrow(this.id+"end");
        super.dispose();
    }
}


export class CLabel3DManager extends CManager {
    constructor(props) {
        super(props);
        this.group = new Group();
        GlobalScene.add(this.group);
    }


    // we REALLY don't need these once it's nodes
    addLabel(v) {
        const label = new CNodeLabel3D(v);
        this.group.add(label.sprite); // do we need this? of just the scene
        this.add(v.id, label);
        return label
    }

    addMeasureAB(v) {
        const measure = new CNodeMeasure3D(v);
        this.group.add(measure.sprite);
        this.add(v.id, measure);
        return measure
    }

    addMeasureAltitude(v) {
        v.A = v.position; // we are going to add an AB measure, so we need A
        // we are going to munge the position to get the altitude
        const B = new CNodeMunge({
            inputs: {source: v.A},
            munge: (f) => {
                let B;
                const posNode = NodeMan.get(v.A);
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

        const measure = this.addMeasureAB(v);
        return measure
    }



    update(frame) {
    }

    updateScale(camera) {
        // for each label, calculate the scale based on the distance from the camera
        // and the camera's field of view
        // and set the scale of the label's sprite
        // we iterate through the children of the group and not the managers
        // as it's more direct.

        const mask = camera.layers.mask;

        const fovScale = 0.0025 * Math.tan((camera.fov / 2) * (Math.PI / 180))

        for (let id in this.list) {
            const label = this.list[id].data;
            const sprite = label.sprite;
            if (sprite.layers.mask & mask) {
                const distance = camera.position.distanceTo(sprite.position);
                let scale = distance * fovScale * label.size;
                sprite.scale.set(scale * sprite.aspect, scale, 1);
            }
        }
    }

}



