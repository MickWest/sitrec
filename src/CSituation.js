import {Color} from "three";
import {FileManager, infoDiv, Sit, Units} from "./Globals";
import * as LAYER from "./LayerMasks";
import {CNodeConstant} from "./nodes/CNode";
import {NightSkyFiles} from "./ExtraFiles";
import {CNodeDisplayTrack} from "./nodes/CNodeDisplayTrack";
import {expandSitData} from "./SituationSetup";
import stringify from "json-stringify-pretty-compact";
import {makeTrackFromDataFile} from "./TrackManager";
import {makePositionLLA} from "./nodes/CNodePositionLLA";
import {isConsole, setupConfigPaths} from "./configUtils";


// These are some parameters used as defaults for a situation
// NOTE: The order used here will override the order in any sitch that uses these
// even if you override the values.

const situationDefaults = {
    name: "default-ERROR",
    isTextable: false,

    // most everything should be moddable
    canMod: true,                  // true if we can made a modded version of this sitch


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
    satScale: 2,
    satCutOff: 0.06,

    targetSize:1,   // the diameter of the default target sphere F/A-18F wingspan = 45 feet

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

    lighting: {
        kind: "Lighting",
        ambientIntensity: 0.2,
        sunIntensity: 0.7,
        sunScattering: 0.6,
        ambientOnly: false,

    },

    theSun: {kind: "Sunlight"},   // default sun



    showSunArrows: false,
    showFlareRegion: false,
    showFlareBand: false,
    showVenusArrow: false,

    ambientLight: 0.5,

    paused: false,



}

export class CSituation {
    constructor(props) {
        Object.assign(this,situationDefaults);
//        console.log("Setting units to: ",this.units)
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
    //     // more data-driven stuff that's independent of type of situation
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

        setupConfigPaths();


        console.log("++++++++++++++++++++ Loading assets for ", this.name,  " ++++++++++++++++++++++");
        // There's a per-sitch set of files
        // then other flags can cause files to be added, like the night sky
        var assets = this.files ?? {};
        var assets2 = this.files2 ?? {}
        if (this.nightSky || this.theNightSky) {
            assets = {...assets,...assets2,...NightSkyFiles}
        }
        if(!isConsole)
            infoDiv.innerHTML = "Loading<br>"
        for (let key in assets) {
            console.log("++++ Loading asset ", key, " from ", assets[key])

            if (key === "KMLTarget")   {
                console.warn("KMLTarget is deprecated, patching to TargetTrack")
                // modify the object so that it uses TargetTrack instead of KMLTarget
                assets["TargetTrack"] = assets[key]
                delete assets[key]
                key = "TargetTrack";
            }

            // videoFile is a special case, we don't want to load it here
            if (key !== "videoFile") {
                if(!isConsole)
                    infoDiv.innerHTML += assets[key] + "<br>";
                await FileManager.loadAsset(assets[key], key)
            }
        }
        if(!isConsole) {
//            infoDiv.innerHTML += "done loading"
            infoDiv.innerHTML = "";
            // and hide it
            infoDiv.style.display = "none";
        }
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
