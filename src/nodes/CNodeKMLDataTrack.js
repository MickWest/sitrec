import {CNodeEmptyArray} from "./CNodeArray";
import {FileManager} from "../CManager";
import {getKMLTrackWhenCoord, SRT} from "../KMLUtils";
import {LLAToEUS} from "../LLA-ECEF-ENU";
import {assert} from "../utils";

// a timed track has an arbitary set of LLA (and EUS?) points with timestamps
// For example, an ADS-B track that might be hours long,
// but we only want a part of it.
// Or maybe an SRT file from a DJI drone, which is often per-frame, but again we might not want all of it

class CNodeTimedTrack extends CNodeEmptyArray {
    constructor(v) {
        super(v);

    }

}

// Stores the original KML data points
export class CNodeKMLDataTrack extends CNodeTimedTrack {
    constructor(v) {
        super(v);
        this.kml = FileManager.get(v.KMLFile)
        this.recalculate()
    }

    recalculate() {
        this.array = [];

        this.times = []
        this.coord = []
        this.info = {}
        getKMLTrackWhenCoord(this.kml, this.times, this.coord, this.info)
        console.log ("KML Track name = "+this.info.name)
        var points = this.times.length
        assert(this.times.length === this.coord.length, "KML times and points different number")
        for (var f=0;f<points;f++) {
            var pos = LLAToEUS(this.coord[f].lat, this.coord[f].lon, this.coord[f].alt)
            this.array.push({position:pos})
        }
        this.frames = points;
    }
}


// Same but from parse SRT data
export class CNodeSRTDataTrack extends CNodeTimedTrack {
    constructor(v) {
        super(v);
        this.srt = FileManager.get(v.dataFile)
        this.recalculate()
    }

    recalculate() {
        this.array = [];

        this.times = []
        this.coord = []
        this.info = {name:"xxxxx"} // TODO get filename?
     //   getKMLTrackWhenCoord(this.kml, this.times, this.coord, this.info)

        for (let i = 0; i<this.srt.length; i++) {
            this.times.push(Date.parse(this.srt[i][SRT.date]))
            this.coord.push({
                lat: Number(this.srt[i][SRT.latitude]),
                lon: Number(this.srt[i][SRT.longitude]),
                alt: Number(this.srt[i][SRT.abs_alt]),

            })
        }


        var points = this.times.length
        assert(this.times.length === this.coord.length, "KML times and points different number")
        for (var f=0;f<points;f++) {
            var pos = LLAToEUS(this.coord[f].lat, this.coord[f].lon, this.coord[f].alt)
            this.array.push({position:pos})
        }
        this.frames = points;
    }
}