// given an array of satrecs, return the one that best matches the date
// ie the one that is closest to the date, but before it
// if there are none before it, then return the first one after
import {assert} from "./assert";

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