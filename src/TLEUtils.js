
import {assert} from "./assert";
import * as satellite from 'satellite.js';


// given an array of satrecs, return the one that best matches the date
// ie the one that is closest to the date, but before it
// if there are none before it, then return the first one after

export function bestSat(sats, date) {
    assert(sats !== undefined && sats.length > 0, "No satellite records provided");

    // if it's the only one, then return it
    // a reasonably common case, and 100% of the "current" satellites
    // only historical ones will have more than one
    if (sats.length === 1) {
        return sats[0];
    }

    // Convert the date object to the TLE format and then to a number for comparison.
    const tleDate = dateToTLE(date);
    const dateNum = Number(tleDate);

    let bestBefore = null;
    let bestBeforeDate = -Infinity; // So that any valid satDate will be greater.
    let bestAfter = null;
    let bestAfterDate = Infinity;

    for (const sat of sats) {
        const satDate = sat.epochyr * 1000 + sat.epochdays;
        if (satDate <= dateNum && satDate > bestBeforeDate) {
            bestBefore = sat;
            bestBeforeDate = satDate;
        } else if (satDate > dateNum && satDate < bestAfterDate) {
            bestAfter = sat;
            bestAfterDate = satDate;
        }
    }

    // Prefer a record that is before (or equal) to the target date.
    if (bestBefore !== null) {
        return bestBefore;
    }
    // If none is before, return the earliest after.
    return bestAfter || sats[0];
}

/**
 * Converts a Date object to a TLE formatted date string (YYDDD.DDDDDD).
 * @param {Date} date - The date to convert.
 * @returns {string} A string representing the TLE epoch.
 */
export function dateToTLE(date) {
    // Extract the last two digits of the UTC full year.
    const year = date.getUTCFullYear() % 100;

    // Calculate the day of the year.
    // Create a Date object representing the start of the year in UTC.
    const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
    // Compute the difference in milliseconds.
    const diff = date - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    // Floor the result to get an integer day count. (January 1st will yield 1.)
    const dayOfYear = Math.floor(diff / oneDay);

    // Compute the fractional part of the day.
    // (The remainder of milliseconds in the current day divided by total ms per day.)
    const fractionalDay = (diff % oneDay) / oneDay;

    // Format the parts:
    // Year: ensure two digits.
    const yearStr = year.toString().padStart(2, '0');
    // Day of year: ensure three digits.
    const dayStr = dayOfYear.toString().padStart(3, '0');
    // Fraction: formatted to six decimal places (includes the leading "0" before the decimal point).
    // We remove the leading zero to have just the ".DDDDDD" portion.
    const fractionStr = fractionalDay.toFixed(6).substring(1);

    return `${yearStr}${dayStr}${fractionStr}`;
}

// from the TLE spec, line 1 has 9 combined fields seprated by a single space
// but some might have leading spaces and some might have trailing spaces
// here's the END index of each combo field:
// note these are 1-indexed, so we need to subtract 1 to get the actual index
// we use 1-indexed because that's how the TLE spec is written
// see: https://en.wikipedia.org/wiki/Two-line_element_set
// we actually use this as the length of the string ending with this field
const tleComboFieldEnds1 = [1, 8, 17, 32, 43, 52, 61, 63, 69]
const tleComboFieldEnds2 = [1, 7, 16, 25, 33, 42, 51, 69]

function fixTLELine(line, ends) {

    assert(line !== undefined, "TLE line is undefined");

    // chop any trailing whitespace from the line, tle files typically just have a \t
    line = line.trimEnd()

    // if it's exactly 69 characters, we don't need to do anything
    if (line.length === 69) {
        return line
    }


    const expectedFields = ends.length;

    // split the line into the 9 fields
    // separating by whitespace
    let fields = line.split(/\s+/)


//     if (fields.length < expectedFields) {
// // possibly missing the second field,
// //         0 TBA - TO BE ASSIGNED
// //         1 81078U          24333.88851049 +.00000363 +00000+0 +12052-1 0  9994
// //         2 81078  65.1110 138.6809 0185351  89.7284  63.0761 11.22232541452104
//         // so just patch it in
//
//         const line2 = line.slice(0,9) + '24001A'.padEnd(8) + line.slice(17);
//         fields = line2.split(/\s+/)
//
//
//     }


    // if we have expectedFields, we are good
    if (expectedFields === 9) {
        // line 1
        // pad field 2 (the third) with spaces to 8 characters
        fields[2] = fields[2].padEnd(8, " ")
    } else {
        // line 2 should have 8 fields
        // however there might be a space in the last one which would make it 9
        // if so, we need to combine the last two fields
        // including enough spaces to make it the last field 6 charters
        if (fields.length > 8) {
            // only one extra allowed, so assert before we pop it
            assert(fields.length === 9, "TLE line 2 has too many fields: " + line + " " + fields.length + " " + expectedFields);
            fields[7] = fields[7] + fields[8].padStart(6, " ");
            fields.pop() // remove the last field
        }
    }

    assert(fields.length === expectedFields, "TLE line does not have the right number of fields: " + line + " " + fields.length + " " + expectedFields)


    // make a new line so the ENDS of the fields are on the 1-indexed boundaries we want
    let newLine = ""
    for (let i = 0; i < expectedFields; i++) {
        // this is how long we want it to be
        let expectedLength = ends[i]
        let field = fields[i]
        // this is how long it would be if we just added this string
        let actualLength = newLine.length + field.length
        // if it's too short, pad the start of it with spaces
        if (actualLength < expectedLength) {
            // add expectedLength-actualLength spaces to the start of the field
            field = " ".repeat(expectedLength - actualLength) + field
        }
        // if it's too long, that's an error
        if (actualLength > expectedLength) {
            console.error("TLE field " + i + " is too long: " + field)
        }
        newLine += field
        assert(newLine.length === expectedLength, "TLE field " + i + " is not the right length: " + newLine)
    }
//   console.log(line);
//   console.log(newLine);
    return newLine
}


function tleEpochToDate(epochYr, epochDays) {
    // Convert 2-digit year to 4-digit year
    const fullYear = (epochYr < 57) ? 2000 + epochYr : 1900 + epochYr;

    // Calculate milliseconds since start of year
    const startOfYear = new Date(Date.UTC(fullYear, 0, 1));
    const msSinceStart = epochDays * 24 * 60 * 60 * 1000;

    return new Date(startOfYear.getTime() + msSinceStart);
}

function satRecToDate(satrec) {
    // Convert the TLE epoch to a Date object
    return tleEpochToDate(satrec.epochyr, satrec.epochdays);
}

// this is the TLE data for the satellites
// A CTLEData object is created from a TLE file and consists of just
// a satData array, which is an array of objects
// each object has a name, a visible flag, and an array of satrecs
// the satrec is a satellite record created from a single line of a TLE file
// there can be several satrecs with the same name, so we need to store them in an array
// and pick the best one based on the playback date/time
export class CTLEData {
    // constructor is passed in a string that contains the TLE file as \n seperated lines
    // extracts in into
    constructor(fileData) {
        const lines = fileData.split('\n');

        this.satData = []
        let satrec = null;
        let satrecName = null;
        // determine if it's a two line element (no names, lines are labeled 1 and 2) or three (line 0 = name)
        if (lines.length < 3 || !lines[1].startsWith("1") || !lines[2].startsWith("2")) {
            for (let i = 0; i < lines.length; i += 2) {
                const tleLine1 = lines[i + 0];
                const tleLine2 = lines[i + 1];
                if (tleLine1 !== undefined && tleLine2 !== undefined) {
                    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
                    // no name in a two line element, so create one.
                    satrecName = "TLE_" + i

                    // a "satrec" is a satellite record created from a single line of a TLE file
                    // there might be multiple satrecs with the same name, so we need to store them in an array
                    // and later pick the best one based on the playback date/time
                    // each entry in this.satData is an object that has an array of satrecs with the same name
                    if (this.satData[satrecName] === undefined) {
                        // it's a new satData entry
                        // so create a new one with the name and the satrec array, which has one satrec
                        this.satData[satrecName] = {
                            name: satrecName,
                            number: parseInt(satrec.satnum),
                            visible: true,
                            satrecs: [satrec]
                        };
                    } else {
                        // entry already exists, so just add the satrec to the array
                        this.satData[satrecName].satrecs.push(satrec);
                    }

                }
            }
        } else {
            console.log("CTLEData: TLE file has three lines per satellite. Num of lines: " + lines.length);


            for (let i = 0; i < lines.length; i += 3) {
                // const tleLine1 = lines[i + 1];
                // const tleLine2 = lines[i + 2];

    //            if (i === 80475) debugger;

                if (lines[i + 1] !== undefined && lines[i + 2] !== undefined) {
                    //console.log(lines[i])
                    const tleLine1 = fixTLELine(lines[i + 1], tleComboFieldEnds1);
                    const tleLine2 = fixTLELine(lines[i + 2], tleComboFieldEnds2);

                    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
                    satrecName = lines[i]

                    // if it starts with "0 ", then strip that off
                    if (satrecName.startsWith("0 ")) {
                        satrecName = satrecName.substring(2)
                    }

                    const satrecNumber = parseInt(satrec.satnum);

                    // there are multiple satellites that have the same name, but diferent numbers.
                    // E.g.
                    // 0 ATLAS 5 CENTAUR R/B
                    // is 40978, 39575, and 31702
                    // So we need to use the NORAD number as the key

                    if (this.satData[satrecName] === undefined) {
                        //console.log(satrecName + " " + satrec.satnum + " ");
                        // it's a new satData entry
                        // so create a new one with the name and the satrec array, which has one satrec
                        this.satData[satrecNumber] = {
                            name: satrecName,
                            number: satrecNumber,
                            visible: true,
                            satrecs: [satrec]
                        };
                    } else {
                        // entry already exists, so just add the satrec to the array
                        this.satData[satrecNumber].satrecs.push(satrec);
                    }


                }
            }
        }

        // after building the arrays of multiple satrecs using the number as the key,
        // convert to an indexed array (i.e. just and array with no keys other than the position in the array, which is meaningless)
        // we do this so that we can iterate over the satData array easily
        const indexedSatData = []
        for (const [index, satData] of Object.entries(this.satData)) {
            indexedSatData.push(satData)
        }

        this.satData = indexedSatData;

        // we are going to find the start and end dates of the TLE data
        this.startDate = new Date("2100");
        this.endDate = new Date("1950");

        // now create an array of the satData indexed by the NORAD number
        // so we can quickly look up a satellite by its NORAD number
        this.noradIndex = []
        for (let i = 0; i < this.satData.length; i++) {

            const satData = this.satData[i];
            // add the satrec to the noradIndex array
            // indexed by the NORAD number
            this.noradIndex[satData.number] = satData;

            // iterate over the satrecs in this satData entry


            for (const satrec of satData.satrecs) {
                const satrecDate = satRecToDate(satrec)
                if (satrecDate < this.startDate) {
                    this.startDate = satrecDate;
                }
                if (satrecDate > this.endDate) {
                    this.endDate = satrecDate;
                }
            }


        }

        console.log("CTLEData: loaded " + this.satData.length + " satellites with max " +
            this.noradIndex.length + " NORAD numbers, start date: " + this.startDate.toISOString() +
            ", end date: " + this.endDate.toISOString());

    }

    // given a satellite name or number in s, convert it into a valid NORAD number that
    // exists in the TLE database
    // return null if it doesn't exist
    getNORAD(s) {
        if (s === undefined) {
            return null
        }

        const satDataArray = this.satData;
        if (satDataArray === undefined) {
            console.warn("CNodeSatelliteTrack: no satData Array found")
            return null
        }

        const numSatData = satDataArray.length;
        if (numSatData === 0) {
            console.warn("CNodeSatelliteTrack: satData Array is empty")
            return null
        }

        // The satDatArray is an array of objects
        // which have a name (string) and a number (integer number)

        // if it's a number or a string that resolves into a number, the use that number
        if (typeof s === "number" || typeof s === "string" && !isNaN(s)) {
            const satNum = parseInt(s)
            // now see if it exists in the TLE database
            for (let i = 0; i < numSatData; i++) {
                const satData = satDataArray[i]
                if (satData.number === satNum) {
                    //                  console.log("CNodeSatelliteTrack: found satellite " + satData.name + " with number " + satNum)
                    return satNum
                }
            }
            console.warn("CNodeSatelliteTrack: no satellite found for number" + s)
        }

        // if it's a string, try to find it in the TLE database, first try to match the name exactly
        if (typeof s === "string") {

            // upper case it, as all the TLE data is upper case
            s = s.toUpperCase()

            for (let i = 0; i < numSatData; i++) {
                const satData = satDataArray[i]
                // check if the name is the same as the string
                if (satData.name === s) {
//                    console.log("CNodeSatelliteTrack: found satellite " + satData.name + " with number " + satData.number)
                    return satData.number
                }
            }

            // then try string starting with this, just return the first one, e.g. "ISS" or "HST"
            for (let i = 0; i < numSatData; i++) {
                const satData = satDataArray[i]
                // check if the name starts with the string
                if (satData.name.startsWith(s)) {
//                    console.log("CNodeSatelliteTrack: found satellite " + satData.name + " with number " + satData.number)
                    return satData.number
                }
            }

            // then try string containing this, just return the first one, e.g.
            for (let i = 0; i < numSatData; i++) {
                const satData = satDataArray[i]
                // check if the name contains the string
                if (satData.name.includes(s)) {
//                    console.log("CNodeSatelliteTrack: found satellite " + satData.name + " with number " + satData.number)
                    return satData.number
                }
            }


            console.warn("CNodeSatelliteTrack: no satellite found for name" + s)
        }


        if (typeof s !== "number" && typeof s !== "string") {
            console.error("CNodeSatelliteTrack: not number or string " + s)
        }

        return null


    }

    getRecordFromNORAD(norad) {
        if (this.noradIndex[norad] === undefined) {
            return null;
        }
        return this.noradIndex[norad];
    }

    getRecordFromName(name) {
        const NORAD = this.getNORAD(name);
        if (NORAD === null) {
            return null;
        }
        return this.getRecordFromNORAD(NORAD);
    }


}