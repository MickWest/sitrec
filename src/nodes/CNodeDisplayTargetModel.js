// fiddly temporary class to handle the jet target
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {FileManager, gui, NodeMan, Sit} from "../Globals";

import {Matrix4} from "three";

import {radians} from "../utils";
import {getGlareAngleFromFrame} from "../JetStuff";
import {trackAcceleration, trackDirection, trackVelocity} from "../trackUtils";
import {V3} from "../threeUtils";
import {CNode3DGroup} from "./CNode3DGroup";


// By default it will create a model from the file tagged "TargetObjectFile"
// or you can pass a "TargetObjectFile" member in the input structure (v, here)
export class CNode3DModel extends CNode3DGroup {
    constructor(v) {
        super(v);



        const data = FileManager.get(v.TargetObjectFile ?? "TargetObjectFile")

        const loader = new GLTFLoader()
          loader.parse(data, "", (gltf2) => {
            this.model = gltf2.scene //.getObjectByName('FA-18F')
            this.model.scale.setScalar(1);
            this.model.visible = true
            this.group.add(this.model)
        })


    }

    modSerialize() {
        return {
            ...super.modSerialize(),
            tiltType: this.tiltType,
        }
    }

    modDeserialize(v) {
        super.modDeserialize(v)
        this.tiltType = v.tiltType
    }

    update(f) {
        super.update(f)
        this.recalculate() // every frame so scale is correct after the jet loads

    }

    recalculate() {
        super.recalculate()
        this.propagateLayerMask()

    }

}

// legacy class using the new CNode3DModel, and adding the functionality that was in CNode3DTarget
export class CNodeDisplayTargetModel extends CNode3DModel {
    constructor(v) {
        super(v);

        this.input("track");


        // split this into bank and saucer tilt
        // note backwards compatiability patch to get the tracks from the inputs
        this.addController("SaucerTilt", {
            tiltType: v.tiltType,
            track:    v.track    ?? this.in.track,
            wind:     v.wind,
            airTrack: v.airTrack ?? this.in.airTrack,

        })


    }

    update(f) {
        super.update(f);
        this.group.position.copy(this.in.track.p(f))
    }
}

