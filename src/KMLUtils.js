// parseXML from https://stackoverflow.com/questions/4200913/xml-to-javascript-object
import {assert,f2m} from "./utils";
import {Sit} from "./Globals";

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
    if (lines[4] == "2" && lines [8] == "3") {
        return parseSRT2(lines)
    }



    return parseSRT1(lines)
}




/* Type 2 is like:
1
00:00:00,000 --> 00:00:01,000
F/2.8, SS 1950.57, ISO 100, EV 0, DZOOM 1.000, GPS (-121.1689, 38.7225, 21), D 118.43m, H -1.50m, H.S 0.00m/s, V.S -0.00m/s

2
00:00:01,000 --> 00:00:02,000
F/2.8, SS 1950.57, ISO 100, EV 0, DZOOM 1.000, GPS (-121.1689, 38.7225, 21), D 118.46m, H -1.50m, H.S 0.22m/s, V.S -0.00m/s

3
00:00:02,000 --> 00:00:03,000
F/2.8, SS 1950.57, ISO 100, EV 0, DZOOM 1.000, GPS (-121.1689, 38.7225, 21), D 118.47m, H -1.60m, H.S 0.41m/s, V.S -0.00m/s

 */

// things that
const SRTMap = {
    "F/":SRT.fnum,
    "SS ":SRT.shutter,
    "ISO ": SRT.iso,
    "EV " : SRT.ev,
    "H ": SRT.rel_alt
}

export function parseSRT2(lines) {
    const numPoints = Math.floor(lines.length / 4);
    let SRTArray = new Array(numPoints);

    const startTime = new Date(Sit.startTime);

    for (let i = 0; i < numPoints; i++) {
        let dataIndex = i * 4;
        const frameTimeString = lines[dataIndex + 1].split(' --> ')[0];
    //    console.log(frameTimeString)
        const date = convertToRelativeTime(startTime,frameTimeString)
        console.log(date)
        SRTArray[i] = new Array(SRTFields).fill(null);
        SRTArray[i][SRT.date] = date;
//        const frameInfo = lines[dataIndex + 2].split(', ')
        const frameInfo = splitOnCommas(lines[dataIndex + 2])
        // Extract frame information
        frameInfo.forEach(info => {
            //console.log("# "+info)
            var gotInfo = false;
            for (let start in SRTMap) {
                if (info.startsWith(start)) {
                    let value = info.substring(start.length);
             //       console.log(info+" - Set mapped field "+SRTMap[start] + " to "+value )

                    SRTArray[i][SRTMap[start]] = value;
                    gotInfo = true;
                    break;
                }
            }
            if (!gotInfo && info.startsWith("GPS ")) {
                let value = info.substring(4); // 4 is len of "GPS "
                const lla = extractLLA(value)
                console.log (lla.latitude + ","+lla.longitude+","+lla.altitude)
                SRTArray[i][SRT.latitude] = lla.latitude
                SRTArray[i][SRT.longitude] = lla.longitude
                SRTArray[i][SRT.abs_alt] = Sit.startAltitude + SRTArray[i][SRT.abs_alt];

            }
        });
        SRTArray[i][SRT.focal_len] = 100
 //       console.log(SRTArray[i])


    }


    return SRTArray;

}

function splitOnCommas(str) {
    // Regular expression to match commas that are not inside parentheses
    const regex = /,(?![^\(\)]*\))/g;
//    return str.split(regex).map(s => s.trimStart());
  // remove leading zeros and trailing "m" (for meters)
    return str.split(regex).map(s => s.trimStart().replace(/m$/, ''));

}

// extract lla from something like "(-121.1689, 38.7225, 21)"
function extractLLA(str) {
    const regex = /(-?\d+\.\d+|\d+)/g;
    const matches = str.match(regex);

    if (matches && matches.length === 3) {
        const longitude = parseFloat(matches[0]);
        const latitude = parseFloat(matches[1]);
        const altitude = parseFloat(matches[2]);

        return { latitude, longitude, altitude };
    } else {
        return null; // or handle the error as needed
    }
}

// startTime is a Date object, like new Date(Sit.startTime)
function convertToRelativeTime(startTime, relativeTimeString) {

    // Split the relative time string by comma to separate time and milliseconds
    const parts = relativeTimeString.split(',');

    // Further split the time part into hours, minutes, and seconds
    const timeParts = parts[0].split(':');

    // Extract hours, minutes, seconds, and milliseconds
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = parseInt(timeParts[2], 10);
    const milliseconds = parseInt(parts[1], 10);

    const relativeTime = new Date(startTime)

    // Add hours, minutes, seconds, and milliseconds to the start time
    relativeTime.setHours(startTime.getHours() + hours);
    relativeTime.setMinutes(startTime.getMinutes() + minutes);
    relativeTime.setSeconds(startTime.getSeconds() + seconds);
    relativeTime.setMilliseconds(startTime.getMilliseconds() + milliseconds);

    return relativeTime;
}
export function parseSRT1(lines) {
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

/*
time(millisecond)
datetime(utc)
latitude
longitude
height_above_takeoff(feet)
height_above_ground_at_drone_location(feet)
ground_elevation_at_drone_location(feet)
altitude_above_seaLevel(feet)
height_sonar(feet)
speed(mph)
distance(feet)
mileage(feet)
satellites
gpslevel
voltage(v)
max_altitude(feet)
max_ascent(feet)
max_speed(mph)
max_distance(feet)
xSpeed(mph)
ySpeed(mph)
zSpeed(mph)
compass_heading(degrees)
pitch(degrees)
roll(degrees)
isPhoto
isVideo
rc_elevator
rc_aileron
rc_throttle
rc_rudder
rc_elevator(percent)
rc_aileron(percent)
rc_throttle(percent)
rc_rudder(percent)
gimbal_heading(degrees)
gimbal_pitch(degrees)
gimbal_roll(degrees)
battery_percent
voltageCell1
voltageCell2
voltageCell3
voltageCell4
voltageCell5
voltageCell6
current(A)
battery_temperature(f)
altitude(feet)
ascent(feet)
flycStateRaw
flycState
message
*/


function findColumn(csv, text) {
    // Check if the csv is a non-empty array
    if (!Array.isArray(csv) || csv.length === 0 || !Array.isArray(csv[0])) {
        throw new Error("Invalid input: csv must be a non-empty 2D array.");
    }

    // Iterate through each column of the first row
    for (let col = 0; col < csv[0].length; col++) {
        // Check if the first element of the column starts with the text
        if (csv[0][col].startsWith(text)) {
            return col; // Return the column index
        }
    }

    // Throw an error if no column starts with the given text
    throw new Error("No column found starting with the specified string.");

}

function parseUTCDate(dateStr) {
    // Split the date and time parts
    const [datePart, timePart] = dateStr.split(' ');

    // Split the date into month, day, and year
    const [year, month, day] = datePart.split('-').map(num => parseInt(num, 10));

    // Adjust month value for JavaScript Date (0-indexed)
    const adjustedMonth = month - 1;

    // Split the time into hours, minutes, seconds, and AM/PM
    const [time, modifier] = timePart.split(' ');
    let [hours, minutes, seconds] = time.split(':').map(num => parseInt(num, 10));

    // // Convert 12-hour format to 24-hour format
    // if (hours === 12) {
    //     hours = modifier.toUpperCase() === 'AM' ? 0 : 12;
    // } else if (modifier.toUpperCase() === 'PM') {
    //     hours += 12;
    // }

    // Create a new Date object in UTC
    return new Date(Date.UTC(year, adjustedMonth, day, hours, minutes, seconds));
}

// take a csv file, which is a 2d array [row][col]
// the header row indicated wih
export function parseCSVAirdata(csv) {
    const rows = csv.length;
    let SRTArray = new Array(rows-1);
    try {
        const timeCol = findColumn(csv,"time(milli")
        const dateCol = findColumn(csv,"datetime")
        const latCol = findColumn(csv,"latitude")
        const lonCol = findColumn(csv,"longitude")
        const altCol = findColumn(csv, "altitude_above_seaLevel(feet)")


        const startTime = parseUTCDate(csv[1][dateCol])
        console.log("Detected Airdata start time of "+startTime)

        for (let i=1;i<rows;i++) {
            SRTArray[i-1] = new Array(SRTFields).fill(null);

            SRTArray[i-1][SRT.date] = addMillisecondsToDate(startTime, Number(csv[i][timeCol]));

            SRTArray[i-1][SRT.latitude] = Number(csv[i][latCol])
            SRTArray[i-1][SRT.longitude] = Number(csv[i][lonCol])
            SRTArray[i-1][SRT.abs_alt] = (Sit.adjustAltitude??0) + f2m(Number(csv[i][altCol]));
            SRTArray[i-1][SRT.focal_len] = 100
        }

    } catch (error) {
        console.error(error.message)
    }

    return SRTArray;

}

function addMillisecondsToDate(date, ms) {
    // Get the current time in milliseconds
    const currentTime = date.getTime();

    // Add the specified number of milliseconds
    const newTime = currentTime + ms;

    // Create a new Date object with the new time
    return new Date(newTime);
}
