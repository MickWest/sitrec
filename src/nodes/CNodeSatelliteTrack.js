// A track node that can be used to track a satellite

import {CNodeTrack} from "./CNodeTrack";
import {GlobalDateTimeNode, Globals, guiMenus, NodeMan, Sit} from "../Globals";
import {EventManager} from "../CEventManager";
import {bestSat} from "../TLEUtils";

// TODO - consider flagging this as not smoothable for use as a camera track
// the TLE calculation should give a smooth curve, and the smoothing will shift the position slightly

 export class CNodeSatelliteTrack extends CNodeTrack {
    constructor(v) {
        super(v);

        // all satellites use the same number of frames as the Sitch
        this.frames = Sit.frames;
        this.useSitFrames = true;

        if (v.satellite) {

            this.satellite = v.satellite ?? 25544
            this.recalculate()
        }

        // adding time object as input for recalculation
        this.addInput("time", "dateTimeStart")

        this.satelliteText = "ISS (ZARYA)";


        this.guiSatellite = guiMenus.camera.add(this, "satelliteText").name("Satellite").onFinishChange(v => {
            this.satellite = this.satelliteText;
            this.norad = null; // reset the norad number to force recalculation of the satellite data
            this.recalculate();
            this.satelliteText = this.satData.name;

        }).listen().hide();

        // Use event listeners to update the track when the satellite changes
        EventManager.addEventListener("tleLoaded", (event, data) => {
            this.recalculateCascade()
        })


        this.addSimpleSerial("satellite");

    }


     // given a satellite name or number in s, convert it into a valid NORAD number that
    // exists in the TLE database
    // return null if it doesn't exist

    getSatelliteNumber (s) {
        if (s === undefined) {
            return null
        }

        // see if we have a night sky with any TLE data
        const nightSky = NodeMan.get("NightSkyNode", false)
        if (!nightSky) {
            console.warn("CNodeSatelliteTrack: no NightSkyNode found")
            return null
        }

        const tleData = nightSky.TLEData;
        if (tleData === undefined) {
            console.warn("CNodeSatelliteTrack: no TLE data found")
            return null
        }
        const satDataArray = tleData.satData;
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
                    console.log("CNodeSatelliteTrack: found satellite " + satData.name + " with number " + satNum)
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
                    console.log("CNodeSatelliteTrack: found satellite " + satData.name + " with number " + satData.number)
                    return satData.number
                }
            }

            // then try string starting with this, just return the first one, e.g. "ISS" or "HST"
            for (let i = 0; i < numSatData; i++) {
                const satData = satDataArray[i]
                // check if the name starts with the string
                if (satData.name.startsWith(s)) {
                    console.log("CNodeSatelliteTrack: found satellite " + satData.name + " with number " + satData.number)
                    return satData.number
                }
            }

            // then try string containing this, just return the first one, e.g.
            for (let i = 0; i < numSatData; i++) {
                const satData = satDataArray[i]
                // check if the name contains the string
                if (satData.name.includes(s)) {
                    console.log("CNodeSatelliteTrack: found satellite " + satData.name + " with number " + satData.number)
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

    // given a valid norad number, find the index of the satellite in the TLE database
    getSatelliteData(norad) {
        this.nightSky = NodeMan.get("NightSkyNode", false)
        const tleData = this.nightSky.TLEData;
        const satDataArray = tleData.satData;
        const numSatData = satDataArray.length;
        for (let i = 0; i < numSatData; i++) {
            const satData = satDataArray[i]
            if (satData.number === norad) {
                return satData
            }
        }
        return null;
        //return tleData.getRecordFromNORAD(norad);


    }


    modDeserialize(v) {
        super.modDeserialize(v);
        // we just force the satellite to be recalculated after all loading is done
        // with the call to NodeMan.recalculateAllRootFirst() that's done after loading
        this.norad = null;
    }


     recalculate() {

        // if we don't have a norad number, then try to get one from the TLE database
        // once we have a norad number, we won't need to do this again
        // as norad numbers should not change
        if (!this.norad) {
            this.norad = this.getSatelliteNumber(this.satellite);
            if (!this.norad) {
                console.warn(`CNodeSatelliteTrack:recalculate no NORAD number found for ${this.satellite}`);
                return;
            }
        }
        // now we have a norad number, so we can get the satellite data

        // in case the the TLE data has changed, we need to recalculate the satellite data object
        // using the current norad number
        // norad numbers should not change over a session (probably never)
        this.satData = this.getSatelliteData(this.norad);

        // update GUI text
        this.satelliteText = this.satData.name;

        // it might now be null, like if we change the TLE that we are using
        if (this.satData === null) {
            console.warn("CNodeSatelliteTrack:recalculate no satData found for " + this.norad)
            return
        }

        // make empty array for the track
        this.array = new Array(this.frames);


        // get get the best satellite from the TLE data
        // based on the time of the first frame
        const startTime = GlobalDateTimeNode.frameToDate(0);
        const satrec = bestSat(this.satData.satrecs, startTime);


        // fill the array with the EUS positions of the satellite
        // for the correct time at each frame
        for (let i = 0; i < this.frames; i++) {
            const datetime = GlobalDateTimeNode.frameToDate(i);

            const pos = this.nightSky.calcSatEUS(satrec, datetime);
            this.array[i] = {
                position: pos,
            };
        }


        // we have a satellite track, so update the gui
        this.guiSatellite.show();

        // make sure it's in the switch
        const cameraTrackSwitch = NodeMan.get("cameraTrackSwitch", false);
        if (cameraTrackSwitch) {
            cameraTrackSwitch.replaceOption("Satellite", this);
        }


    }






}