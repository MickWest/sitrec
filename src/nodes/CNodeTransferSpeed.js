import {CNodeTrack, trackLength} from "./CNodeTrack";

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