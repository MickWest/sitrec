// take a csv file, which is a 2d array [row][col]
// the header row indicated wih
import {findColumn, parseISODate} from "./ParseUtils";
import {MISB, MISBFields} from "./MISBUtils";


// For a custom format we have a list of acceptable column headers
// for the various needed fields
// we need at least time, lat, lon, and alt
const CustomCSVFormats = {
    CUSTOM1: {
        time:     ["TIME", "TIMESTAMP", "DATE"],
        lat:      ["LAT", "LATITUDE"],
        lon:      ["LON", "LONG", "LONGITUDE"],
        alt:      ["ALTITUDE", "ALT", "ALTITUDE (m)*"],
        aircraft: ["AIRCRAFT", "AIRCRAFTSPECIFICTYPE"],
        callsign: ["CALLSIGN", "TAILNUMBER"]
    }
}




export function isCustom1(csv) {
    // CUSTOM1 is a custom track format exported from some database

    // csv[0] is the header row
    // given
    const headerValues= CustomCSVFormats.CUSTOM1;
    // we only need time, lat, lon, alt
    // we can ignore the rest
    if (findColumn(csv, headerValues.time, true) !== -1
        && findColumn(csv, headerValues.lat, true) !== -1
        && findColumn(csv, headerValues.lon, true) !== -1
        && findColumn(csv, headerValues.alt, true) !== -1
        && findColumn(csv, headerValues.aircraft, true) !== -1) {
        return true;
    }


    return false;
}

export function parseCustom1CSV(csv) {
    const rows = csv.length;
    let MISBArray = new Array(rows - 1);

    const headerValues= CustomCSVFormats.CUSTOM1;
    const dateCol =     findColumn(csv, headerValues.time, true)
    const latCol =      findColumn(csv, headerValues.lat, true)
    const lonCol =      findColumn(csv, headerValues.lon, true)
    const altCol =      findColumn(csv, headerValues.alt, true)
    const aircraftCol = findColumn(csv, headerValues.aircraft, true)
    const callsignCol = findColumn(csv, headerValues.callsign, true)

    // speed is currently ignored, and is generally derived from the position data
    const speedCol = findColumn(csv, "SPEED_KTS", true)

  //  const startTime = parseISODate(csv[1][dateCol])
  //  console.log("Detected Airdata start time of " + startTime)

    for (let i = 1; i < rows; i++) {
        MISBArray[i - 1] = new Array(MISBFields).fill(null);

        MISBArray[i - 1][MISB.UnixTimeStamp] = parseISODate(csv[i][dateCol]).getTime();

        MISBArray[i - 1][MISB.SensorLatitude] = Number(csv[i][latCol])
        MISBArray[i - 1][MISB.SensorLongitude] = Number(csv[i][lonCol])
        MISBArray[i - 1][MISB.SensorTrueAltitude] = Number(csv[i][altCol]);

        if (aircraftCol !== -1) {
            MISBArray[i - 1][MISB.PlatformDesignation] = csv[i][aircraftCol]
        }
        if (callsignCol !== -1) {
            MISBArray[i - 1][MISB.PlatformTailNumber] = csv[i][callsignCol]
        }
        if (speedCol !== -1) {
            MISBArray[i - 1][MISB.PlatformTrueAirspeed] = Number(csv[i][speedCol]);
        }

        // NO FOV
        //MISBArray[i - 1][MISB.SensorVerticalFieldofView] = 0

    }

    // } catch (error) {
    //     console.error(error.message)
    // }

    return MISBArray;

}