import {CNodeEmptyArray} from "./CNodeArray";
import {GlobalDateTimeNode, NodeMan} from "../Globals";
import {EUSToLLA, LLAToEUS} from "../LLA-ECEF-ENU";
import {EventManager} from "../CEventManager";

export class CNodeTrack extends CNodeEmptyArray {
    constructor(v) {
        super(v);
    }

    exportTrackCSV() {
//         let csv = "Frame,time,Lat,Lon,Alt\n"
//         let pos = this.v(0)
//         if (pos === undefined || pos.position === undefined) {
//             console.error("No position data to export")
//             return
//         }
//         for (let f=0;f<this.frames;f++) {
//
//             pos=this.v(f)
//             const LLA = EUSToLLA(pos.position)
//
//             const time = GlobalDateTimeNode.frameToMS(f)
//
// //        csv += f + "," + (pos[0]) + "," + (pos[1]) + "," + f2m(pos[2]) + "\n"
//             csv += f + "," + time+ ","+LLA.x + "," + LLA.y + "," + LLA.z + "\n"
//         }
//         saveAs(new Blob([csv]), "trackFromMISB-"+this.id+".csv")
        this.exportArray();
    }

    // calculate min and max LLA extents of the track
    // from the ESU positions
    getLLAExtents() {
        let pos = this.v(0)
        if (pos === undefined || pos.position === undefined) {
            console.error("No position data to find extents of track");
            return
        }
        let minLat = 90
        let maxLat = -90
        let minLon = 180
        let maxLon = -180
        let minAlt = 1000000
        let maxAlt = -1000000
        for (let f=0;f<this.frames;f++) {
            pos=this.v(f)
            const LLA = EUSToLLA(pos.position)
            minLat = Math.min(minLat, LLA.x)
            maxLat = Math.max(maxLat, LLA.x)
            minLon = Math.min(minLon, LLA.y)
            maxLon = Math.max(maxLon, LLA.y)
            minAlt = Math.min(minAlt, LLA.z)
            maxAlt = Math.max(maxAlt, LLA.z)
        }
        return {minLat, maxLat, minLon, maxLon, minAlt, maxAlt}
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


export class CNodeTrackFromLLAArray extends CNodeTrack {
    constructor(v) {
        super(v);
        this.altitudeMode = v.altitudeMode ?? "absolute";


        // using events to recalculate the track when the terrain is loaded
        // which is more lightweight than recalculating all nodes
        // we just do this for nodes that are relative to the ground .0
        if (this.altitudeMode === "relativeToGround") {
            // Currently there's no facility for removing event listeners
            // they are just added and never removed
            // but are all cleared when a new sitch is loaded
            // possibly should have object responsible for removing their own listeners
            EventManager.addEventListener("terrainLoaded", () => this.recalculateCascade());
        }
    }


    setArray(array) {
        this.array = array;
        this.frames = this.array.length;
    }

    getValueFrame(frame) {
        const v = this.array[frame];
        const lat = v[0]
        const lon = v[1];
        const alt = v[2];
        let eus = LLAToEUS(lat, lon, alt);

        // while this is sub optimal, it shoudl not be done constantly.
        // it mostly for KML polygons and paths, which have no inputs, so are essentially static
        if (this.altitudeMode === "relativeToGround") {
            // need the altitude to be relative to the ground
            // get the terrain
            const terrainNode = NodeMan.get("TerrainModel", false);
            if (terrainNode !== undefined) {
                eus = terrainNode.getPointBelow(eus, alt, true)
            }


        }

        return {position: eus}
    }

    // p(frame) {
    //     const v = this.array[frame];
    //     const lat = v[0]
    //     const lon = v[1];
    //     const alt = v[2];
    //     const eus = LLAToEUS(lat, lon, alt);
    //     return {position: eus}
    // }
}




