import {dateToTLE} from "../src/TLEUtils";

describe('dateToTLE', () => {
    test('should return Jan 1 00:00:00 as day 001 with zero fraction', () => {
        const date = new Date(Date.UTC(2023, 0, 1, 0, 0, 0)); // January 1, 2023 at 00:00:00 UTC
        expect(dateToTLE(date)).toBe('23001.000000');
    });

    test('should return Jan 1 12:00:00 with fractional day .500000', () => {
        const date = new Date(Date.UTC(2023, 0, 1, 12, 0, 0)); // January 1, 2023 at 12:00:00 UTC
        expect(dateToTLE(date)).toBe('23001.500000');
    });

    test('should handle leap year: Feb 29, 2020 at 12:00:00', () => {
        const date = new Date(Date.UTC(2020, 1, 29, 12, 0, 0)); // February 29, 2020 at 12:00:00 UTC
        // In 2020, Feb 29 is the 60th day of the year.
        expect(dateToTLE(date)).toBe('20060.500000');
    });

    test('should return Dec 31 23:59:59 for a non-leap year (2023)', () => {
        const date = new Date(Date.UTC(2023, 11, 31, 23, 59, 59)); // December 31, 2023 at 23:59:59 UTC
        // Day of year for 2023 is 365.
        // Fraction: 86399 / 86400 ≈ 0.999988 (formatted to six decimals)
        expect(dateToTLE(date)).toBe('23365.999988');
    });

    test('should return Dec 31 23:59:59 for a leap year (2020)', () => {
        const date = new Date(Date.UTC(2020, 11, 31, 23, 59, 59)); // December 31, 2020 at 23:59:59 UTC
        // In leap year 2020, the day of year is 366.
        expect(dateToTLE(date)).toBe('20366.999988');
    });

    test('should correctly compute a random mid-day value', () => {
        const date = new Date(Date.UTC(2023, 5, 15, 6, 30, 0)); // June 15, 2023 at 06:30:00 UTC
        // Calculate day-of-year: Jan (31) + Feb (28) + Mar (31) + Apr (30) + May (31) + 15 = 166
        // Fraction: 6.5 hours / 24 ≈ 0.270833
        expect(dateToTLE(date)).toBe('23166.270833');
    });
});
