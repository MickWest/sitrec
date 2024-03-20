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
    SARMotionImageryMetadata: 95,   // Mick: added this
    TargetWidthExtended: 96,        // Mick: this is the last one listed in the MISB 0601.8 spec

    Geo_RegistrationLocalSet: 98,
    SensorEllipsoidHeightExtended: 104,
    AltitudeAGL: 113,
    ControlCommandVerificationList: 116,
    SensorAzimuthRate: 117,
    SensorElevationRate: 118,
    SensorRollRate: 119,
    On_boardMIStoragePercentFull: 120,

    SensorRelativeAltitude: 121,
}


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
    console.log("MISB CSV rows = "+rows);
    let MISBArray = new Array(rows - 1);

    // prefill the entire array with null
    for (let i = 1; i < rows; i++) {
        MISBArray[i - 1] = new Array(MISBFields).fill(null);
    }

    // for each column header, find the corresponding MISB field
    // then parse the values for the entire column and put them in the MISBArray
    // if the column header doesn't match a MISB field, ignore it
    for (let col = 0; col < csv[0].length; col++) {
        const header = csv[0][col].replace(/\s/g, "").toLowerCase();

        //const field = MISB[header];
        const field = Object.keys(MISB).find(key => key.toLowerCase() === header);

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
            console.warn("UNHANDLED MISB DATA: " + csv[0][col]);
        }
    }

    return MISBArray;
}