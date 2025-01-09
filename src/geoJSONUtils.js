import {MISB, MISBFields} from "./MISBUtils";

export class CGeoJSON {

    constructor() {
        this.json = {
            type: "FeatureCollection",
            totalFeatures: 0,
            features: [],
        }
    }

    // Example of a point in the geoJSON
// {
//     "type": "Feature",
//     "id": "FNJANJANJFSANNFJSA_thesearejustpointids",
//     "geometry": {
//         "type": "Point",
//         "coordinates": [30.1234, -85.1234, 1000.1234]
//     },
//     "geometry_name": "Location",
//     "properties": {
//         "thresherId": "dfjlsadjfjdsafjsdjkfls"
//         "dtg": "2024-02-24T16:40:00.123Z",
//         "lat": 30.1234567890123,
//         "lon": -85.1234567890123,
//         "alt": 1000.12345678901,
//         "otherProp": "hello"
//     }
// },

    addPoint(trackID, lat, lon, alt, datetime) {
        this.json.features.push({
            type: "Feature",
            id: trackID + "_" + this.json.totalFeatures,
            geometry: {
                type: "Point",
                coordinates: [lat, lon, alt],
            },
            geometry_name: "Location",
            properties: {
                thresherId: trackID,
                dtg: new Date(datetime).toISOString(),
                lat: lat,
                lon: lon,
                alt: alt,
                otherProp: "sitrec"
            }
        });
        this.json.totalFeatures++;
    }


    countTracks() {
        // the number of tracks is the number of unique thresherIds
        this.thresherIds = new Set();
        for (let i = 0; i < this.json.totalFeatures; i++) {
            this.thresherIds.add(this.json.features[i].properties.thresherId);
        }
        return this.thresherIds.size;
    }

    // get the trackID of the indexed track
    trackID(trackIndex = 0) {
        const tracks = this.countTracks();
        console.assert(tracks > trackIndex, "Not enough tracks to get track " + trackIndex + " of " + tracks);
        return Array.from(this.thresherIds)[trackIndex];
    }


    // extract a single track from the geoJSON and return it as an array of MISB data
    // sort the array by time stamp (probabyl not needed, but it's a good idea to be more robust)
    toMISB(trackIndex = 0) {

        // ignore the value in this.json.totalFeatures, as it's not always accurate
        // generate it from the length of the features array
        this.json.totalFeatures = this.json.features.length

        const tracks = this.countTracks();
        console.assert(tracks > trackIndex, "Not enough tracks to export track " + trackIndex + " of " + tracks);

        // get the id of the indexed track from the set of thresherIds
        const trackID = Array.from(this.thresherIds)[trackIndex];


        const misb = []
        // iterate over the features in the geoJSON
        // if the thresherId matches the trackID, add it to the misb array
        let trackPointIndex = 0;
        for (let i = 0; i < this.json.totalFeatures; i++) {
            if (this.json.features[i].properties.thresherId === trackID) {
                // get lat, lon, alt from the properties
                const lat = this.json.features[i].properties.lat;
                const lon = this.json.features[i].properties.lon;
                const alt = this.json.features[i].properties.alt;

                // dtg is a string, convert it to a number
                const _time = new Date(this.json.features[i].properties.dtg).getTime();
                misb[trackPointIndex] = new Array(MISBFields);
                misb[trackPointIndex][MISB.UnixTimeStamp] = _time
                misb[trackPointIndex][MISB.SensorLatitude] = lat
                misb[trackPointIndex][MISB.SensorLongitude] = lon
                misb[trackPointIndex][MISB.SensorTrueAltitude] = alt
                trackPointIndex++;
            }
        }

        // sort the loaded misb array by time stamp (in ms)
        misb.sort((a, b) => a[MISB.UnixTimeStamp] - b[MISB.UnixTimeStamp]);

        return misb
    }


}
