import {assert} from "../utils";
import {dispose} from "../threeExt";
import {LineGeometry} from "../../three.js/examples/jsm/lines/LineGeometry";
import {LineMaterial} from "../../three.js/examples/jsm/lines/LineMaterial";
import {Line2} from "../../three.js/examples/jsm/lines/Line2";
import {CNode3DGroup} from "./CNode3DGroup";
import * as LAYER from "../LayerMasks";


// displays a SINGLE LINE from comeraTrack to targetTrack, optionally extending to ground level

export class CNodeDisplayTrackToTrack extends CNode3DGroup {
    constructor(v) {

        v.layers      ??= LAYER.MASK_HELPERS;
        v.cameraTrack ??= "cameraTrack";
        v.targetTrack ??= "targetTrack";
        v.color       ??= [1, 1, 1];
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

        this.matLineTrack = new LineMaterial({

            color: 0xffffff,
            linewidth: width, // in world units with size attenuation, pixels otherwise
            vertexColors: true,

            //resolution:  // to be set by this.renderer, eventually
            dashed: false,
            alphaToCoverage: true,

        });

        this.recalculate(0)
    }


    update(f) {
        this.group.remove(this.trackLine)
        // White Jet of view point line
        const line_points = [];
        const line_colors = [];

        var A = this.in.cameraTrack.p(f)
        if (A === undefined) {
            console.log("Frame "+f+" of "+this.in.cameraTrack.id+" is missing")
        }

        line_points.push(A.x, A.y, A.z);

        var B = this.in.targetTrack.p(f)
        if (B === undefined) {
            console.log("Frame "+f+" of "+this.in.targetTrack.id+" is missing")
        }
        line_points.push(B.x, B.y, B.z);
        var color = this.in.targetTrack.v(f).color
        if (color == undefined)
            color = this.in.color.v(f)
        line_colors.push(color.r, color.g, color.b)
        line_colors.push(color.r, color.g, color.b)

        dispose(this.trackGeometry)
        this.trackGeometry = new LineGeometry();
        this.trackGeometry.setPositions(line_points);
        this.trackGeometry.setColors(line_colors);

        //var material1 = this.in.color.v(0)

        this.matLineTrack.resolution.set(window.innerWidth, window.innerHeight)
        this.trackLine = new Line2(this.trackGeometry, this.matLineTrack);
        this.trackLine.computeLineDistances();
        this.trackLine.scale.set(1, 1, 1);
        this.group.add(this.trackLine);

        this.propagateLayerMask()
    }


    recalculate() {
    }
}

