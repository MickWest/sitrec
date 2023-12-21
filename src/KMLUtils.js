// parseXML from https://stackoverflow.com/questions/4200913/xml-to-javascript-object
import {assert} from "./utils";

export function parseXml(xml, arrayTags)
{
    var dom = null;
    if (window.DOMParser)
    {
        dom = (new DOMParser()).parseFromString(xml, "text/xml");
    }
    else if (window.ActiveXObject)
    {
        dom = new ActiveXObject('Microsoft.XMLDOM');
        dom.async = false;
        if (!dom.loadXML(xml))
        {
            throw dom.parseError.reason + " " + dom.parseError.srcText;
        }
    }
    else
    {
        throw "cannot parse xml string!";
    }

    function isArray(o)
    {
        return Object.prototype.toString.apply(o) === '[object Array]';
    }

    function parseNode(xmlNode, result)
    {
        if (xmlNode.nodeName == "#text") {
            var v = xmlNode.nodeValue;
            if (v.trim()) {
                result['#text'] = v;
//                    result = v;
            }
            return;
        }

        var jsonNode = {};
        var existing = result[xmlNode.nodeName];
        if(existing)
        {
            if(!isArray(existing))
            {
                result[xmlNode.nodeName] = [existing, jsonNode];
            }
            else
            {
                result[xmlNode.nodeName].push(jsonNode);
            }
        }
        else
        {
            if(arrayTags && arrayTags.indexOf(xmlNode.nodeName) != -1)
            {
                result[xmlNode.nodeName] = [jsonNode];
            }
            else
            {
                result[xmlNode.nodeName] = jsonNode;
            }
        }

        if(xmlNode.attributes)
        {
            var length = xmlNode.attributes.length;
            for(var i = 0; i < length; i++)
            {
                var attribute = xmlNode.attributes[i];
                jsonNode[attribute.nodeName] = attribute.nodeValue;
            }
        }

        var length = xmlNode.childNodes.length;
        for(var i = 0; i < length; i++)
        {
            parseNode(xmlNode.childNodes[i], jsonNode);
        }
    }

    var result = {};
    for (let i = 0; i < dom.childNodes.length; i++)
    {
        parseNode(dom.childNodes[i], result);
    }

    return result;
}

// Given a KML file, extract two array,
// "when" = timestamps in ms
// "coord" = LLA coordinates.

export function getKMLTrackWhenCoord(kml, when, coord, info) {



    // first extract the gx:Track into "when" and "coord" array
    // this differs based on file format

    // New FR24 format has:
    // kml.kml.Document.name.#text = "5X957/UPS957"  (for example)
    // kml.kml.Document.Folder[] contains two entries:
    // [0].name == "Route"
    // [1].name == "Trail
    // Trail has no timestamps, it's just the line, color coded for altitude
    // [0].Placemark = an array of:
    // [].TimeStamp.when = time in format: 2023-11-12T08:40:19+00:00
    // [].Point.coordinates.#text  =


    if (kml.kml.Document !== undefined) {
        if (kml.kml.Document.Folder !== undefined) {
            var route = kml.kml.Document.Folder[0]
            if (route.name["#text"] === "Route") {
                // FR24 format
                info.name = kml.kml.Document.name["#text"];
                const p = route.Placemark
                for (var i=0;i<p.length;i++) {
                    const date = p[i].TimeStamp.when["#text"]
                    when.push(Date.parse(date))

                    var c = p[i].Point.coordinates["#text"]
                    var cs = c.split(',')
                    var lon = Number(cs[0])
                    var lat = Number(cs[1])
                    var alt = Number(cs[2])
                    coord.push({lat: lat, lon: lon, alt: alt})
                }

                return;

            }
        }
    }

    // otherwise we assume it's

    var tracks;

    if (kml.kml.Document !== undefined) {
        // There is only one track in a FlightAware file
        // so dummmy up an array, so we can reuse the ADBS Exchange code
        if (Array.isArray(kml.kml.Document.Placemark)) {
            tracks = [kml.kml.Document.Placemark[2]]
            info.name = kml.kml.Document.name["#text"].split(" ")[2];
        } else {
            // some old format, used by Chilean
            tracks = [kml.kml.Document.Placemark]
            info.name = kml.kml.Document.Placemark.name["#text"];
        }
    } else {
        if (kml.kml.Folder.Folder !== undefined) {
            // ADSB Exchange
            tracks = kml.kml.Folder.Folder.Placemark
            info.name = kml.kml.Folder.Folder.name["#text"].split(" ")[0];
        } else {
            // exported from Google earth, maybe via ADSB Exchange
            tracks = kml.kml.Folder.Placemark.name["#text"];
        }
    }

    assert(info.name !== undefined && info.name !== "", "Unable to find name")

    tracks.forEach(track => {
        const gxTrack = track["gx:Track"];
        var whenArray;
        var coordArray;
        whenArray = gxTrack["when"]
        coordArray = gxTrack["gx:coord"]
        const len = whenArray.length;
        for (var i = 0; i < len; i++) {
            var w = whenArray[i]["#text"]
            var c = coordArray[i]["#text"]
            var cs = c.split(' ')
            var lon = Number(cs[0])
            var lat = Number(cs[1])
            var alt = Number(cs[2])
//                console.log(">>"+w+"    "+lat+","+lon+" - "+alt)
            when.push(Date.parse(w))  // whenArray is time in MS since 1970
            coord.push({lat: lat, lon: lon, alt: alt})
        }
    })


}

// DJI SRT format is in six lines:
// 3
// 00:00:00,032 --> 00:00:00,049
// <font size="28">FrameCnt: 3, DiffTime: 17ms
// 2023-12-17 15:27:55.313
// [iso: 100] [shutter: 1/640.0] [fnum: 3.4] [ev: 0] [color_md: default] [focal_len: 166.00] [latitude: 36.06571] [longitude: -119.01938] [rel_alt: 17.800 abs_alt: 134.835] [ct: 5896] </font>
// <blank line>

export const SRT = {
    FrameCnt: 0,
    DiffTime:1,
    iso:2,
    shutter:3,
    fnum:4,
    ev:5,
    color_md:6,
    focal_len:7,
    latitude:8,
    longitude:9,
    rel_alt:10,
    abs_alt:11,
    ct:12,
    date: 13,
}

const SRTFields = Object.keys(SRT).length;


export function parseSRT(data) {
    const lines = data.split('\n');
    const numPoints = Math.floor(lines.length / 6);
    let SRTArray = new Array(numPoints);

    for (let i = 0; i < numPoints; i++) {
        let dataIndex = i * 6;
        let frameInfo = lines[dataIndex + 2].split(', ');
        let detailInfo = lines[dataIndex + 4].match(/\[(.*?)\]/g);

        SRTArray[i] = new Array(SRTFields).fill(null);

        // Extract frame information
        frameInfo.forEach(info => {
            let [key, value] = info.split(': ');
        //    console.log(key +": "+value)
            if (SRT.hasOwnProperty(key)) {
                SRTArray[i][SRT[key]] = value.replace('ms', '').trim();
            }
        });

        // Extract detailed information
        detailInfo.forEach(info => {
            let details = info.replace(/[\[\]]/g, '');
            let tokens = details.split(' ');
            for (let j = 0; j < tokens.length; j += 2) {
                let key = tokens[j].replace(':', '');
                let value = tokens[j + 1];
      //          console.log(key +": "+value)

                if (SRT.hasOwnProperty(key)) {
                    SRTArray[i][SRT[key]] = value.trim();
                }
            }
        });

        // Extract date
        SRTArray[i][SRT['date']] = lines[dataIndex + 3].trim();
    //    console.log(SRTArray[i][SRT['date']])
    }

    return SRTArray;
}



