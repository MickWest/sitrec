export function splitOnCommas(str) {
  // Regular expression to match commas that are not inside parentheses
  const regex = /,(?![^\(\)]*\))/g;
  //    return str.split(regex).map(s => s.trimStart());
  // remove leading zeros and trailing "m" (for meters)
  return str.split(regex).map((s) => s.trimStart().replace(/m$/, ''));
}

// extract lla from something like "(-121.1689, 38.7225, 21)"
export function extractLLA(str) {
  const regex = /(-?\d+\.\d+|\d+)/g;
  const matches = str.match(regex);

  if (matches && matches.length === 3) {
    const longitude = Number.parseFloat(matches[0]);
    const latitude = Number.parseFloat(matches[1]);
    const altitude = Number.parseFloat(matches[2]);

    return { latitude, longitude, altitude };
  }
  return null; // or handle the error as needed
}

// startTime is a Date object, like new Date(Sit.startTime)
export function convertToRelativeTime(startTime, relativeTimeString) {
  // Split the relative time string by comma to separate time and milliseconds
  const parts = relativeTimeString.split(',');

  // Further split the time part into hours, minutes, and seconds
  const timeParts = parts[0].split(':');

  // Extract hours, minutes, seconds, and milliseconds
  const hours = Number.parseInt(timeParts[0], 10);
  const minutes = Number.parseInt(timeParts[1], 10);
  const seconds = Number.parseInt(timeParts[2], 10);
  const milliseconds = Number.parseInt(parts[1], 10);

  const relativeTime = new Date(startTime);

  // Add hours, minutes, seconds, and milliseconds to the start time
  relativeTime.setHours(startTime.getHours() + hours);
  relativeTime.setMinutes(startTime.getMinutes() + minutes);
  relativeTime.setSeconds(startTime.getSeconds() + seconds);
  relativeTime.setMilliseconds(startTime.getMilliseconds() + milliseconds);

  return relativeTime;
}

export function findColumn(csv, text) {
  // Check if the csv is a non-empty array
  if (!Array.isArray(csv) || csv.length === 0 || !Array.isArray(csv[0])) {
    throw new Error('Invalid input: csv must be a non-empty 2D array.');
  }

  // Iterate through each column of the first row
  for (let col = 0; col < csv[0].length; col++) {
    // Check if the first element of the column starts with the text
    if (csv[0][col].trimStart().startsWith(text)) {
      return col; // Return the column index
    }
  }

  // Throw an error if no column starts with the given text
  throw new Error(`No column found starting with ${text}`);
}

export function parseUTCDate(dateStr) {
  // Split the date and time parts
  const [datePart, timePart] = dateStr.split(' ');

  // Split the date into month, day, and year
  const [year, month, day] = datePart
    .split('-')
    .map((num) => Number.parseInt(num, 10));

  // Adjust month value for JavaScript Date (0-indexed)
  const adjustedMonth = month - 1;

  // Split the time into hours, minutes, seconds, and AM/PM
  const [time, modifier] = timePart.split(' ');
  const [hours, minutes, seconds] = time
    .split(':')
    .map((num) => Number.parseInt(num, 10));

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
