// take a csv file, which is a 2d array [row][col]
// the header row indicated wih
import { addMillisecondsToDate, findColumn, parseUTCDate } from './ParseUtils';
import { MISB, MISBFields } from './MISBUtils';
import { Sit } from './Globals';
import { f2m } from './utils';

export function parseAirdataCSV(csv) {
  const rows = csv.length;
  const MISBArray = new Array(rows - 1);
  try {
    const timeCol = findColumn(csv, 'time(milli');
    const dateCol = findColumn(csv, 'datetime');
    const latCol = findColumn(csv, 'latitude');
    const lonCol = findColumn(csv, 'longitude');
    const altCol = findColumn(csv, 'altitude_above_seaLevel(feet)');

    const headingCol = findColumn(csv, 'compass_heading(degrees)');
    const pitchCol = findColumn(csv, 'pitch(degrees)');
    const rollCol = findColumn(csv, 'roll(degrees)');
    const gHeadingCol = findColumn(csv, 'gimbal_heading(degrees)');
    const gPitchCol = findColumn(csv, 'gimbal_pitch(degrees)');
    const gRollCol = findColumn(csv, 'gimbal_roll(degrees)');

    const startTime = parseUTCDate(csv[1][dateCol]);
    console.log(`Detected Airdata start time of ${startTime}`);

    for (let i = 1; i < rows; i++) {
      MISBArray[i - 1] = new Array(MISBFields).fill(null);

      MISBArray[i - 1][MISB.UnixTimeStamp] = addMillisecondsToDate(
        startTime,
        Number(csv[i][timeCol])
      );

      MISBArray[i - 1][MISB.SensorLatitude] = Number(csv[i][latCol]);
      MISBArray[i - 1][MISB.SensorLongitude] = Number(csv[i][lonCol]);
      MISBArray[i - 1][MISB.SensorTrueAltitude] =
        (Sit.adjustAltitude ?? 0) + f2m(Number(csv[i][altCol]));

      // NOT HANDLING focal_len / FOV
      MISBArray[i - 1][MISB.SensorVerticalFieldofView] = 0;

      // note in the airdata for my drone, we have both gimbal and drone heading, pitch, and roll
      // but we use the drone heading and the gimbal pitch.

      MISBArray[i - 1][MISB.PlatformHeadingAngle] = Number(csv[i][headingCol]); // heading
      MISBArray[i - 1][MISB.PlatformPitchAngle] = Number(csv[i][gPitchCol]); // pitch
      MISBArray[i - 1][MISB.PlatformRollAngle] = Number(csv[i][rollCol]); // roll

      // MISBArray[i-1][MISB.SensorRelativeAzimuthAngle] = Number(csv[i][gHeadingCol]) // gHeading
      // MISBArray[i-1][MISB.SensorRelativeElevationAngle] = Number(csv[i][gPitchCol])     // gPitch
      // MISBArray[i-1][MISB.SensorRelativeRollAngle] = Number(csv[i][gRollCol])       // gRoll
    }
  } catch (error) {
    console.error(error.message);
  }

  return MISBArray;
}
