import {CNodeEmptyArray} from "./CNodeArray";
import {f2m} from "../utils";
import {GlobalDateTimeNode} from "../Globals";
import {EUSToLLA} from "../LLA-ECEF-ENU";

export class CNodeTrack extends CNodeEmptyArray {
    constructor(v) {
        super(v);
    }

    exportTrackCSV() {
        let csv = "Frame,time,Lat,Lon,Alt\n"
        let pos = this.v(0)
        if (pos === undefined || pos.position === undefined) {
            console.error("No position data to export")
            return
        }
        for (let f=0;f<this.frames;f++) {

            pos=this.v(f)
            const LLA = EUSToLLA(pos.position)

            const time = GlobalDateTimeNode.frameToMS(f)

//        csv += f + "," + (pos[0]) + "," + (pos[1]) + "," + f2m(pos[2]) + "\n"
            csv += f + "," + time+ ","+LLA.x + "," + LLA.y + "," + LLA.z + "\n"
        }
        saveAs(new Blob([csv]), "trackFromMISB-"+this.id+".csv")
    }


}



export function trackLength(node) {
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



