import {CNodeArray, CNodeEmptyArray} from "./CNodeArray";
import {f2m, getFileExtension, RollingAverage} from "../utils";
import {V3} from "../threeExt";
import {CatmullRomCurve3} from "../../three.js/build/three.module";
import {saveAs} from "../js/FileSaver";
import {CNodeDisplayTrack} from "./CNodeDisplayTrack";
import {CNodeTrackFromMISB} from "./CNodeTrackFromMISB";


import {FileManager, NodeMan} from "../Globals";
import {CNodeMISBDataTrack} from "./CNodeMISBData";
import {KMLToMISB} from "../KMLUtils";
import {assert} from "../utils";

export class CNodeTrack extends CNodeEmptyArray {
    constructor(v) {
        super(v);
    }
}

function trackLength(node) {
    const frames= node.frames;
    var len = 0
    var A = node.p(0)
    for (var i=1;i<frames;i++) {
        var B = node.p(i)
        len += B.clone().sub(A).length()
        A = B;
    }
    return len;
}

export class CNodeTransferSpeed extends CNodeTrack {
    constructor(v) {
        super(v);
        this.input("from")
        this.input("to")
        this.frames = this.in.from.frames
        this.recalculate()
    }

    recalculate() {
        var from = this.in.from;
        var to = this.in.to;
        var fromLen = trackLength(from)
        var toLen = trackLength(to)
        console.log("CNodeTransferSpeed: from len=" + fromLen + " to len = " + toLen)
        this.array = []
        var fp0 = from.p(0)
        var tp0 = to.p(0)
        var fromSum = 0; //
        var toSum = 0
        var toFrame = 0
        for (var fromFrame = 0; fromFrame < this.frames; fromFrame++) {


            // find how far along the FROM curve we are
            // and move that amount along the TO curve


            var fp1 = from.p(fromFrame)
            fromSum += fp1.clone().sub(fp0).length()
            // now we advance toFrame until the total length is past the fromSum
            // (as a fraction of the total length)
            // maybe do binary search

            var toAdvance = 0
            var tp1 = to.p(toFrame)
            while ((toSum + toAdvance) / toLen < fromSum / fromLen) {
                toFrame += 0.01; // fractional frame numbers are allowed
                tp1 = to.p(toFrame)
                toAdvance = tp1.clone().sub(tp0).length()
            }
            toSum += toAdvance
            tp0 = tp1;
            fp0 = fp1;
            this.array.push({position: tp0})
            // console.log(fromFrame+" -> "+toFrame+": "+fromSum+" -> "+toSum+" ("+fromLen+","+toLen+")")
            //this.array.push({position:from.p(i)})
        }


    }

}



// The "from" track controls the position on the "to" track
// by picking the point on "to" that is closest to "from
export class CNodeTrackClosest extends CNodeArray {
    constructor(v) {
        v.array = []
        super(v);
        this.input("from")
        this.input("to")
        this.frames = this.in.from.frames
        this.recalculate()
    }

    recalculate() {
        var from = this.in.from;
        var to = this.in.to;
        this.array = []
        var toFrame = 0
        for (var fromFrame = 0; fromFrame < this.frames; fromFrame++) {

            var fp0 = from.p(fromFrame)
            var tp0 = to.p(toFrame);
            var seekSpeed = 1
            var distance = tp0.clone().sub(fp0).length()

            //
            while (Math.abs(seekSpeed) > 0.001) {
                toFrame += seekSpeed
                tp0 = to.p(toFrame)
                var nextDistance = tp0.clone().sub(fp0).length()
                if (nextDistance > distance) {
                    // we got further away, so seek in the other direction at half the speed
                    // which will effectively do a binary search
                    seekSpeed = -seekSpeed / 2
                }
                distance = nextDistance;

//                if (fromFrame < 10) {
//                    console.log(distance+" "+seekSpeed)
//                }

            }

            if (fromFrame < this.frames - 1) {
                const push = tp0.clone().sub(fp0)

//                var fp1 = from.p(fromFrame+1)
//                var fwd = fp1.clone().sub(fp0).normalize()

                // pick which bit of the from path we want to be perpendicular to
                // patch here to ignore first 100 frames
                var fwdFrame = fromFrame
                if (fwdFrame < 101)
                    fwdFrame = 101
                var sp0 = from.p(fwdFrame)
                var sp1 = from.p(fwdFrame + 1)
                var fwd = sp1.clone().sub(sp0).normalize()

                // we want to make push orthogonal to fwd

                // component of push parallel to fwd
                var along = fwd.clone().multiplyScalar(fwd.dot(push))
                push.sub(along)
                tp0 = fp0.clone().add(push)


                // var left = fwd.clone().cross(V3(0,1,0))
                // if (left.dot(push) > 0 )
                //     left.multiplyScalar(push.length())
                // else
                //     left.multiplyScalar(-push.length())
                // tp0 = fp0.clone().add(left)

            }


            this.array.push({position: tp0.clone()})
            //this.array.push({position:from.p(i)})
        }


    }

} // given an array of "positions" smooth the x,y,and z tracks by moving average
// or other techniques
// optionally copy any other data (like color, fov, etc) to the new array

export class CNodeSmoothedPositionTrack extends CNodeEmptyArray {
    constructor(v) {
        super(v)
        this.method = v.method || "moving"
        this.input("source") // source array node
        if (this.method === "moving") {
            this.input("window") // amount to smooth (rolling average window size)
            this.optionalInputs(["iterations"])
        }

        this.frames = this.in.source.frames;

        if (this.method === "catmull") {
            // this.intervals = v.intervals ?? 10
            this.input("tension")
            this.input("intervals")
        }

        this.copyData = v.copyData ?? false;

        this.recalculate()

        this.exportable = v.exportable ?? false;
        if (this.exportable) {
            NodeMan.addExportButton(this, "exportTrackCSV", "Export Smoothed CSV ")
        }
    }


    exportTrackCSV() {
        let csv = "Frame,Lat,Lon,Alt\n"
        for (let f=0;f<this.frames;f++) {
            const pos = this.array[f].lla
            csv += f + "," + (pos[0]) + "," + (pos[1]) + "," + f2m(pos[2]) + "\n"
        }
        saveAs(new Blob([csv]), "trackSmoothed-"+this.id+".csv")
    }

    recalculate() {

        this.sourceArray = this.in.source.array;

        if (this.sourceArray === undefined) {
            // need to build it from source node, possibly calculating the values
            // this gives us a per-frame array of {position:...} type vectors
            // and the original data if we want to copy that
            this.sourceArray = []
            for (var i = 0; i < this.in.source.frames; i++) {
                if (this.copyData) {
                    const original = this.in.source.v(i);
                    // make a copy of the original object
                    // and add the smoothed position to it
                    const copy = {...original, position: this.in.source.p(i)};
                    this.sourceArray.push(copy)
                } else {
                    this.sourceArray.push({position: this.in.source.p(i)})
                }
            }
        }

        if (this.method === "moving") {

            const x = this.sourceArray.map(pos => pos.position.x)
            const y = this.sourceArray.map(pos => pos.position.y)
            const z = this.sourceArray.map(pos => pos.position.z)

            var window = this.in.window.v0
            var iterations = 1
            if (this.in.iterations)
                iterations = this.in.iterations.v0

//        console.log("Smooth = " + smooth)

            var xs, ys, zs;
            //     if (quickToggle("Smooth Derivative", false) === false) {
            xs = RollingAverage(x, window, iterations)
            ys = RollingAverage(y, window, iterations)
            zs = RollingAverage(z, window, iterations)
            //     } else {
            //         xs = smoothDerivative(x, smooth, iterations)
            //         ys = smoothDerivative(y, smooth, iterations)
            //         zs = smoothDerivative(z, smooth, iterations)
            //     }

            this.array = []
            for (var i = 0; i < x.length; i++) {
                    this.array.push({position: V3(xs[i], ys[i], zs[i])})
            }
            this.frames = this.array.length;
        } else {
            // Catmull!
            // here sourceArray is an array of {position:...} type vecrot
            // convert to a simple array of Vector3s at the desired interval
            var interval = Math.floor(this.frames / this.in.intervals.v0)
            var data = []
            for (var i = 0; i < this.frames; i += interval) {
                var splinePoint = this.sourceArray[i].position.clone()
        //        DebugSphere("SplinePoint" + i, splinePoint, 20, 0xff00ff)

                data.push(splinePoint)
            }
            this.spline = new CatmullRomCurve3(data);
            this.spline.tension = this.in.tension.v0;  // only has effect for catmullrom

            // for a track, we will want to use chordal
            // as it keeps the velocity smooth across a segment
            // the different methods only have significant other differences with sharp turns.
            this.spline.curveType = 'chordal';  // Possible values are centripetal, chordal and catmullrom.

            //   this.dump()

        }

    }

    getValueFrame(frame) {
        let pos;
        if (this.method === "moving") {
            pos = this.array[frame].position
        }
        else {
            pos = V3()
            var t = frame / this.frames
            this.spline.getPoint(t, pos)
            //       console.log(vdump(pos))
        }

        if (this.copyData) {
            return {
                ...this.sourceArray[frame], // might have other data, if copyData was set
                ...{position: pos}
            }
        } else {
            // just a bit quicker to not copy the data if we don't have to
            return {position: pos}
        }

    }


    dump() {

        if (this.spline !== undefined) {
            var out = ""

            out += "frame,t,x,y,z,v\n"
            var lastPos = V3()
            this.spline.getPoint(0, lastPos)
            for (var f = 1; f < this.frames; f++) {
                var pos = V3()
                var t = f / this.frames
                this.spline.getPoint(t, pos)

                var v = pos.clone().sub(lastPos).length()

                out += f + ",";
                out += t + ",";
                out += pos.x + ",";
                out += pos.y + ",";
                out += pos.z + ",";
                out += v + "\n";

                lastPos = pos


                // last line no comma, lf
                //out += data[8][f] + "\n"
            }

            saveAs(new Blob([out]), "gimbalSpline.csv")
        }
    }


}

// here I'm wanting to smooth at headings
//     put into one array? or an object????
//
// // given
// class CNodeSmoothElement extends CNode {
//     constructor(v) {
//         super(v);
//         this.input("data");
//         this.frames = this.in.data.frames;
//         this.key = v.key;
//         this.recalculate();
//     }
//
//
//     recalculate() {
//         const data = this.in.data;
//     }
//
//
//
// }


export class CNodeTrackAir extends CNodeTrack {
    constructor(v) {
        super(v);
        this.input("source")
        this.input("wind")
        this.frames = this.in.source.frames;
        this.fps = this.in.source.fps;
        this.recalculate()


    }

    recalculate() {
        this.array = []
        var totalWind = V3()
        for (var f=0;f<this.frames;f++) {
            this.array.push({position:this.in.source.p(f).sub(totalWind)})
            totalWind.add(this.in.wind.v(f))
        }
    }

    update(frame)  {
        var totalWind = V3()
        for (var f=0;f<frame;f++) {
            totalWind.add(this.in.wind.v(f))
        }

        // PATCH, if one outputs is a CNodeDisplayTrack
        // then move its group
        for (var output of this.outputs)
            if (output instanceof CNodeDisplayTrack) {
                output.group.position.copy(totalWind);
            }
    }
}

// given a source track and a start and end frame
// linearly interpolate all frames from that
export class CNodeInterpolateTwoFramesTrack extends CNodeTrack {
    constructor(v) {
        super(v);
        this.input("source")

        v.start ??= 0;
        v.end ??= this.in.source.frames-1;

        this.input("start")
        this.input("end")
        this.frames = this.in.source.frames;
        this.fps = this.in.source.fps;
    }

    getValueFrame(frame) {
        const startFrame = this.in.start.v()
        const endFrame = this.in.end.v()
        const startPos = this.in.source.p(startFrame)
        const endPos = this.in.source.p(endFrame)
        const step = endPos.clone().sub(startPos).divideScalar(endFrame-startFrame)
        const value = startPos.clone().add(step.clone().multiplyScalar(frame-startFrame))
        return {position:value}
    }


}


// given a source file id:
// first create a CNodeTimedData from whatever type of data it is (KML, SRT, etc)
// the create a track node from that
// Note, the track node might be recalculated, as it depends on the global start time
//
// sourceFile = the input, either a KLM file, or one already in MISB array format
// if it's a kml file we will first make a MISB array
// dataID = the id of the intermediate CNodeMISBDataTrack
export function makeTrackFromDataFile(sourceFile, dataID, trackID, columns) {

    // determine what type of track it is
    const fileInfo = FileManager.getInfo(sourceFile);
    const ext = getFileExtension(fileInfo.filename)

    let misb = null;

    if (ext === "kml") {
        // new CNodeKMLDataTrack({
        //     id: dataID,
        //     KMLFile: sourceFile,
        // })
        misb = KMLToMISB(FileManager.get(sourceFile));
    } else if (ext === "srt" || ext === "csv" || ext === "klv") {
        misb = FileManager.get(sourceFile)
    } else {
        assert(0, "Unknown file type: " + fileInfo.filename)
    }

    // first make a data track with id = dataID
    // from the misb array source
    // This will be an array of :
    // {
    // position: V3,
    // time: ms,
    // vFov: degrees, (optional)
    // misbRow: object reference to the original row in the MISB array

    new CNodeMISBDataTrack({
        id: dataID,
        misb: misb,
        exportable: true,
    })

    // then use that to make the per-frame track, which might just be a portion of the original data
    return new CNodeTrackFromMISB({
        id:trackID,
        misb: dataID,
        columns: columns,
        exportable: true,
    })

}
