// The "from" track controls the position on the "to" track
// by picking the point on "to" that is closest to "from
import {CNodeArray} from "./CNodeArray";

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

}