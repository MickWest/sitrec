//var matLineWhiteThin = makeMatLine(0xFFFFFF, 0.75);
import {makeMatLine} from "../MatLines";
import {Sit} from "../Globals";
import {DebugSphere, dispose, intersectMSL} from "../threeExt";
import {par} from "../par";
import {metersFromMiles} from "../utils";
import {CNode3DGroup} from "./CNode3DGroup";

import {LineGeometry} from "three/addons/lines/LineGeometry.js";
import {Line2} from "three/addons/lines/Line2.js";
import * as LAYER from "../LayerMasks";

var matLineGreyThin = makeMatLine(0x404040, 0.50);
// CNodeDisplayLOS display the Lines Of Sight
// inputs.LOS is a per-frame node that returns values of:
//  .position = Vector3 start of the LOS
//  .heading = Vector3, unit vector direction
// clipSeaLevel = flag if to stop the LOS at sea level. Default = true, currently only FLIR1 sets it to false
// highlightLines = object keyed on frame nubmers that need a different color
// spacing = how many frames between each LOS to display
export class CNodeDisplayLOS extends CNode3DGroup {
    constructor(v) {
        v.layers ??= LAYER.MASK_HELPERS;
        super(v);

        this.input("LOS")
        this.optionalInputs(["traverse"])

        this.clipSeaLevel = v.clipSeaLevel ?? true;
        this.highlightLines = v.highlightLines ?? {};
        this.LOSLengthMiles = v.LOSLength ?? 200;
        this.spacing = v.spacing ?? 30;

        let color = 0x808080;
        // at this point v.color will be a node, so we need to get the value
        if (v.color !== undefined) {
            color = v.color.getValue();
        }

        this.material = makeMatLine(color, v.width ?? 0.75)

        this.Jet_LOS3D = [] // see below

        // extra lines and spheres for debugging
        this.displayFineDetail = false

        this.recalculate()
    }

    // we update the positions of the spheres every frame
    // because they get added AFTER the display node has been recalculated
    update() {

       // this.recalculate();
       // return;

        if (this.in.traverse)
            for (var f = 0; f < this.in.LOS.frames; f++) {

                // one per second (assume 30 fps), plus arbitary lines to highlight
                if (this.isFineDetail(f) || f % this.spacing === 0 || this.highlightLines[f] !== undefined) {

                    var traverse = this.in.traverse.v(f)
                    if (traverse.position) {
                        if (this.isFineDetail(f))
                            DebugSphere("LOSInteresect" + this.detailFrameName(f), traverse.position, 0.2, 0xff0000)
                        else
                            DebugSphere("LOSInteresect" + f, traverse.position, 0.1, 0xff0000)
                    }


                }
            }
    }

    isFineDetail(f) {
        return this.displayFineDetail && Math.abs(f - par.frame) < 30
    }

    detailFrameName(f) {
        return "" + (f - par.frame)
    }

    recalculate() {

        // console.log("recalculate LOS, this.in.LOS.frames = "+this.in.LOS.frames+
        // "this.in.LOS.id = "+this.in.LOS.id+ " Sit.frames = "+Sit.frames);

        // Jet_LOS is an array of structures of line + geometry
        // for all the radiating LOS (like LOSX)
        this.Jet_LOS3D.forEach((item, index) => {
            this.group.remove(item.line)
            dispose(item.geometry)
        })

        this.Jet_LOS3D = []
        for (var f = 0; f < this.in.LOS.frames; f++) {

            // one per second (assume 30 fps), plus arbitary lines to highlight
            if (this.isFineDetail(f) || f % this.spacing === 0 || this.highlightLines[f] !== undefined) {

                var los = this.in.LOS.v(f)
                var A = los.position.clone();
                var fwd = los.heading.clone();
                var B = A.clone()


                const scale = metersFromMiles(this.LOSLengthMiles)
                fwd.multiplyScalar(scale)
                B.add(fwd)

                if (this.clipSeaLevel && fwd.y < 0) {
                    // intersecting with a plane is no good with larger scales
                    // especially when a sitch is setup with large tiles
                    // as the "level" plane diverges significantly from the globe
                    // so we get intersection with the globe
                    const seaLevelPoint = intersectMSL(A, fwd)
                    if (seaLevelPoint) {
                        B = seaLevelPoint
                    }
                }


                var points = [A.x, A.y, A.z, B.x, B.y, B.z]
                var lineOb = {}
                lineOb.geometry = new LineGeometry()
                lineOb.geometry.setPositions(points)

                var color = this.material // matLineWhiteThin;

                // we can be passed in an array of lines to highlight
                if (this.highlightLines[f] != undefined)
                    color = this.highlightLines[f]

                // dim out things outside the active range
                if (f < Sit.aFrame || f > Sit.bFrame) {
                    color = matLineGreyThin;
                }

                lineOb.line = new Line2(lineOb.geometry, color)
                this.Jet_LOS3D.push(lineOb)
                this.group.add(lineOb.line)
            }
        }
        this.propagateLayerMask()
    }
}