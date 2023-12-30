import {GlobalPTZ, gui, NodeMan, Sit} from "../Globals";
import {CNode} from "./CNode";
import {par} from "../par";
import {calculateGST} from "./CNodeDisplayNightSky";
import {isKeyCodeHeld, isKeyHeld} from "../KeyBoardHandler";
import {ViewMan} from "./CNodeView";
import {ECEFToLLAVD_Sphere, EUSToECEF} from "../LLA-ECEF-ENU";



// A UI node for the Date and Time at the start of the video/sitch
// also updates the current time (nowDate) based on Sit settings.
// and calculates common intermediate values, like Greenwitch SideReal Time, and Julian Date
export class CNodeDateTime extends CNode {
    constructor(v) {

        super (v)

        this.dateTimeFolder = gui.addFolder("Start Date/Time");
        this.dateTime = {
            year: 2022,
            month: 1,
            day: 15,
            hour: 12,
            minute: 30,
            second: 0,
            millisecond: 0,
        }

        this.populateFromUTCString(Sit.startTime) // will create a this.date member

        this.dateTimeFolder.add(Sit, "startTime").listen().disable()
        this.dateTimeFolder.add(this.dateTime, "year", 1947, 2030, 1).listen().onChange(v => this.updateDateTime(v))
        this.dateTimeFolder.add(this.dateTime, "month", 1, 12, 1).listen().onChange(v => this.updateDateTime(v))
        this.dateTimeFolder.add(this.dateTime, "day", 1, 31, 1).listen().onChange(v => this.updateDateTime(v))
        this.dateTimeFolder.add(this.dateTime, "hour", 0, 23, 1).listen().onChange(v => this.updateDateTime(v))
        this.dateTimeFolder.add(this.dateTime, "minute", 0, 59, 1).listen().onChange(v => this.updateDateTime(v))
        this.dateTimeFolder.add(this.dateTime, "second", 0, 59, 1).listen().onChange(v => this.updateDateTime(v))
        this.dateTimeFolder.add(this.dateTime, "millisecond", 0, 999, 1).listen().onChange(v => this.updateDateTime(v))
        this.dateTimeFolder.add(this, "resetStartTime").name("Reset Start Time");
        this.dateTimeFolder.add(this, "resetStartTimeToNow").name("Sync Start Time to Now");


        if (Sit.showDateTime) {
            this.dateTimeFolder.open();
        } else {
            this.dateTimeFolder.close();
        }

        this.update();

    }

    resetStartTime() {
        this.date = new Date(this.originalPopulated);
        this.populate();
    }

    resetStartTimeToNow() {
        this.date = new Date();
        this.populate();
    }

    populate() {
        this.dateTime.year = this.date.getUTCFullYear();
        this.dateTime.month = this.date.getUTCMonth() + 1; // Months are 0-indexed in JavaScript
        this.dateTime.day = this.date.getUTCDate();
        this.dateTime.hour = this.date.getUTCHours();
        this.dateTime.minute = this.date.getUTCMinutes();
        this.dateTime.second = this.date.getUTCSeconds();
        this.dateTime.millisecond = this.date.getUTCMilliseconds();
    }

    populateFromUTCString(utcString) {
        this.date = new Date(utcString);
        this.originalPopulated = utcString;
        this.populate()
    }

    populateFromMS(ms) {
        this.date = new Date(ms);
        this.populate()
    }

    toUTCString() {
        // Return the UTC string representation
        return this.date.toISOString();
    }

    toLocalString() {
        return this.date.toLocalString();
    }


    updateDateTime(v) {

        this.date = new Date(Date.UTC(
            this.dateTime.year,
            this.dateTime.month - 1, // Months are 0-indexed in JavaScript
            this.dateTime.day,
            this.dateTime.hour,
            this.dateTime.minute,
            this.dateTime.second,
            this.dateTime.millisecond,
        ));

        Sit.startTime = this.toUTCString()
        this.recalculateCascade()
        par.renderOne = true;
    }

    // ms since the start of the epoch
    getStartTimeValue() {
        return this.date.valueOf()
    }

    AdjustStartTime(t) {
        var time = this.getStartTimeValue()
        time += t
        this.populateFromMS(time)
        this.updateDateTime()
    }

    update(frame) {

        var speedscale = 1;
        if (isKeyHeld('shift'))
            speedscale *= 10
        if (isKeyHeld('control'))
            speedscale *= 100
        if (isKeyHeld('alt'))
            speedscale *= 1000
        if (isKeyHeld('meta'))
            speedscale *= 10000

        if (isKeyCodeHeld('Semicolon')) {
            this.AdjustStartTime(-1000*speedscale)
        }
        if (isKeyCodeHeld('Quote')) {
            this.AdjustStartTime(1000*speedscale)
        }

        if (isKeyCodeHeld('BracketLeft')) {
            this.AdjustStartTime(-10000*speedscale)
        }
        if (isKeyCodeHeld('BracketRight')) {
            this.AdjustStartTime(10000*speedscale)
        }

        this.frame = frame
        this.nowDate = new Date(Math.floor(this.date.valueOf() + frame * 1000 * (Sit.simSpeed??1)/ Sit.fps))
        this.nowGST = calculateGST(this.nowDate)
    }

    getNowDate(frame) {
        return this.nowDate;
    }

}

export var GlobalDateTimeNode;

export function MakeDateTimeNode() {
    GlobalDateTimeNode = new CNodeDateTime({
        id:"dateTimeStart",
    })
}



