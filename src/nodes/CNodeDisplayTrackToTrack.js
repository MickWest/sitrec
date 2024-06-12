import {CDisplayLine} from "../threeExt";
import {CNode3DGroup} from "./CNode3DGroup";
import * as LAYER from "../LayerMasks";
import {assert} from "../assert.js";

// displays a SINGLE LINE from comeraTrack to targetTrack, optionally extending to ground level

export class CNodeDisplayTrackToTrack extends CNode3DGroup {
    constructor(v) {

        v.layers      ??= LAYER.MASK_HELPERS;
        v.cameraTrack ??= "cameraTrack";
        v.targetTrack ??= "targetTrack";
        v.color       ??= [1, 0, 1];
        v.width       ??= 1;
        super(v);

        // newer method - allow input nodes to be declared outside the inputs object
        // and automatically convert constant inputs to CConstantNodes
        this.input("cameraTrack") // track contains position, and optionally color
        this.input("targetTrack") // track contains position, and optionally color
        this.input("color") // or color can be supplied in a seperate node
        this.input("width") // Width currently only working as a constant (v0 is used)

        assert(this.in.cameraTrack.p(0) !== undefined, "CNodeDisplayTrackPosition needs input with position")

        this.frames = v.frames ?? this.in.cameraTrack.frames;

        this.trackGeometry = null
        this.trackLine = null


        var width = 1
        if (this.in.width !== undefined)
            width = this.in.width.v0

    }





    update(f) {
        if (this.line) {
            this.line.dispose();
        }
        this.line = new CDisplayLine({
            color: this.in.color.v(f),
            width: this.in.width.v(f),
            A: this.in.cameraTrack.p(f),
            B: this.in.targetTrack.p(f),
            group: this.group,
            layers: this.layers,
        });


    }


    recalculate() {
    }

    dispose() {
        if (this.line) {
            this.line.dispose();
        }
    }
}

