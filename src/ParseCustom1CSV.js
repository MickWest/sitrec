// take a csv file, which is a 2d array [row][col]
// the header row indicated wih
import {findColumn, parseISODate, parseUTCDate} from "./ParseUtils";
import {MISB, MISBFields} from "./MISBUtils";

export function parseCustom1CSV(csv) {
    const rows = csv.length;
    let MISBArray = new Array(rows - 1);
    // try {
        const dateCol = findColumn(csv, "TIME", true)
        const latCol = findColumn(csv, "LAT", true)
        const lonCol = findColumn(csv, "LONG", true)
        const altCol = findColumn(csv, "ALTITUDE", true)
        const aircraftCol = findColumn(csv, "AIRCRAFT", true)
        const callsignCol = findColumn(csv, "CALLSIGN", true)

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

            MISBArray[i - 1][MISB.PlatformTailNumber] = csv[i][callsignCol]
            MISBArray[i - 1][MISB.PlatformDesignation] = csv[i][aircraftCol]

            // NO FOV
            MISBArray[i - 1][MISB.SensorVerticalFieldofView] = 0

        }

    // } catch (error) {
    //     console.error(error.message)
    // }

    return MISBArray;

}