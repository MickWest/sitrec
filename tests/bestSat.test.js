// bestSat.test.js
import { strict as assert } from "assert";
import {bestSat} from "../src/TLEUtils";


describe("bestSat", () => {


    it("should return the only satellite record when one is provided", () => {
        const sat = { id: "onlySat", epochyr: 22, epochdays: 32.0 };
        const result = bestSat([sat], new Date("2022-02-01T00:00:00Z"));
        assert.strictEqual(result, sat, "Expected the single satellite record to be returned");
    });

    it("should return the best satellite record when all sats are before the date", () => {
        // For the target date 2022-02-01T00:00:00Z, the TLE conversion gives:
        // Year: 22, Day-of-Year: 32.0, so numeric value: 22032.0.
        // All satellite records have their epochdays less than or equal to 32.
        // The record with the highest (closest) epochdays is chosen.
        const targetDate = new Date("2022-02-01T00:00:00Z");

        const sat1 = { id: "sat1", epochyr: 22, epochdays: 29.0 };  // 22029.0
        const sat2 = { id: "sat2", epochyr: 22, epochdays: 31.5 };  // 22031.5
        const sat3 = { id: "sat3", epochyr: 22, epochdays: 31.8 };  // 22031.8 (best candidate)
        const sats = [sat1, sat2, sat3];

        const result = bestSat(sats, targetDate);
        assert.strictEqual(result, sat3, "Expected sat3 (with epochdays 31.8) to be chosen");
    });

    it("should return the best satellite record when some sats are before and some after the date", () => {
        // Here, even though there are some satellites with epochdays after the target,
        // at least one record is before the target date, so the closest one before is chosen.
        const targetDate = new Date("2022-02-01T00:00:00Z");

        // Sats before the target date
        const satBefore1 = { id: "satBefore1", epochyr: 22, epochdays: 30.0 };  // 22030.0
        const satBefore2 = { id: "satBefore2", epochyr: 22, epochdays: 31.7 };  // 22031.7 (best among before)
        // Sat after the target date
        const satAfter1 = { id: "satAfter1", epochyr: 22, epochdays: 32.3 };   // 22032.3
        const sats = [satBefore1, satAfter1, satBefore2];

        const result = bestSat(sats, targetDate);
        assert.strictEqual(result, satBefore2, "Expected satBefore2 (with epochdays 31.7) to be chosen");
    });

    it("should return the earliest satellite record after the date when no sats are before", () => {
        // When no satellite has an epoch (year and day) at or before the target,
        // the function should return the record with the smallest epoch after the target.
        const targetDate = new Date("2022-02-01T00:00:00Z");

        const satAfter1 = { id: "satAfter1", epochyr: 22, epochdays: 32.2 }; // 22032.2
        const satAfter2 = { id: "satAfter2", epochyr: 22, epochdays: 32.1 }; // 22032.1 (earliest after)
        const satAfter3 = { id: "satAfter3", epochyr: 22, epochdays: 33.0 }; // 22033.0
        const sats = [satAfter1, satAfter3, satAfter2];

        const result = bestSat(sats, targetDate);
        assert.strictEqual(result, satAfter2, "Expected satAfter2 (with epochdays 32.1) to be chosen");
    });
});
