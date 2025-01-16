import {MISB} from "./MISBUtils";

export function splitOnCommas(str) {
    // Regular expression to match commas that are not inside parentheses
    const regex = /,(?![^\(\)]*\))/g;
//    return str.split(regex).map(s => s.trimStart());
    // remove leading zeros and trailing "m" (for meters)
    return str.split(regex).map(s => s.trimStart().replace(/m$/, ''));

}

// extract lla from something like "(-121.1689, 38.7225, 21)"
export function extractLLA(str) {
    const regex = /(-?\d+\.\d+|\d+)/g;
    const matches = str.match(regex);

    if (matches && matches.length === 3) {
        const longitude = parseFloat(matches[0]);
        const latitude = parseFloat(matches[1]);
        const altitude = parseFloat(matches[2]);

        return {latitude, longitude, altitude};
    } else {
        return null; // or handle the error as needed
    }
}

// startTime is a Date object, like new Date(Sit.startTime)
export function convertToRelativeTime(startTime, relativeTimeString) {

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

// csv is a 2D array
// text is a string or an array of strings
// exactMatch is true if the column header must match the text exactly
// otherwise, the column header must start with the text
// returns the index of the column that matches the text
// or -1 if not found
export function findColumn(csv, text, exactMatch = false) {
    // Check if the csv is a non-empty array
    if (!Array.isArray(csv) || csv.length === 0 || !Array.isArray(csv[0])) {
        throw new Error("Invalid input: csv must be a non-empty 2D array.");
    }

    if (!Array.isArray(text)) {
        text = [text];
    }

    for (const searchText of text) {

        // Iterate through each column of the first row
        for (let col = 0; col < csv[0].length; col++) {
            if (exactMatch) {
                // Check if the column header matches the text exactly
                if (csv[0][col].trim() === searchText) {
                    return col; // Return the column index
                }
            } else {
                // Check if the first element of the column starts with the text
                if (csv[0][col].trimStart().startsWith(searchText)) {
                    return col; // Return the column index
                }
            }
        }
    }

    // Throw an error if no column starts with the given text
   //  throw new Error("No column found starting with " + searchText);

    console.warn("No column found " + (exactMatch ? "matching ":"starting with ") + text);
    return -1;

}


// either 2024-04-24T16:44:11Z or 2024-04-24T16:44:11.000Z
// the built in Date parser can handle this
// returns a date object
export function parseISODate(dateStr) {
    const date = new Date(dateStr);
    return date
}

// Parse a date string in the format "YYYY-MM-DD HH:MM:SS" as a UTC date
//
export function parseUTCDate(dateStr) {
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

export function addMillisecondsToDate(date, ms) {
    // Get the current time in milliseconds
    const currentTime = date.getTime();

    // Add the specified number of milliseconds
    const newTime = currentTime + ms;

    // Create a new Date object with the new time
    return new Date(newTime);
}

export function stripDuplicateTimes(data) {
    // Create an empty array to store unique timestamps
    const uniqueData = [];

    // data is an array of arrays, each containing a timestamp at index MISB.UnixTimeStamp
    // eg. data[0][MISB.UnixTimeStamp] is the timestamp of the first data point
    // Iterate through each data point
    let lastTime = -1;
    for (const point of data) {
        if (point[MISB.UnixTimeStamp] !== lastTime) {
            // Add the data point to the uniqueData array
            uniqueData.push(point);

            // Update the lastTime variable
            lastTime = point[MISB.UnixTimeStamp]
        } else {
            console.log("Duplicate time found: ", point[MISB.UnixTimeStamp]);
        }
    }

    // Return the array of unique data points
    return uniqueData;
}