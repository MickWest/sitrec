import {Color} from "../three.js/build/three.module.js";
import {FileManager, guiTweaks, infoDiv, Sit, Units} from "./Globals";
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
import {CUnits} from "./CUnits";
import {expandSitData} from "./SituationSetup";
import stringify from "json-stringify-pretty-compact";


// These are some parameters used as defaults for a situation
// NOTE: The order used here will override the order in any sitch that uses these
// even if you overide the values.

const situationDefaults = {
    name: "gimbal",
    isTextable: false,

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
    satCutOff: 0,

    targetSize:1,   // the diameter of the default target sphere F/A-18E/F wingspan = 45 feet

    // Display Units
    //bigUnits: "NM",

    units: "Nautical",

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

    cameraSphereSize: 2000,
    targetSphereSize: 2000,

    defaultLights: {brightness: 100},

    showSunArrows: false,
    showFlareRegion: false,
    showFlareBand: false,
    showVenusArrow: false,

}

export class CSituation {
    constructor(props) {
        Object.assign(this,situationDefaults);
        console.log("Setting units to: ",this.units)
        this.change(props)
    }

    change(props) {

        const serialized = stringify(props, {maxLength: 180, indent: 2});
//        console.log(serialized);


        props = expandSitData(props);  // Do we really want to do this here? The whole CSituation class is a bit of a mess.
        // as we WERE also doing it in the SituationSetupFromData() function
        Object.assign(this,props);
        console.log("Setting units to: ",this.units)
        Units.changeUnits(this.units);
    }

    // Most complex sitches will FULLY override this CSituation::setup() function
    // So don't rely on anything in here for things like Gimbal, Agua, etc....
    // setup() {
    //     // more data-driven stuff that's indepent of type of situation
    //
    //     // if (this.marks) this.marks.forEach(mark => {
    //     //     var enu = LLAToEUS(mark.LL.lat, mark.LL.lon)
    //     //     GlobalScene.add(boxMark(enu, mark.width, 10000, mark.width, mark.color))
    //     // })
    //
    //     // new CNodeGUIValue({
    //     //     id: "altAdjust",
    //     //     value: 0,
    //     //     start: -1000,
    //     //     end: 1000,
    //     //     step: 0.1,
    //     //     desc: "Altitude adjustment"
    //     // }, guiTweaks)
    //
    //     // This seems excessive - sort out the above, remove duplicate code, make it all data driven.
    // }

    get duration() {
        return this.frames / this.fps
    }

    async loadAssets() {
        // There's a per-sitch set of files
        // then other flags can cause files to be added, like the night sky
        var assets = this.files ?? {};
        var assets2 = this.files2 ?? {}
        if (this.nightSky) {
            assets = {...assets,...assets2,...NightSkyFiles}
        }
        infoDiv.innerHTML = "Loading<br>"
        for (const key in assets) {

            // videoFile is a special case, we don't want to load it here
            if (key !== "videoFile") {
                infoDiv.innerHTML += this.files[key] + "<br>";
                await FileManager.loadAsset(assets[key], key)
            }
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
