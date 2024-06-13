// Track of LOS intersection with the cloud horizon
// i.e. the point on on the LOS closes to the horizon viewed from the LOS start point in the direction of the LOS
import {CNodeArray, CNodeEmptyArray} from "./CNodeArray";
import {Raycaster} from "three";
import {vdump} from "../utils";
import {NodeMan} from "../Globals";
import {CNodeCloudData} from "./CNodeCloudData";

import {V3} from "../threeUtils";

export class CNodeLOSTraverseTerrain extends CNodeEmptyArray {
    constructor(v) {
        super(v);
        //   this.checkInputs(["LOS", "terrain"])
        this.input("LOS")
        this.input("terrain")
        this.recalculate()
    }

    recalculate() {
        this.array = []
        this.frames = this.in.LOS.frames

        var raycaster = new Raycaster();

        // the terrain group contains the meshes of the terrain
        // which we want to check for intersections
        var terrainGroup = this.in.terrain.getGroup()
        console.log(">>>>>>>>>> recalculating CNodeLOSTraverseTerrain id="+this.id+" group children = "+terrainGroup.children.length)


        // As this is expensive, we do every 60th frame (2 seconds)
        // then interpolate between them
        var step = 60
        var maxJump = 0;
        var intersectPoint
        var lastPos;
        for (var f = 0; f < this.frames; f += step) {
            var A = this.in.LOS.p(f)
            var fwd = this.in.LOS.v(f).heading.clone()

            raycaster.set(A, fwd)
            var intersects = raycaster.intersectObject(terrainGroup, true)
            //
            if (intersects.length > 0) {
                // first one is the closest
                intersectPoint = intersects[0].point.clone()
            } else {
                // should coilde with ground spehre if not hit terrain
                if (terrainGroup.children.length > 0) {
                    console.log("Frame: " + f + "A: " + vdump(A) + " fwd: " + vdump(fwd) + " terrain collide failed")
                    var intersects = raycaster.intersectObject(terrainGroup, true)
                    if (intersects.length == 0) {
                        console.log("STILL BAD")
                    }

                }
                // just returing a default value
                intersectPoint = V3(1,2,3)
            }

            /*
            if (f == 0) {
                lastPos = intersectPoint.clone();
            } else {
                var jump = lastPos.clone().sub(intersectPoint).length()
                if (jump > 774) {
                    console.log(f+ ": BIG JUMP "+jump);
                    console.log ("A: "+vdump(A)+" fwd: "+vdump(fwd)+" inter: "+vdump(intersectPoint))
                    debugger;
                }

//                if (f == 120)
//                    console.log ("A: "+vdump(A)+" fwd: "+vdump(fwd)+" inter: "+vdump(intersectPoint))


                lastPos = intersectPoint.clone();
                if (jump > maxJump) {
                    maxJump = jump;
                }
            }
*/

            this.array[f] = {position: intersectPoint}
        }
        console.log ("max Jump = "+maxJump)
        interpolateSteppedPositions(this.array, this.frames, step)

    }
}


// given an array of THREE vectors, a number of frames (the final size of the array)
// and a step
// assume that every (step) frames (starting at 0) we have a position
// then interpolate the intermediate positions
function interpolateSteppedPositions(a, frames, step) {
    for (var f = 0; f < frames; f += step) {
        let first = step * Math.floor(f / step)
        let last = first + step
        if (last >= frames) last = first // just repeat the last known frame as nothing to interpolate to
        var A = a[first].position
        var B = a[last].position
        var AB = B.clone().sub(A)
        var ABStep = AB.multiplyScalar(1 / step)
        var pos = A.clone()
        // start at 1 as the 0 position is the existing one we are interpolating from
        for (var i = 1; i < step; i++) {
            pos.add(ABStep)
            a[f + i] = {position: pos.clone()}
        }
    }
    ``
}