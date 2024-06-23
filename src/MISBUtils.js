// this MISB object is for the internal representation of the MISB data
// i.e. it's the index of the data within
// these are standard MISB 0601 tags (keys) and values as listed in
// https://upload.wikimedia.org/wikipedia/commons/1/19/MISB_Standard_0601.pdf
// with the following exceptions:
// any dash in the name is replaced with an underscore
// any spaces or parentheses ' ', '(' and ')' in the name are removed
// These are mostly just numbers, but some are strings, and some are arrays of numbers
//
// For local extensions, other values can be added (perhaps computed values)
// e.g. SensorRelativeAltitude = is the altitude above start point of the track
// and is a value supplied by DJI Metadata.

export const MISB = {
  Checksum: 1,
  UnixTimeStamp: 2,
  MissionID: 3,
  PlatformTailNumber: 4,
  PlatformHeadingAngle: 5,
  PlatformPitchAngle: 6,
  PlatformRollAngle: 7,
  PlatformTrueAirspeed: 8,
  PlatformIndicatedAirspeed: 9,
  PlatformDesignation: 10,
  ImageSourceSensor: 11,
  ImageCoordinateSystem: 12,
  SensorLatitude: 13,
  SensorLongitude: 14,
  SensorTrueAltitude: 15,
  SensorHorizontalFieldofView: 16,
  SensorVerticalFieldofView: 17,
  SensorRelativeAzimuthAngle: 18,
  SensorRelativeElevationAngle: 19,
  SensorRelativeRollAngle: 20,
  SlantRange: 21,
  TargetWidth: 22,
  FrameCenterLatitude: 23,
  FrameCenterLongitude: 24,
  FrameCenterElevation: 25,
  OffsetCornerLatitudePoint1: 26,
  OffsetCornerLongitudePoint1: 27,
  OffsetCornerLatitudePoint2: 28,
  OffsetCornerLongitudePoint2: 29,
  OffsetCornerLatitudePoint3: 30,
  OffsetCornerLongitudePoint3: 31,
  OffsetCornerLatitudePoint4: 32,
  OffsetCornerLongitudePoint4: 33,
  IcingDetected: 34,
  WindDirection: 35,
  WindSpeed: 36,
  StaticPressure: 37,
  DensityAltitude: 38,
  OutsideAirTemperature: 39,
  TargetLocationLatitude: 40,
  TargetLocationLongitude: 41,
  TargetLocationElevation: 42,
  TargetTrackGateWidth: 43,
  TargetTrackGateHeight: 44,
  TargetErrorEstimate_CE90: 45,
  TargetErrorEstimate_LE90: 46,
  GenericFlagData: 47,
  SecurityLocalSet: 48,
  PlatformAngleofAttack: 50,
  PlatformVerticalSpeed: 51,
  PlatformSideslipAngle: 52,
  RelativeHumidity: 55,
  PlatformGroundSpeed: 56,
  GroundRange: 57,
  PlatformFuelRemaining: 58,
  PlatformCallSign: 59,
  LaserPRFCode: 62,
  SensorFieldofViewName: 63,
  PlatformMagneticHeading: 64,
  UASDatalinkLSVersionNumber: 65,
  AlternatePlatformLatitude: 67,
  AlternatePlatformLongitude: 68,
  AlternatePlatformName: 70,
  AlternatePlatformHeading: 71,
  EventStartTime: 72,
  RVTLocalSet: 73,
  VMTILocalSet: 74,
  SensorEllipsoidHeight: 75,
  AlternatePlatformEllipsoidHeight: 76,
  OperationalMode: 77,
  FrameCenterHeightAboveEllipsoid: 78,
  SensorNorthVelocity: 79,
  SensorEastVelocity: 80,
  ImageHorizonPixelPack: 81,
  CornerLatitudePoint1: 82,
  CornerLongitudePoint1: 83,
  CornerLongitudePoint2: 85,
  CornerLatitudePoint2: 84,
  CornerLatitudePoint3: 86,
  CornerLongitudePoint3: 87,
  CornerLatitudePoint4: 88,
  CornerLongitudePoint4: 89,
  PlatformPitchAngleFull: 90,
  PlatformRollAngleFull: 91,
  PlatformAngleofAttackFull: 92,
  PlatformSideslipAngleFull: 93,
  MIISCoreIdentifier: 94,
  SARMotionImageryMetadata: 95, // Mick: added this
  TargetWidthExtended: 96, // Mick: this is the last one listed in the MISB 0601.8 spec

  Geo_RegistrationLocalSet: 98,
  SensorEllipsoidHeightExtended: 104,
  AltitudeAGL: 113,
  ControlCommandVerificationList: 116,
  SensorAzimuthRate: 117,
  SensorElevationRate: 118,
  SensorRollRate: 119,
  On_boardMIStoragePercentFull: 120,

  SensorRelativeAltitude: 121,
};

// Some additional fields are listed here:
// https://impleotv.com/content/misbcore/help//user-guide/st601-supported.html

export const MISBFields = 121;

// all the MISB identifiers above are the MISB 0601.8 tag's LS Names with spaces removed
// so to parse a generic CSV file, we first assume the header row is the LS Names
// we remove the spaces, and then compare to the MISB identifiers above
// so it will work with or without spaces in the header row
// we also do the comparison case-insensitive as the LS Names are generally capitalized
// but some words, like "of" are not, and there might be use confusion
// all LS Names are unique regardless of case

export function parseMISB1CSV(csv) {
  const rows = csv.length;
  console.log(`MISB CSV rows = ${rows}`);
  const MISBArray = new Array(rows - 1);

  // prefill the entire array with null
  for (let i = 1; i < rows; i++) {
    MISBArray[i - 1] = new Array(MISBFields).fill(null);
  }

  // for each column header, find the corresponding MISB field
  // then parse the values for the entire column and put them in the MISBArray
  // if the column header doesn't match a MISB field, ignore it
  for (let col = 0; col < csv[0].length; col++) {
    const header = csv[0][col].replace(/\s/g, '').toLowerCase();

    //const field = MISB[header];
    const field = Object.keys(MISB).find((key) => key.toLowerCase() === header);

    if (field !== undefined) {
      //            console.log("MISB Data "+csv[0][col] + " - row 1 = " + csv[1][col] + " - field = " + field + " - col = " + col);
      //            console.log("MISB LAST ROW = " + csv[rows-1][col]);
      // got the MISB column, so just copy the values
      for (let row = 1; row < rows; row++) {
        // field is the name of the MISB field, and col is the column in the csv
        // we use MISB[field] to get the index in the MISBArray
        MISBArray[row - 1][MISB[field]] = csv[row][col];
      }
    } else {
      console.warn(`UNHANDLED MISB DATA: ${csv[0][col]}`);
    }
  }

  return MISBArray;
}

// import * as st0601 from './js/misb.js-main/src/st0601.mjs'
// const klvTest =[
//     '060E2B34 020B0101 0E0103010100000081D2020800046050584E0180030A4D697373696F6E20',
//     '3132050271C20602FD3D070208B80A085072656461746F720B07454F204E6F73650C0E47656F',
//     '64657469632057475338340D045595B66D0E045B5360C40F02C2211002CD9C1102D917120472',
//     '4A0A20130487F84B86140400000000150403830926160212811704F101A229180414BC082B19',
//     '0234F3301C01010102010703052F2F5553410C01070D060055005300411602000A4101065E22',
//     '0170F592F02373364AF8AA9162C00F2EB2DA16B74341000841A0BE365B5AB96A36450102AA43'
// ]
// const json = st0601.parse(klvTest.join(''), { debug: true })
// console.log(json)

//const { st0601, st0903, st0104, st0806, klv } = require('./js/misb.js-main/index.js')

import * as st0601 from './js/misb.js-main/src/st0601.mjs';
import * as st0903 from './js/misb.js-main/src/st0903.mjs';
import * as st0104 from './js/misb.js-main/src/st0104.mjs';
import * as st0806 from './js/misb.js-main/src/st0806.mjs';
import * as klv from './js/misb.js-main/src/klv.mjs';

const standards = [st0601, st0903, st0806, st0104];
const packets = {};
for (const standard of standards) {
  packets[standard.name] = [];
}

// the code expects st0601 data packets to start with a key, which is
// 060e2b34020b01010e01030101000000
// this is then followed directly by the packet, like
// 060E2B34020B01010E01030101000000 8190020800046CAE71B92030410101
// instead, in the data extracted with ffmpeg, I get:
// ..........0B01010E01030101000000 8190020800
// i.e. the first five bytes of the key are missing
// so we have an 11 byte key????

export function parseKLVFile(data) {
  //    const result = klv.decode(data, standards, null, {debug: false})
  const result = klv.decode(data, st0601, null, { debug: false });
  // for (const standard of standards) {
  //     for (const packet of result[standard.name]) {
  //         packets[standard.name].push(packet)
  //     }
  // }
  //
  // for (const standard of standards) {
  //     const name = standard.name
  //     console.log(`${name}: ${packets[name]?.length ?? 0}`)
  // }

  const data0601 = result[st0601.name];
  const n = data0601.length;
  const MISBArray = new Array(n);
  for (let i = 0; i < n; i++) {
    MISBArray[i] = new Array(MISBFields).fill(null);
    for (const index of Object.keys(data0601[i])) {
      const line = data0601[i][index];
      MISBArray[i][line.key] = line.value;
    }
  }

  return MISBArray;
}
