// A CNodeSprarseTrack contains an array of Vector3 positions and frame numbers
// for example, like the points extracted from a KML file
// It's "sparse" because it's not got a point for every frame
// instead we can interpolate/extrapolate it using  variety of methiods.


import {getKMLTrackWhenCoord} from "../KMLUtils";
import {CNodeEmptyArray} from "./CNodeArray";
import * as THREE from "three";
import {CNode} from "./CNode";

class CNodeSparseTrack extends CNode {
    constructor(v) {
        super(v);
        this.length = v.times.length;
        assert(v.times.length === v.positions.length, "CNodeSparseTrack array length mismatch, times="+v.times.length+", positions="+v.positions.length)
        this.frameNumbers = v.frameNumbers            // an array of frameNumbers
        this.positions = v.positions    // an array of positions
    }
}

export function MakeSparseTrackFromKML(kml) {
    let i;
    const times = []
    const LLApositions = []
    const positions = []
    getKMLTrackWhenCoord(kml, times, LLApositions)

    // positions are LLA, so convert to ESU
    for (let i = 0; i<times.length; i++) {
        positions.push(LLAVToEUS(LLApositions[i]))
    }

    // Times are absolute ms, so convert to frame numbers based in the sitch start time
    const msStartTime = this.in.startTime.getStartTimeValue();
    for (i = 0; i<times.length; i++) {
        times.push(Math.floor(Sit.fps * (times[i]-msStartTime)/1000))
    }

    return new CNodeSparseTrack({
        frameNumbers: frameNumbers,
        positions: positions,
    })
}

// a spline track takes a sparse track and applies a spline interpolation to it
// similar to the spline editor, but just raw data.
class CNodeSplineTrack extends CNodeEmptyArray{
    constructor(v) {
        super(v);
        this.input("sparse")
        this.curveType = v.curveType ?? "chordal";
        recalculate()


    }

    recalculate() {
        this.spline = new THREE.CatmullRomCurve3(this.positions);
        // 'chordal' gives a smooth velocity across the segment.
        this.spline.curveType = this.curveType; // centripetal, chordal, catmullrom
    }

    // Duplicated from SplineEditor.js
    // gets the length of the spline in meters stepping along it in numSteps
    getLength(numSteps) {
        var len = 0;
        var lastPos = new THREE.Vector3()
        var pos = new THREE.Vector3()
        const spline = this.spline
        spline.getPoint(0,lastPos)

        for (var i=1;i<numSteps;i++){
            var t = i/(numSteps-1) // go from 0 to 1, so we need steps-1 for the last one
            spline.getPoint(t,pos)
            len += pos.clone().sub(lastPos).length()
            lastPos.copy(pos)
        }

        return len;
    }


}
