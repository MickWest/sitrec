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
import {NodeMan, Units} from "../Globals";
import {CNode3DGroup} from "./CNode3DGroup";


export class CNodeLabel3D extends CNode3DGroup {
    constructor(v) {
        super(v)
        this.size = v.size ?? 12;
        this.sprite = new SpriteText(v.text, this.size);
        this.input("position")
        const pos = this.in.position.p(0);
        this.sprite.position.set(pos.x, pos.y, pos.z);
        this.sprite.layers.mask = v.layers ?? LAYER.MASK_HELPERS;
        this.group.add(this.sprite);

    }

    preViewportUpdate(camera) {
        this.updateScale(camera);
    }

    // Update the Scale based on the camera's position
    // Since this is a simple fixed size, we coudl jsut use sizeAttenuation:false in the sprite material
    // however I might want to change the size based on distance in the future.
    updateScale(camera) {
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
        this.sprite.position.set(midPoint.x, midPoint.y, midPoint.z);

        // get a point that's 90% of the way from A to midPoint
        this.C = this.A.clone().lerp(midPoint, 0.9);
        // and the same for B
        this.D = this.B.clone().lerp(midPoint, 0.9);

        // add an arrow from A to C and B to D
        DebugArrowAB(this.id+"start", this.C, this.A, 0x00ff00, true);
        DebugArrowAB(this.id+"end", this.D, this.B, 0x00ff00, true);

        const length = this.A.distanceTo(this.B);
        const text = Units.bigWithUnits(length,2);
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

        super(v);
    }
}



