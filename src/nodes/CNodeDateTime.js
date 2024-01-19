import {GlobalPTZ, gui, guiTweaks, NodeMan, Sit} from "../Globals";
import {CNode} from "./CNode";
import {par} from "../par";
import {addNightSky, calculateGST} from "./CNodeDisplayNightSky";
import {isKeyCodeHeld, isKeyHeld} from "../KeyBoardHandler";
import {ViewMan} from "./CNodeView";
import {ECEFToLLAVD_Sphere, EUSToECEF} from "../LLA-ECEF-ENU";
import {forceUpdateUIText} from "./CNodeViewUI";

const timeZoneOffsets = {
    "IDLW UTC-12": -12,     // International Date Line West
    "NT UTC-11": -11,       // Nome Time
    "HST UTC-10": -10,      // Hawaii Standard Time
    "HDT UTC-9": -9,        // Hawaii Daylight Time
    "AKST UTC-9": -9,       // Alaska Standard Time
    "AKDT UTC-8": -8,       // Alaska Daylight Time
    "PST UTC-8": -8,        // Pacific Standard Time
    "PDT UTC-7": -7,        // Pacific Daylight Time
    "MST UTC-7": -7,        // Mountain Standard Time
    "MDT UTC-6": -6,        // Mountain Daylight Time
    "CST UTC-6": -6,        // Central Standard Time
    "CDT UTC-5": -5,        // Central Daylight Time
    "EST UTC-5": -5,        // Eastern Standard Time
    "EDT UTC-4": -4,        // Eastern Daylight Time
    "AST UTC-4": -4,        // Atlantic Standard Time
    "ADT UTC-3": -3,        // Atlantic Daylight Time
    "FKST UTC-3": -3,       // Falkland Islands Summer Time
    "GST UTC-2": -2,        // South Georgia and the South Sandwich Islands
    "AZOT UTC-1": -1,       // Azores Standard Time
    "AZOST UTC+0": 0,       // Azores Summer Time
    "GMT UTC+0": 0,         // Greenwich Mean Time
    "BST UTC+1": 1,         // British Summer Time
    "CET UTC+1": 1,         // Central European Time
    "CEST UTC+2": 2,        // Central European Summer Time
    "EET UTC+2": 2,         // Eastern European Time
    "EEST UTC+3": 3,        // Eastern European Summer Time
    "MSK UTC+3": 3,         // Moscow Standard Time
    "SAMT UTC+4": 4,        // Samara Time
    "YEKT UTC+5": 5,        // Yekaterinburg Time
    "OMST UTC+6": 6,        // Omsk Standard Time
    "KRAT UTC+7": 7,        // Krasnoyarsk Time
    "IRKT UTC+8": 8,        // Irkutsk Time
    "YAKT UTC+9": 9,        // Yakutsk Time
    "VLAT UTC+10": 10,      // Vladivostok Time
    "AEST UTC+10": 10,      // Australian Eastern Standard Time
    "ACST UTC+9.5": 9.5,    // Australian Central Standard Time
    "ACDT UTC+10.5": 10.5,  // Australian Central Daylight Time
    "AWST UTC+8": 8,        // Australian Western Standard Time
    "NZST UTC+12": 12,      // New Zealand Standard Time
    "NZDT UTC+13": 13,      // New Zealand Daylight Time
    "MAGT UTC+11": 11,      // Magadan Time
    "PETT UTC+12": 12,      // Kamchatka Time
    "LHST UTC+10.5": 10.5,  // Lord Howe Standard Time
    "LHDT UTC+11": 11       // Lord Howe Daylight Time
};

// Create a new object where both keys and values are the keys from timeZoneOffsets
const timeZoneKeys = [];

for (const key in timeZoneOffsets) {
    if (timeZoneOffsets.hasOwnProperty(key)) {
      //  newTimeZoneObject[key] = key;
        timeZoneKeys.push(key)
    }
}


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


        const options = { timeZoneName: 'short' };
        const timeZone = new Date().toLocaleTimeString('en-us', options).split(' ')[2];
        console.log(timeZone);

        this.timeZoneName = "PDT UTC-7";
        for (let tz of timeZoneKeys) {
            if (tz.startsWith(timeZone)) {
                this.timeZoneName = tz;
            }
        }

        this.dateTimeFolder.add(this, "timeZoneName", timeZoneKeys).name("Display Time Zone").listen().onChange(
            v => {
                console.log("Timezone "+v)
                forceUpdateUIText();
                par.renderOne = true;
            }
        )

        this.dateTimeFolder.add(Sit, 'simSpeed', 1, 60, 0.01).name("Simulation Speed").listen()

        this.dateTimeFolder.add(this, "resetStartTime").name("Reset Start Time");
        this.dateTimeFolder.add(this, "resetStartTimeToNow").name("Sync Start Time to Now");

        this.addedSyncToTrack = false;

        if (Sit.showDateTime) {
            this.dateTimeFolder.open();
        } else {
            this.dateTimeFolder.close();
        }

        this.update(0);

    }

    getTimeZoneName() {
        return this.timeZoneName;
    }

    getTimeZoneOffset() {
        return(timeZoneOffsets[this.timeZoneName])
    }

    addSyncToTrack(timedTrack) {
        if (!this.addedSyncToTrack) {
            this.dateTimeFolder.add(this, "syncStartTimeTrack").name("Sync Start Time to Track");
        }
        this.syncTrack = timedTrack;
    }

    syncStartTimeTrack() {
        const timedTrackNode = NodeMan.get(this.syncTrack);
        const startTime = timedTrackNode.getTrackStartTime();
        console.log(">>>"+startTime)

        this.date = new Date(startTime);
        this.populate();

        // rebuild anything the depends on that track
        timedTrackNode.recalculateCascade(0);
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



