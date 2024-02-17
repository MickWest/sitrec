import {Color} from "../three.js/build/three.module.js";
import {guiTweaks, infoDiv, Sit, Units} from "./Globals";
import {LLAToEUS} from "./LLA-ECEF-ENU";
import {boxMark, V3} from "./threeExt";
import * as LAYER from "./LayerMasks";
import {CNodeConstant, makePositionLLA} from "./nodes/CNode";
import {CNodeGUIValue} from "./nodes/CNodeGUIValue";
import {GlobalScene} from "./LocalFrame";
import {NightSkyFiles} from "./ExtraFiles";
import {f2m} from "./utils";
import {makeTrackFromDataFile} from "./nodes/CNodeTrack";
import {CNodeDisplayTrack} from "./nodes/CNodeDisplayTrack";
import {FileManager} from "./CFileManager";


// These are some parameters used as defaults for a situation
const situationDefaults = {
    name: "gimbal",
    fps: 30,
    frames:1031,
    aFrame:0,
    endAz:8,
    startDistance: 7,
    targetSpeed: 320,

    startDistanceMin: 0,
    startDistanceMax: 80,

    relativeHeading: 0,

    targetSpeedMin: -500,
    targetSpeedMax: 1000,
    targetSpeedStep: 0.1,

    starScale: 1,
    satScale: 1,
    satCutOff: 0.101,

    targetSize:1,   // the diameter of the default target sphere F/A-18E/F wingspan = 45 feet

    // Display Units
    bigUnits: "NM",

    azSlider:false,
    animated:true,

    //
    mainFOV: 30,
    lookFOV: 0.35,
    nearClip: 1,
    farClipLook: 800000,
    nearClipLook: 1,

    defaultCameraDist: 1300,


    startTime: "2000-01-01T00:00:00Z",  // Default to start of the Epoch

    simSpeed:1,

    jetOrigin: V3(0,f2m(25000),0),  // default for Gimbal and GOfast, will be ovewritten...


    cameraSphereSize: 2000,
    targetSphereSize: 2000,

    defaultLights: {brightness: 100}

}

export class CSituation {
    constructor(props) {
        Object.assign(this,situationDefaults);
        Object.assign(this,props);

        this.updateUnits();
    }

    change(props) {
        Object.assign(this,props);
        this.updateUnits()
    }

    updateUnits() {

        // if we don't specify a bFrame (last frame to be played as part of the animation)
        // then set it to the last frame based on Sit.frames
        if (this.bFrame === undefined) {
            this.bFrame = this.frames-1;
        }

        Units.bigUnits = this.bigUnits;
        switch (Units.bigUnits) {
            case "NM": // Nautical miles and feet
                Units.big2M = 1852;          // scale meters to big units
                Units.smallUnits = "Feet"
                Units.m2Small = 3.28084      // scale meters to small (feet)
                Units.small2M = 0.3048       // scale small (feet) to meters
                Units.speedUnits = "Knots"
                Units.m2Speed = 1.94384      // 1 m/s to knots
                break;
            case "miles":
            case "Miles": // Statute (ordinary) miles and feet
                Units.smallUnits = "Feet"
                Units.big2M = 1609.34
                Units.speedUnits = "mph"
                Units.m2Speed = 2.23694
                break;
        }

    }

    // Most complex sitches will FULLY override this CSituation::setup() function
    // So don't rely on anything in here for things like Gimbal, Agua, etc....
    setup() {
        // more data-driven stuff that's indepent of type of situation

        if (this.marks) this.marks.forEach(mark => {
            var enu = LLAToEUS(mark.LL.lat, mark.LL.lon)
            GlobalScene.add(boxMark(enu, mark.width, 10000, mark.width, mark.color))
        })

        new CNodeGUIValue({
            id: "altAdjust",
            value: 0,
            start: -1000,
            end: 1000,
            step: 0.1,
            desc: "Altitude adjustment"
        }, guiTweaks)

        // This seems excessive - sort out the above, remove duplicate code, make it all data driven.
    }

    get duration() {
        return this.frames / this.fps
    }

    async loadAssets() {
        // There's a per-sitch set of files
        // then other flags can cause files to be added, like the night sky
        var assets = this.files;
        if (this.nightSky) {
            assets = {...assets,...NightSkyFiles}
        }
        infoDiv.innerHTML = "Loading<br>"
        for (const key in assets) {
            infoDiv.innerHTML += this.files[key]+"<br>";
            await FileManager.loadAsset(assets[key], key)
        }
        infoDiv.innerHTML = "done loading"
    }

    makeCameraTrack()
    {
        if (FileManager.exists("cameraFile")) {
            makeTrackFromDataFile("cameraFile", "cameraTrackData", "cameraTrack")
            //animated segement of camera track
            new CNodeDisplayTrack({
                id: "KMLDisplay",
                track: "cameraTrack",
                color: new CNodeConstant({value: new Color(1, 1, 0)}),
                width: 2,
                layers: LAYER.MASK_HELPERS,
            })
        } else {
            makePositionLLA("cameraTrack", Sit.fromLat, Sit.fromLon, Sit.fromAltFeet);
        }
    }


}
