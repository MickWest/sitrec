//
import {guiShowHide, Sit} from "../Globals";
import {dispose} from "../threeExt";
import {LineGeometry} from "three/addons/lines/LineGeometry.js";
import {LineMaterial} from "three/addons/lines/LineMaterial.js";

import {Line2} from "three/addons/lines/Line2.js";
import {CNode3DGroup} from "./CNode3DGroup";
import {wgs84} from "../LLA-ECEF-ENU";
import {drop} from "../SphericalMath";
import {AlwaysDepth, Color, LessDepth} from "three";
import {CNodeDisplayTargetSphere} from "./CNodeDisplayTargetSphere";
import * as LAYER from "../LayerMasks";
import {assert} from "../assert.js";
import {convertColorInput} from "../ConvertColorInputs";
import {par} from "../par";

export class CNodeDisplayTrack extends CNode3DGroup {
    constructor(v) {
        v.layers ??= LAYER.MASK_HELPERS;
        super(v);

        // convert any color inputs to Color objects
        convertColorInput(v,"color",this.id)
        convertColorInput(v,"badColor",this.id)
        convertColorInput(v,"secondColor",this.id)
        convertColorInput(v,"dropColor",this.id)

        // newer method - allow input nodes to be declared outside the inputs object
        // and automatically convert constant inputs to CConstantNodes
        this.input("track") // track contains position, and optionally color
        this.input("color") // or color can be supplied in a seperate node
        this.optionalInputs(["badColor", "secondColor"]) // to be used if a segment is flagged as "bad"
        this.input("width") // Width currently only working as a constant (v0 is used)

        this.optionalInputs(["dropColor"])

        this.ignoreAB = v.ignoreAB ?? false;

    //    assert(this.in.track.p(0) !== undefined, "CNodeDisplayTrackPosition needs input with position")

        this.frames = v.frames ?? this.in.track.frames;
        this.useSitFrames = this.in.track.useSitFrames;

        this.trackGeometry = null
        this.trackLine = null

        this.toGroundGeometry = null
        this.toGroundLine = null


        this.toGround = v.toGround

        this.depthFunc = v.depthFunc ?? LessDepth;

        // functions are strings in new sitches
        if (this.depthFunc === "AlwaysDepth") this.depthFunc = AlwaysDepth;

        if (v.autoSphere) {
            new CNodeDisplayTargetSphere({
                id: this.id+"_autoSphere",
                inputs: {
                    track: this.in.track,
//                    size: new CNodeScale(this.id+"_sizeScaledAuto", scaleF2M,
//                        new CNodeGUIValue({value:Sit.targetSize,start:1,end:2000, step:0.1, desc:"Target size ft"},gui)
//                    )
                },
                size: v.autoSphere,
                color: this.in.color.v0,
                layers: LAYER.MASK_HELPERS,
            })
        }
        
        this.recalculate()
    }

    update() {
        // recalculate, so we
      //  this.recalculate()
    }

    dispose() {
        this.group.remove(this.trackLine)
        this.group.remove(this.toGroundLine)
        dispose(this.trackGeometry)
        super.dispose();
    }

    recalculate() {
        this.group.remove(this.trackLine)
        this.group.remove(this.toGroundLine)
        const line_points = [];
        const toGround_points = [];
        const line_colors = [];
        assert(this.inputs.track !== undefined, "CNodeDisplayTrack: track input is undefined, id="+this.id)
        for (var f = 0; f < this.frames; f++) {
            let trackPoint = this.in.track.v(f)
            assert(trackPoint !== undefined, "CNodeDisplayTrack: trackPoint is undefined, id="+this.id+" frame="+f)

            // if it's a vector3 (e.g. from a fixed position), then fake the trackPoint structure
            if (trackPoint.x !== undefined) {
                trackPoint = {position: trackPoint}
            }

            // we skip over undefined points, so we can display tracks that
            // don't fully have all the data
            // like if we got a track from ADSBX, but stopped it in the middle of the video segments
            // instead of playing it past the end.
            // also skips over invalid points, which will return trackPoint = {},
            // so we use .? to check both trackPoint being valid, and trackPoint.position being valid
            if (trackPoint?.position !== undefined) {

                var A = trackPoint.position
                assert(!isNaN(A.x) && !isNaN(A.y) && !isNaN(A.z), "CNodeDisplayTrack: trackPoint has NaNs in position, id=" + this.id + " frame=" + f);

                line_points.push(A.x, A.y, A.z);
                var color = trackPoint.color // the track itself can override the color defaults
                if (color === undefined) {
          //         if (f <= par.frame || this.in.secondColor === undefined)
                        color = this.in.color.v(f)
          //          else
          //              color = this.in.secondColor.v(f)

                    if (trackPoint.bad)
                        if (this.in.badColor !== undefined)
                            color = this.in.badColor.v(f) // display can specify a "bad" color
                        else
                            color = {r: 1, g: 0, b: 0};  // "bad" default color is red
                }

                if (!this.ignoreAB && (f < Sit.aFrame || f > Sit.bFrame)) {
                    if (this.in.secondColor !== undefined)
                        color = this.in.secondColor.v(f)
                    else
                        color = {r: 0.25, g: 0.25, b: 0.25}
                }

                color = new Color(color)

                line_colors.push(color.r, color.g, color.b)
                var dropColor;
                if (this.in.dropColor === undefined) {
                    // if no color give, then use the main color * 0.75
                    dropColor = {r: color.r * 0.75, g: color.g * 0.75, b: color.b * 0.75}
                } else {
                    dropColor = this.in.dropColor.v(f)
                }

                if (this.toGround !== undefined && this.toGround > 0) {
                    if (f % this.toGround === 0) {

                        var groundY = 0 - drop(A.x, A.z, wgs84.RADIUS)

                        /*
                        // same point new color
                        line_points.push(A.x, A.y, A.z);
                        line_colors.push(dropColor.r, dropColor.g/2, dropColor.b/2)

                        // down and back again in new color
                        line_points.push(A.x, groundY, A.z);
                        line_points.push(A.x, A.y, A.z);
                        line_colors.push(dropColor.r/2, dropColor.g/2, dropColor.b/2)
                        line_colors.push(dropColor.r/2, dropColor.g/2, dropColor.b/2)

                        // original point in old color
                        line_points.push(A.x, A.y, A.z);
                        line_colors.push(color.r, color.g, color.b)
    */
                        toGround_points.push(A.x, A.y, A.z)
                        toGround_points.push(A.x, groundY, A.z)

                    }
                }
            }
        }
        dispose(this.trackGeometry)
        this.trackGeometry = new LineGeometry();



        assert(line_points.length > 0, "CNodeDisplayTrack: no points in track "+this.id)

        // find the mid point of line_points, and make the track relative to that
        var mid = {x: 0, y: 0, z: 0}
        for (var i = 0; i < line_points.length; i += 3) {
            mid.x += line_points[i]
            mid.y += line_points[i + 1]
            mid.z += line_points[i + 2]
        }
        mid.x /= line_points.length / 3
        mid.y /= line_points.length / 3
        mid.z /= line_points.length / 3

        for (var i = 0; i < line_points.length; i += 3) {
            line_points[i] -= mid.x
            line_points[i + 1] -= mid.y
            line_points[i + 2] -= mid.z
        }


        this.trackGeometry.setPositions(line_points);
        this.trackGeometry.setColors(line_colors);

//        var material1 = this.in.color.v(0)

        var width = 1
        if (this.in.width != undefined)
            width = this.in.width.v0

        var matLineTrack = new LineMaterial({

            color: 0xffffff,
         //   color: 0xff0000,
            linewidth: width, // in world units with size attenuation, pixels otherwise
            vertexColors: true,

            //resolution:  // to be set by this.renderer, eventually
            dashed: false,
            alphaToCoverage: false, // haivng this as true gives little end-of-segment artifacts

   //         depthTest: true,
   //         depthWrite: true,
            depthFunc: this.depthFunc,

        });

        matLineTrack.resolution.set(window.innerWidth, window.innerHeight)

        this.trackLine = new Line2(this.trackGeometry, matLineTrack);

        this.trackLine.computeLineDistances();
        this.trackLine.scale.set(1, 1, 1);

        // position this object at the mid point of the track, the track vertices are relative to this point
        // for precision
        this.trackLine.position.set(mid.x, mid.y, mid.z)

        this.group.add(this.trackLine);

        /*
        if (this.toGround !== undefined) {
            dispose(this.toGroundGeometry)
            this.toGroundGeometry = new LineGeometry();
            this.toGroundGeometry.setPositions(toGround_points);
          //  const wireframe = new WireframeGeometry2(this.toGroundGeometry)
          //  this.toGroundLine = new LineSegments(wireframe, matLineTrack);
            this.toGroundLine = new LineSegments(wireframe, matLineTrack);

            this.group.add(this.toGroundLine);
        }
*/
        this.propagateLayerMask()
    }
}

