// a uitlity class for converting units
// focussing on the standard units used by situations
// Systems are
// 1. Metric
// 2. Imperial / Statute
// 3. Nautical

import {assert} from "./utils";
import {guiTweaks} from "./Globals";

export class CUnits {
    constructor(_units = "metric", gui) {
        this.units = _units.toLowerCase();
        this.selectableUnits = {"Metric": "Metric", "Imperial/US":"Imperial", "Nautical":"Nautical"};
        this.changeUnits(this.units);
        guiTweaks.add(this, "unitsName", this.selectableUnits).name("Units").listen().onChange(x => this.changeUnits(x));
    }

    changeUnits(_units) {
        this.units = _units.toLowerCase();
        switch (this.units) {
            case "nautical": // Nautical miles and feet
                this.bigUnitsFull = "Nautical Miles";
                this.bigUnitsAbbrev = "NM";
                this.smallUnitsFull = "Feet"
                this.smallUnitsAbbrev = "ft";
                this.speedUnits = "Knots"
                this.big2M = 1852;          // big units to meters
                this.small2M = 0.3048       // scale small (feet) to meters 0.3048 is the EXACT international foot
                break;
            case "imperial": // Statute (ordinary) miles and feet
                this.bigUnitsFull = "Miles";
                this.bigUnitsAbbrev = "mi";
                this.smallUnitsFull = "Feet"
                this.smallUnitsAbbrev = "ft";
                this.speedUnits = "mph"
                this.big2M = 1609.344
                this.small2M = 0.3048
                break;
            case "metric": // Kilometers and meters
                this.bigUnitsFull = "Kilometers";
                this.bigUnitsAbbrev = "km";
                this.smallUnitsFull = "Meters"
                this.smallUnitsAbbrev = "m";
                this.big2M = 1000
                this.small2M = 1
                this.speedUnits = "km/h"
                break;
            default:
                assert(0, "CUnits: unknown units: " + _units);
        }

        this.m2Big = 1 / this.big2M;
        this.m2Small = 1 / this.small2M;
        this.m2Speed = 3600 * this.m2Big; // m/s to big units. so 3600 m in one hour, convert 3600 m to big units
        this.speed2M = 1 / this.m2Speed;

        // find the unitName from the units, setting it for the GUI
        for (let [unitName, unit] of Object.entries(this.selectableUnits)) {
            if (unit.toLowerCase() === this.units) {
                this.unitsName = unitName;
                break;
            }
        }

    }

    // convert meters to the big units
    big(m) {
        return m * this.m2Big;
    }

    bigWithUnits(m, decimals = 0) {
        return this.big(m).toFixed(decimals) + " " + this.bigUnitsAbbrev;
    }

    // convert meters to the small units
    small(m) {
        return m * this.m2Small;
    }

    // convert meters/second to speed units
    speed(m) {
        return m * this.m2Speed;
    }


}

//export const Units = new CUnits("metric");