// 3D labels (and other text that exists in 3D)
// uses the SpriteText library
// and adjusts the scale of the sprites on a per-camera basis

import SpriteText from './js/three-spritetext';
import {CManager} from "./CManager";
import {GlobalScene} from "./LocalFrame";
import * as LAYER from "./LayerMasks";
import {Group} from "three";
import {DebugArrowAB} from "./threeExt";


export class CLabel3D {
    constructor(text, position, props={}) {
        this.size = 12;
        this.sprite = new SpriteText(text, this.size);
        this.sprite.position.set(position.x, position.y, position.z);
        this.sprite.layers.mask = LAYER.MASK_HELPERS;
    }

    dispose() {
        this.sprite.dispose();
    }

    changeText(text) {
        // uasing the settor will regenerate the sprite canvas
        this.sprite.text = text;
    }

    changePosition(position) {
        this.sprite.position.set(position.x, position.y, position.z);
    }

}

export class CMeasure3D extends CLabel3D {
    constructor(text, A, B, props={}) {
        const midPoint = A.clone().add(B).multiplyScalar(0.5);
        super(text, midPoint, props);

    }

    changeAB(A, B) {
        this.A = A;
        this.B = B;
        const midPoint = A.clone().add(B).multiplyScalar(0.5);
        this.changePosition(midPoint);

        // get a point that's 90% of the way from A to midPoint
        this.C = A.clone().lerp(midPoint, 0.9);
        // and the same for B
        this.D = B.clone().lerp(midPoint, 0.9);

        // add an arrow from A to C and B to D
        DebugArrowAB("start", this.C, this.A, 0x00ff00, true);
        DebugArrowAB("end", this.D, this.B, 0x00ff00, true);

        const length = A.distanceTo(B);
        const text = length.toFixed(0) + "m";
        this.changeText(text);

    }
}


export class CLabel3DManager extends CManager {
    constructor(props) {
        super(props);
        this.group = new Group();
        GlobalScene.add(this.group);
    }

    addLabel(id, text, position, props={}) {
        const label = new CLabel3D(text, position, props);
        this.group.add(label.sprite); // do we need this? of just the scene
        this.add(id, label);
        return label
    }

    addMeasure(id, text, A, B, props={}) {
        const measure = new CMeasure3D(text, A, B, props);
        this.group.add(measure.sprite);
        this.add(id, measure);
        return measure
    }


    update(frame) {
        // update any watches, etc.
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



