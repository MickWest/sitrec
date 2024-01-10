//var matLineWhiteThin = makeMatLine(0xFFFFFF, 0.75);
import {makeMatLine} from "../MatLines";
import {Sit} from "../Globals";
import {DebugSphere, dispose} from "../threeExt";
import {par} from "../par";
import {metersFromMiles} from "../utils";
import {CNode3DGroup} from "./CNode3DGroup";

import {LineGeometry}               from "../../three.js/examples/jsm/lines/LineGeometry";
import {LineMaterial}               from "../../three.js/examples/jsm/lines/LineMaterial";
import {Line2}                      from "../../three.js/examples/jsm/lines/Line2";

var matLineGreyThin = makeMatLine(0x404040, 0.50);
// CNodeDisplayLOS display the Lines Of Sight
// inputs.LOS is a per-frame node that returns values of:
//  .position = Vector3 start of the LOS
//  .heading = Vector3, unit vector direction
// clipSeaLevel = flag if to stop the LOS at sea level (e.g. with GoFast sitch)
// highlightLines = object keyed on frame nubmers that need a different color
export class CNodeDisplayLOS extends CNode3DGroup {
    constructor(v) {
        super(v);

        this.input("LOS")
        this.optionalInputs(["traverse"])

        this.clipSeaLevel = v.clipSeaLevel ?? false
        this.highlightLines = v.highlightLines ?? {}
        this.LOSLengthMiles = v.LOSLength ?? 200


        this.material = makeMatLine(v.color ?? 0x808080, v.width ?? 0.75)

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
                if (this.isFineDetail(f) || f % Sit.LOSSpacing === 0 || this.highlightLines[f] !== undefined) {

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

        // Jet_LOS is an array of structures of line + geometry
        // for all the radiating LOS (like LOSX)
        this.Jet_LOS3D.forEach((item, index) => {
            this.group.remove(item.line)
            dispose(item.geometry)
        })

        this.Jet_LOS3D = []
        for (var f = 0; f < this.in.LOS.frames; f++) {

            // one per second (assume 30 fps), plus arbitary lines to highlight
            if (this.isFineDetail(f) || f % Sit.LOSSpacing === 0 || this.highlightLines[f] !== undefined) {

                var los = this.in.LOS.v(f)
                var A = los.position.clone();
                var fwd = los.heading.clone();
                var B = A.clone()


                var scale;

                if (this.clipSeaLevel && fwd.y < 0)
                    scale = -A.y / fwd.y // flat earth, close enough as when used will only be a few miles
                else
                    scale = metersFromMiles(this.LOSLengthMiles)

                fwd.multiplyScalar(scale)
                B.add(fwd)
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