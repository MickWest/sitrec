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

    makeArrayForTrackDisplay() {
        var points = this.data.length
        for (var f=0;f<points;f++) {
//            var pos = LLAToEUS(this.coord[f].lat, this.coord[f].lon, this.coord[f].alt)
            var pos = LLAToEUS(this.data[f].lla.lat, this.data[f].lla.lon, this.data[f].lla.alt)
            this.array.push({position:pos})
        }
        this.frames = points;

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
        this.array = []; // EUS coordinates used for rendering the track
        this.data = [] // replacing times and coords with data

        const _times = []
        const _coord = []
        this.info = {}

        getKMLTrackWhenCoord(this.kml, _times, _coord, this.info)
        console.log ("KML Track name = "+this.info.name)

        for (let i = 0; i<_times.length; i++) {
            this.data.push({
                time: _times[i],
                lla: _coord[i],
            })
        }

        this.makeArrayForTrackDisplay()
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
        this.data = [];

        this.info = {name:"xxxxx"} // TODO get filename?
     //   getKMLTrackWhenCoord(this.kml, this.times, this.coord, this.info)

        for (let i = 0; i<this.srt.length; i++) {

            // if Date.parse is given a Date object, then it will round it to the nearest second
            // (likely because it's reinterpreting the local-format time string, with no ms)
            // so if it's a date object just use it the getTime() directly.
            const time =
                (typeof this.srt[i][SRT.date] === 'string')
                    ? Date.parse(this.srt[i][SRT.date])
                    : this.srt[i][SRT.date].getTime()

            const lla = {
                lat: Number(this.srt[i][SRT.latitude]),
                lon: Number(this.srt[i][SRT.longitude]),
                alt: Number(this.srt[i][SRT.abs_alt]),
            }

            this.data.push({
                time: time,
                lla: lla,
                focal_len: Number(this.srt[i][SRT.focal_len])
            })

        }

        this.makeArrayForTrackDisplay()
    }
}