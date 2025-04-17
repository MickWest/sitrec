import {CNode3DGroup} from "./CNode3DGroup";
import {GlobalNightSkyScene, GlobalScene, setupNightSkyScene} from "../LocalFrame";
import {
    BufferAttribute,
    BufferGeometry,
    Color,
    Group,
    Line,
    LineBasicMaterial,
    LineSegments,
    MathUtils,
    Matrix4,
    Points,
    Ray,
    Raycaster,
    Scene,
    ShaderMaterial,
    Sphere,
    Sprite,
    SpriteMaterial,
    TextureLoader,
    Vector3
} from "three";
import {degrees, radians} from "../utils";
import {FileManager, GlobalDateTimeNode, Globals, guiMenus, guiShowHide, guiTweaks, NodeMan, Sit} from "../Globals";
import {
    DebugArrow,
    DebugArrowAB,
    DebugWireframeSphere,
    pointOnGround,
    propagateLayerMaskObject,
    removeDebugArrow
} from "../threeExt";
import {ECEF2ENU, ECEF2EUS, ECEFToLLAVD_Sphere, EUSToECEF, getLST, raDecToAzElRADIANS, wgs84} from "../LLA-ECEF-ENU";
// npm install three-text2d --save-dev
// https://github.com/gamestdio/three-text2d
//import { MeshText2D, textAlign } from 'three-text2d'
import * as LAYER from "../LayerMasks";
import {par} from "../par";

import SpriteText from '../js/three-spritetext';
import {sharedUniforms} from "../js/map33/material/QuadTextureMaterial";
import {CNodeDisplayGlobeCircle} from "./CNodeDisplayGlobeCircle";
import {assert} from "../assert.js";
import {intersectSphere2, V3} from "../threeUtils";
import {
    calculateGST,
    celestialToECEF,
    getJulianDate,
    getSiderealTime,
    raDec2Celestial,
    raDecToAltAz
} from "../CelestialMath";
import {DragDropHandler} from "../DragDropHandler";
import {ViewMan} from "../CViewManager";
import {bestSat} from "../TLEUtils";
import {SITREC_APP, SITREC_SERVER} from "../configUtils";
import {CNodeLabeledArrow} from "./CNodeLabels3D";
import {CNodeDisplaySkyOverlay} from "./CNodeDisplaySkyOverlay";
import {EventManager} from "../CEventManager";

// npm install satellite.js --save-dev
var satellite = require('satellite.js');

// installed with
// npm install astronomy-engine --save-dev
// in the project dir (using terminal in PHPStorm)
var Astronomy = require("astronomy-engine")


// other source of stars, if we need more (for zoomed-in pics)
// https://www.astronexus.com/hyg

// TLE Data is in fixed positions in a 69 character string, which is how the satellite.js library expects it
// but sometimes we get it with spaces removed, as it's copied from a web page
// so we need to fix that
// 1 48274U 21035A 21295.90862762 .00005009 00000-0 62585-4 0 9999
// 2 48274 41.4697 224.1728 0006726 240.5427 202.4055 15.60684462 27671
// becomes
// 0000000001111111111222222222233333333334444444444555555555566666666667777777777
// 1234567890123456789012345678901234567890123456789012345678901234567890123456789
// 1 48274U 21035A   21295.90862762  .00005009  00000-0  62585-4 0  9999
// 2 48274  41.4697 224.1728 0006726 240.5427 202.4055 15.60684462 27671


// 0000000001111111111222222222233333333334444444444555555555566666666667777777777
// 1234567890123456789012345678901234567890123456789012345678901234567890123456789
// 1 48274U 21035A 21296.86547910 .00025288 00000-0 29815-3 0 9999
// 1 48274U 21035A   21296.86547910  .00025288  00000-0  29815-3 0  9999
// 2 48274 41.4699 218.3498 0006788 245.5794 180.5604 15.60749710 27823
// 2 48274  41.4699 218.3498 0006788 245.5794 180.5604 15.60749710 27823

// 0 STARLINK-1007
// 1 44713U 19074A   23216.03168702  .00031895  00000-0  21481-2 0  9995
// 2 44713  53.0546 125.3135 0001151  98.9698 261.1421 15.06441263205939

// from the TLE spec, line 1 has 9 combined fields seprated by a single space
// but some might have leading spaces and some might have trailing spaces
// here's the END index of each combo field:
// note these are 1-indexed, so we need to subtract 1 to get the actual index
// we use 1-indexed because that's how the TLE spec is written
// see: https://en.wikipedia.org/wiki/Two-line_element_set
// we actually use this as the length of the string ending with this field
const tleComboFieldEnds1=[1, 8, 17, 32, 43, 52, 61, 63, 69]
const tleComboFieldEnds2=[1, 7, 16, 25, 33, 42, 51, 69]

function fixTLELine(line, ends) {

    const expectedFields = ends.length;

    assert(line !== undefined, "TLE line is undefined");

    // chop any trailing whitespace from the line
    line = line.trimEnd()

    // split the line into the 9 fields
    // separating by whitespace
    const fields = line.split(/\s+/)
    // if we have expectedFields, we are good
    if (expectedFields === 9) {
        // line 1
        // pad field 2 (the third) with spaces to 8 characters
        fields[2] = fields[2].padEnd(8, " ")
    } else {
        // line 2 should have 8 fields
        // however there might be a space in the last one which would make it 9
        // if so, we need to combine the last two fields
        // including enough spaces to make it the last field 6 charters
        if (fields.length > 8) {
            // only one extra allowed, so assert before we pop it
            assert(fields.length === 9, "TLE line 2 has too many fields: "+line+" "+fields.length+" "+expectedFields);
            fields[7] = fields[7]+fields[8].padStart(6, " ");
            fields.pop() // remove the last field
        }
    }

    assert(fields.length === expectedFields, "TLE line does not have the right number of fields: "+line+" "+fields.length+" "+expectedFields)


    // make a new line so the ENDS of the fields are on the 1-indexed boundaries we want
    let newLine = ""
    for (let i = 0; i < expectedFields; i++) {
        // this is how long we want it to be
        let expectedLength = ends[i]
        let field = fields[i]
        // this is how long it would be if we just added this string
        let actualLength = newLine.length+field.length
        // if it's too short, pad the start of it with spaces
        if (actualLength < expectedLength) {
            // add expectedLength-actualLength spaces to the start of the field
            field = " ".repeat(expectedLength-actualLength)+field
        }
        // if it's too long, that's an error
        if (actualLength > expectedLength) {
            console.error("TLE field "+i+" is too long: "+field)
        }
        newLine += field
        assert(newLine.length === expectedLength, "TLE field "+i+" is not the right length: "+newLine)
    }
//   console.log(line);
//   console.log(newLine);
    return newLine
}


// this is the TLE data for the satellites
// A CTLEData object is created from a TLE file and consists of just
// a satData array, which is an array of objects
// each object has a name, a visible flag, and an array of satrecs
// the satrec is a satellite record created from a single line of a TLE file
// there can be several satrecs with the same name, so we need to store them in an array
// and pick the best one based on the playback date/time

class CTLEData {
    // constructor is passed in a string that contains the TLE file as \n seperated lines
    // extracts in into
    constructor(fileData) {
        const lines = fileData.split('\n');

        this.satData=[]
        let satrec = null;
        let satrecName = null;
        // determine if it's a two line element (no names, lines are labeled 1 and 2) or three (line 0 = name)
        if (lines.length < 3 || !lines[1].startsWith("1") || !lines[2].startsWith("2")) {
            for (let i = 0; i < lines.length; i += 2) {
                const tleLine1 = lines[i + 0];
                const tleLine2 = lines[i + 1];
                if (tleLine1 !== undefined && tleLine2 !== undefined) {
                    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
                    // no name in a two line element, so create one.
                    satrecName = "TLE_"+i

                    // a "satrec" is a satellite record created from a single line of a TLE file
                    // there might be multiple satrecs with the same name, so we need to store them in an array
                    // and later pick the best one based on the playback date/time
                    // each entry in this.satData is an object that has an array of satrecs with the same name
                    if (this.satData[satrecName] === undefined) {
                        // it's a new satData entry
                        // so create a new one with the name and the satrec array, which has one satrec
                        this.satData[satrecName] = {
                            name: satrecName,
                            number: parseInt(satrec.satnum),
                            visible: true,
                            satrecs: [satrec]
                        };
                    }
                    else {
                        // entry already exists, so just add the satrec to the array
                        this.satData[satrecName].satrecs.push(satrec);
                    }

                }
            }
        }   else {
            for (let i = 0; i < lines.length; i += 3) {
                // const tleLine1 = lines[i + 1];
                // const tleLine2 = lines[i + 2];

                if (lines[i + 1] !== undefined && lines[i + 2] !== undefined) {
                    const tleLine1 = fixTLELine(lines[i + 1], tleComboFieldEnds1);
                    const tleLine2 = fixTLELine(lines[i + 2], tleComboFieldEnds2);

                    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
                    satrecName = lines[i]

                    // if it starts with "0 ", then strip that off
                    if (satrecName.startsWith("0 ")) {
                        satrecName = satrecName.substring(2)
                    }

                    if (this.satData[satrecName] === undefined) {
                        // it's a new satData entry
                        // so create a new one with the name and the satrec array, which has one satrec
                        this.satData[satrecName] = {
                            name: satrecName,
                            number: parseInt(satrec.satnum),
                            visible: true,
                            satrecs: [satrec]
                        };
                    }
                    else {
                        // entry already exists, so just add the satrec to the array
                        this.satData[satrecName].satrecs.push(satrec);
                    }


                }
            }
        }

        // after building the arrays of multiple satrecs using the name as the key,
        // convert to an indexed array
        const indexedSatData = []
        for (const [index, satData] of Object.entries(this.satData)) {
             indexedSatData.push(satData)
        }
        this.satData = indexedSatData;

    }





}

// NightSkyFiles - loaded when Sit.nightSky is true, defined in ExtraFiles.js
// export const NightSkyFiles = {
//     IAUCSN: "nightsky/IAU-CSN.txt",
//     BSC5: "nightsky/BSC5.bin",
// }


export class CNodeDisplayNightSky extends CNode3DGroup {

    constructor(v) {
        if (v.id === undefined) v.id = "NightSkyNode"
        super(v);
        //     this.checkInputs(["cloudData", "material"])
        this.addInput("startTime",GlobalDateTimeNode)

        this.planets =      ["Sun",     "Moon",    "Mercury", "Venus",   "Mars",     "Jupiter", "Saturn", "Uranus",  "Neptune", "Pluto"]
        this.planetColors = ["#FFFF40", "#FFFFFF", "#FFFFFF", "#80ff80", "#ff8080", "#FFFF80", "#FF80FF", "#FFFFFF", "#FFFFFF", "#FFFFFF"]

        if (GlobalNightSkyScene === undefined) {
            setupNightSkyScene(new Scene())
        }

   //     GlobalNightSkyScene.matrixWorldAutoUpdate = false


        this.flareAngle = 5
        guiTweaks.add(this, 'flareAngle', 0, 20, 0.1).listen().name("SL Flare Angle").tooltip("Maximum angle of the reflected view vector for a flare to be visible\ni.e. the range of angles between the vector from the satellite to the sun and the vector from the camera to the satellite reflected off the bottom of the satellite (which is parallel to the ground)")

        this.penumbraDepth = 5000
        guiTweaks.add(this, 'penumbraDepth', 0, 100000, 1).listen().name("Earth's Penumbra Depth")
            .tooltip("Vertical depth in meters over which a satellite fades out as it enters the Earth's shadow")

        this.BSC_NumStars = 0;
        this.BSC_MaxMag = -10000;
        this.BSC_RA = [];
        this.BSC_DEC = [];
        this.BSC_MAG = [];
        this.BSC_NAME = [];
        this.commonNames = {};

        // globe used for collision
        // and specifying the center of the Earth
        this.globe = new Sphere(new Vector3(0,-wgs84.RADIUS,0), wgs84.POLAR_RADIUS)

        this.camera = NodeMan.get("lookCamera").camera;
        assert(this.camera, "CNodeDisplayNightSky needs a look camera")

        this.mainCamera = NodeMan.get("mainCamera").camera;
        assert(this.mainCamera, "CNodeDisplayNightSky needs a main camera")

        const satGUI = guiShowHide.addFolder("Satellites");



        this.showSunArrows = Sit.showSunArrows;
        this.sunArrowGroup = new Group();
        this.sunArrowGroup.visible = this.showSunArrows;
        GlobalScene.add(this.sunArrowGroup)
        satGUI.add(this, "showSunArrows").listen().onChange(()=>{
            par.renderOne=true;
            this.sunArrowGroup.visible = this.showSunArrows;
        }).name("Sun Angle Arrows")
        this.addSimpleSerial("showSunArrows")


        this.addCelestialArrow("Venus")
        this.addCelestialArrow("Mars")
        this.addCelestialArrow("Jupiter")
        this.addCelestialArrow("Saturn")
        this.addCelestialArrow("Sun")
        this.addCelestialArrow("Moon")


        this.showFlareRegion = Sit.showFlareRegion;
        this.flareRegionGroup = new Group();
        // get a string of the current time in MS
        const timeStamp = new Date().getTime().toString();
        this.flareRegionGroup.debugTimeStamp = timeStamp;
        this.flareRegionGroup.visible = this.showFlareRegion;
        GlobalScene.add(this.flareRegionGroup)
        satGUI.add(this, "showFlareRegion").listen().onChange(()=>{
            par.renderOne=true;
            this.flareRegionGroup.visible = this.showFlareRegion;
        }).name("Flare Region")
        this.addSimpleSerial("showFlareRegion")

        this.flareBandGroup = new Group();

        new CNodeDisplayGlobeCircle({
            id: "globeCircle1",
            normal: new Vector3(1, 0, 0),
            color: [1,1,0],
            width: 2,
            offset: 3800000,
            container: this.flareBandGroup,
        })

        new CNodeDisplayGlobeCircle({
            id: "globeCircle2",
            normal: new Vector3(1, 0, 0),
            color: [0,1,0],
            width: 2,
            offset: 4900000,
            container: this.flareBandGroup,
        })

        GlobalScene.add(this.flareBandGroup)

        this.showFlareBand = Sit.showFlareBand;
        this.flareBandGroup.visible = this.showFlareBand;
        satGUI.add(this, "showFlareBand").listen().onChange(()=>{
            par.renderOne=true;
            this.flareBandGroup.visible = this.showFlareBand;
        }).name("Flare Band")
        this.addSimpleSerial("showFlareBand")

        this.showSatellites = true;
        satGUI.add(this, "showSatellites").listen().onChange(()=>{
            par.renderOne=true;
            this.satelliteGroup.visible = this.showSatellites;
        }).name("Overall Satellites Flag")
        this.addSimpleSerial("showSatellites")

        this.showStarlink = true;
        satGUI.add(this, "showStarlink").listen().onChange(()=>{
            par.renderOne=true;
            this.filterSatellites();
        }).name("Starlink");

        this.showISS = true;
        satGUI.add(this, "showISS").listen().onChange(()=>{
            par.renderOne=true;
            this.filterSatellites();
        }).name("ISS");

        this.showAllSatellites = false;
        satGUI.add(this, "showAllSatellites").listen().onChange(()=>{
            par.renderOne=true;
            this.filterSatellites();
        }).name("All Satellites");



        this.showSatelliteTracks = Sit.showSatelliteTracks ?? false;
        satGUI.add(this, "showSatelliteTracks").listen().onChange(()=>{
            par.renderOne=true;
            this.satelliteTrackGroup.visible = this.showSatelliteTracks;
        }).name("Satellite Arrows")
        this.addSimpleSerial("showSatelliteTracks")

        this.showSatelliteGround = Sit.showSatelliteGround ?? false;
        satGUI.add(this, "showSatelliteGround").listen().onChange(()=>{
            par.renderOne=true;
            this.satelliteGroundGroup.visible = this.showSatelliteGround;
        }).name("Satellite Ground Arrows")
        this.addSimpleSerial("showSatelliteGround")

        this.showSatelliteNames = false;

        satGUI.add(this,"showSatelliteNames" ).listen().onChange(()=>{
            par.renderOne=true;
            this.satelliteTextGroup.visible = this.showSatelliteNames;
        }).name("Satellite Names")
        this.addSimpleSerial("showSatelliteNames")


        guiMenus.view.add(Sit,"starScale",0,3,0.01).name("Star Brightness").listen()
            .tooltip("Scale factor for the brightness of the stars. 1 is normal, 0 is invisible, 2 is twice as bright, etc.")
        this.addSimpleSerial("starScale")

        satGUI.add(Sit,"satScale",0,6,0.01).name("Sat Brightness").listen()
            .tooltip("Scale factor for the brightness of the satellites. 1 is normal, 0 is invisible, 2 is twice as bright, etc.")
        this.addSimpleSerial("satScale");

        satGUI.add(Sit,"satCutOff",0,0.5,0.001).name("Sat Cut-Off").listen()
            .tooltip("Satellites dimmed to this level or less will not be displayed")
        this.addSimpleSerial("satCutOff");

        guiMenus.file.add(this,"updateStarlink").name("Load Satellite TLE For Date")
            .onChange(function (x) {this.parent.close()})
            .tooltip("Get the latest Starlink TLE data for the current date. This will download the data from the internet, so it may take a few seconds.\nWill also enable the Starlink satellites to be displayed in the night sky.")



        // Sun Direction will get recalculated based on data
        this.toSun = V3(0,0,1)
        this.fromSun = V3(0,0,-1)



        this.celestialSphere = new Group();
        GlobalNightSkyScene.add(this.celestialSphere)

        this.satelliteGroup = new Group();
        GlobalScene.add(this.satelliteGroup)

        // a sub-group for the satellite tracks
        this.satelliteTrackGroup = new Group();
        this.satelliteGroup.add(this.satelliteTrackGroup)
        this.satelliteGroundGroup = new Group();
        this.satelliteGroup.add(this.satelliteGroundGroup)


        this.satelliteTextGroup = new Group();
        this.satelliteTextGroup.visible = false;

        GlobalScene.add(this.satelliteTextGroup)

        this.satelliteTextGroup.matrixWorldAutoUpdate = false


//        console.log("Loading stars")
        this.addStars(this.celestialSphere)

//        console.log("Loading planets")
        this.addPlanets(this.celestialSphere)



        // if (FileManager.exists("starLink")) {
        //     console.log("parsing starlink")
        //     this.replaceTLE(FileManager.get("starLink"))
        // }

        // the file used is now passed in as a parameter "starlink"
        // this is the id of the file in the FileManager
        // which might be the filename, or an ID.
        if (v.starLink !== undefined) {
            console.log("parsing starlink "+v.starLink)
            if (FileManager.exists(v.starLink)) {
                this.replaceTLE(FileManager.get(v.starLink))
            } else {
                if (v.starLink !== "starLink")
                    console.warn("Starlink file/ID "+v.starLink+" does not exist")
            }
        }

//        console.log("Adding celestial grid")
        this.equatorialSphereGroup = new Group();
        this.celestialSphere.add(this.equatorialSphereGroup);
        this.addCelestialSphereLines(this.equatorialSphereGroup, 10);
        this.showEquatorialGrid = (v.showEquatorialGrid !== undefined) ? v.showEquatorialGrid : true;


        guiShowHide.add(this,"showEquatorialGrid" ).listen().onChange(()=>{
            par.renderOne=true;
            this.updateVis()
        }).name("Equatorial Grid")
        this.addSimpleSerial("showEquatorialGrid")


        this.constellationsGroup = new Group();
        this.celestialSphere.add(this.constellationsGroup);
        this.showConstellations = (v.showConstellations !== undefined) ? v.showConstellations : true;
        guiShowHide.add(this,"showConstellations" ).listen().onChange(()=>{
            par.renderOne=true;
            this.updateVis()
        }).name("Constellation Lines")
        this.addSimpleSerial("showConstellations")
        this.addConstellationLines(this.constellationsGroup)
        

        this.addConstellationNames(this.constellationsGroup);

        // For the stars to show up in the lookView
        // we need to enable the layer for everything in the celestial sphere.
        this.celestialSphere.layers.enable(LAYER.LOOK);  // probably not needed
        propagateLayerMaskObject(this.celestialSphere)

        this.useDayNight = (v.useDayNight !== undefined) ? v.useDayNight : true;
        guiShowHide.add(this,"useDayNight" ).listen().onChange(()=>{
            par.renderOne=true;
        }).name("Day/Night Sky")


        this.showEquatorialGridLook = (v.showEquatorialGridLook !== undefined) ? v.showEquatorialGridLook : true;
        guiShowHide.add(this,"showEquatorialGridLook" ).listen().onChange(()=>{
            par.renderOne=true;
            this.updateVis()

        }).name("Equatorial Grid in Look View")
        this.addSimpleSerial("showEquatorialGridLook")

        // same for the flare region
        this.showFlareRegionLook =  false;
        guiShowHide.add(this,"showFlareRegionLook" ).listen().onChange(()=>{
            if (this.showFlareRegionLook) {
                this.flareRegionGroup.layers.mask=LAYER.MASK_LOOKRENDER;
            } else {
                this.flareRegionGroup.layers.mask=LAYER.MASK_HELPERS;
            }
            propagateLayerMaskObject(this.flareRegionGroup);
        }).name("Flare Region in Look View");
        this.addSimpleSerial("showFlareRegionLook");


        this.updateVis()


        this.recalculate()

        this.rot = 0



//        console.log("Done with CNodeDisplayNightSky constructor")
    }

    // See updateArrow
    addCelestialArrow(name) {
        const flagName = "show"+name+"Arrow";
        const groupName = name+"ArrowGroup";
        const obName = name+"ArrowOb";

        this[flagName] = Sit[flagName] ?? false;
        this[groupName] = new CNode3DGroup({id: groupName});
        this[groupName].show(this[flagName]);

        this[obName] = new CNodeLabeledArrow({
            id: obName,
            start: "lookCamera",
            direction: V3(0,0,1),
            length: -200,
            color: this.planetColors[this.planets.indexOf(name)],
            groupNode: groupName,
            label: name,
            labelPosition: "1",
            offsetY: 20,
        })


        guiShowHide.add(this, flagName).listen().onChange(()=>{
            par.renderOne=true;
            this[groupName].show(this[flagName]);
        }).name(name+" Vector");
        this.addSimpleSerial(flagName)
    }


    filterSatellites() {
        if (this.TLEData === undefined) return;

        // iterate over the satellites and flag visiblity
        // based on the name and the GUI flags
        for (const satData of this.TLEData.satData) {

             satData.visible = false;

            if (this.showAllSatellites) {
                satData.visible = true;
                continue;
            }

            if (this.showStarlink && satData.name.startsWith("STARLINK")) {
                satData.visible = true;
                continue;
            }

            if (this.showISS && satData.name.startsWith("ISS (ZARYA)")) {
                satData.visible = true;
                continue;
            }


        }
    }


    updateStarlink() {
        // get the start time
        const startTime = GlobalDateTimeNode.dateNow;

        // go back one day so the TLE's are all before the current time
        // server will add one day to the date to cover things.
        // Say this is day D, we request D-1
        // the server will ask for that +2, so we get
        // D-1 to D+1
        // but this essentiall gives us D-1 to all of D, which is what we want
        // this still gives us some times in D that are in the future,
        // but those are handled by the bestSat function
        startTime.setDate(startTime.getDate()-1);

        // convert to YYYY-MM-DD
        const dateStr = startTime.toISOString().split('T')[0];
        // get the file from the proxyStarlink URL
        // note this is NOT a dynamic file
        // it fixed based on the date
        // so we don't need to rehost it
        const url = SITREC_SERVER+"proxyStarlink.php?request="+dateStr+"&type=LEO";

        // TODO: remove the old starlink from the file manager.

        console.log("Getting starlink from "+url)
        const id = "starLink_"+dateStr+".tle";
        FileManager.loadAsset(url, id).then( (data)=>{
           // this.replaceTLE(data)

            const fileInfo = FileManager.list[id];

            // give it a proper filename so when it's re-loaded
            // it can be parsed correctly
            fileInfo.filename = id;

            // kill the static URL to force a rehost with this name
            fileInfo.staticURL = null;

            fileInfo.dynamicLink = true;

            DragDropHandler.handleParsedFile(id, fileInfo.data)
            EventManager.dispatchEvent("tleLoaded", {})
        });

    }

    updateVis() {

        this.equatorialSphereGroup.visible = this.showEquatorialGrid;
        this.constellationsGroup.visible = this.showConstellations;

        // equatorial lines might not want to be in the look view
        this.equatorialSphereGroup.layers.mask = this.showEquatorialGridLook ? LAYER.MASK_MAINRENDER : LAYER.MASK_HELPERS;

        this.sunArrowGroup.visible = this.showSunArrows;
        this.VenusArrowGroup.show(this.showVenusArrow);
        this.MarsArrowGroup.show(this.showMarsArrow);
        this.JupiterArrowGroup.show(this.showJupiterArrow);
        this.SunArrowGroup.show(this.showSunArrow);
        this.MoonArrowGroup.show(this.showMoonArrow);
        this.flareRegionGroup.visible = this.showFlareRegion;
        this.flareBandGroup.visible = this.showFlareBand;
        this.satelliteGroup.visible = this.showSatellites;
        this.satelliteTrackGroup.visible = this.showSatelliteTracks;
        this.satelliteGroundGroup.visible = this.showSatelliteGround;
        this.satelliteTextGroup.visible = this.showSatelliteNames;


        propagateLayerMaskObject(this.equatorialSphereGroup)
    }

    modDeserialize(v) {
        super.modDeserialize(v);
        // a guid value's .listen() only updates the gui, so we need to do it manually
        // perhaps better to flag the gui system to update it?
        this.updateVis();
    }

    update(frame) {

        if (this.useDayNight) {
            const sun = Globals.sunTotal / Math.PI;
            this.sunLevel = sun;
            const blue = new Vector3(0.53,0.81,0.92)
            blue.multiplyScalar(sun)
            this.skyColor = new Color(blue.x, blue.y, blue.z)
        }





        this.celestialSphere.quaternion.identity()
        this.celestialSphere.updateMatrix()

        // do adjustements for date/time, and maybe precession, here
        // .....

        // The ESU Coordinate system is right handed Y-Up
        // X = East
        // Y = Up
        // Z = South (-Z = North)

        // With the identity transform, the Celestial Sphere (CS) has:
        // RA of 0 along the X axis, i.e. EAST
        // Dec of 90 ia along the Y Axis, i.e. UP

        // The CS is in Standard ECEF, right handed, Z = up

        // a good test is where the north star ends up. No matter what date, etc,
        // Polaris has dec of about 89°, and should always be north, tilted down by the latitude


        var nowDate = this.in.startTime.dateNow;
        const fieldRotation = getSiderealTime(nowDate, 0) - 90

        // we just use the origin of the local ESU coordinate systems
        // to tilt the stars by latitude and rotate them by longitude
        const lat1 = radians(Sit.lat);
        const lon1 = radians(Sit.lon);

        // note, rotateOnAxis is in LOCAL space, so we can't just chain them here
        // we need to rotate around the WORLD Z then the WORLD X

//         // Create a matrix for rotation around Y-axis by 180° to get north in the right place
        const rotationMatrixY = new Matrix4();
        rotationMatrixY.makeRotationY(radians(180));
//
// // Create a matrix for rotation around Z-axis by the longitude (will alls include data/time here)
        const rotationMatrixZ = new Matrix4();
        rotationMatrixZ.makeRotationZ(radians(Sit.lon + fieldRotation));
//
// // Create a matrix for rotation around X-axis by the latitude (tilt)
        const rotationMatrixX = new Matrix4();
        rotationMatrixX.makeRotationX(radians(Sit.lat));
//
//         //Combine them, so they are applied in the order Y, Z, X
//         rotationMatrixX.multiply(rotationMatrixZ.multiply(rotationMatrixY))
//
//         // apply them
//         this.celestialSphere.applyMatrix4(rotationMatrixX)

        this.celestialSphere.applyMatrix4(rotationMatrixY)
        this.celestialSphere.applyMatrix4(rotationMatrixZ)
        this.celestialSphere.applyMatrix4(rotationMatrixX)


        var nowDate = this.in.startTime.dateNow

        let observer = new Astronomy.Observer(Sit.lat, Sit.lon, 0);
        // update the planets position for the current time
        for (const [name, planet] of Object.entries(this.planetSprites)) {
            this.updatePlanetSprite(name, planet.sprite, nowDate, observer,100)
        }

        if ( this.showSatellites && this.TLEData) {
            // Update satellites to correct position for nowDate
            // for (const [index, sat] of Object.entries(this.TLEData.satData)) {
            //     const success = this.updateSatelliteSprite(sat.spriteText, sat, nowDate)
            // }

            this.updateAllSatellites(nowDate)
        }
//        console.log (`out of ${numSats}, ${valid} of them are valid`)


//        this.updateSatelliteScales(this.camera)

        //const fromSun = this.fromSun

        if (NodeMan.exists("globeCircle1")) {
            const globeCircle1 = NodeMan.get("globeCircle1")
            globeCircle1.normal = this.fromSun.clone().normalize();
            globeCircle1.rebuild();
            const globeCircle2 = NodeMan.get("globeCircle2")
            globeCircle2.normal = this.fromSun.clone().normalize();
            globeCircle2.rebuild();
        }



    }

    updateSatelliteScales(view) {

        const camera = view.camera;

        // for optimization we are not updating every scale on every frame
        if (camera.satTimeStep === undefined) {
            camera.satTimeStep = 5
            camera.satStartTime = 0;
        } else {
            camera.satStartTime++
            if (camera.satStartTime >= camera.satTimeStep)
                camera.satStartTime = 0;
        }

     //   console.log("camera.satStartTime = "+camera.satStartTime)

        // what's this doing here? nneds to be called per camera, but not in a satellite specific function
        this.starMaterial.uniforms.cameraFOV.value = camera.fov;

        let starScale = Sit.starScale/window.devicePixelRatio;

        // scale based on sky brightness at camera location
        const sunNode = NodeMan.get("theSun",true);
        const skyBrightness = sunNode.calculateSkyBrightness(camera.position);
        //console.log("skyBrightness = "+skyBrightness)
        let attentuation = Math.max(0, 1 - skyBrightness);
        starScale *= attentuation

        assert(starScale < 2, "starScale is too big: "+starScale);
        this.starMaterial.uniforms.starScale.value = starScale;


        var cameraPos = camera.position;
        var tanHalfFOV = Math.tan(radians(camera.fov/2))

        const toSun = this.toSun;
        const fromSun = this.fromSun
        // For the globe, we position it at the center of a sphere or radius wgs84.RADIUS
        // but for the purposes of occlusion, we use the POLAR_RADIUS
        // erring on not missing things
        // this is a slight fudge, but most major starlink satellites sightings are over the poles
        // and atmospheric refraction also makes more visible.

        const raycaster = new Raycaster();
        var hitPoint = new Vector3();
        var hitPoint2 = new Vector3();


        if ( this.showSatellites && this.TLEData) {
            this.satelliteMaterial.uniforms.cameraFOV.value = camera.fov;
            this.satelliteMaterial.uniforms.satScale.value = Sit.satScale/window.devicePixelRatio;

            const positions = this.satelliteGeometry.attributes.position.array;
            const magnitudes = this.satelliteGeometry.attributes.magnitude.array;

            // get the forward vector (-z) of the camera matrix, for perp distance
            const cameraForward = new Vector3(0,0,-1).applyQuaternion(camera.quaternion);

            for (let i = camera.satStartTime; i < this.TLEData.satData.length; i++) {
                const satData = this.TLEData.satData[i];

                // bit of a hack for visiblity, just set the scale to 0
                // and skip the update
                // TODO: the first few
                if (!satData.visible) {
                    magnitudes[i] = 0
                    const spriteText = satData.spriteText;
                    spriteText.scale.set(0,0,0);
                    continue;
                }

                // satellites might have invalid positions if we load a TLE that's not close to the time we are calculating for
                // this would be updated when updating the satellites position
                if (satData.invalidPosition) {
                    i++;
                    continue;
                }

                // stagger updates unless it has an arrow.
                if ((i - camera.satStartTime) % camera.satTimeStep !== 0 && !satData.hasArrow) {
                    i++;
                    continue;
                }

                assert(satData.eus !== undefined, `satData.eus is undefined, i= ${i}, this.TLEData.satData.length = ${this.TLEData.satData.length} `)

                const satPosition = satData.eus;

                const camToSat = satPosition.clone().sub(this.camera.position)

                // get the perpendicular distance to the satellite, and use that to scale the name
                const distToSat = camToSat.dot(cameraForward);
                const nameScale  = 0.025 * distToSat * tanHalfFOV;
                const sprite = satData.spriteText;
                sprite.scale.set(nameScale * sprite.aspect, nameScale, 1);

                let scale = 0.1;                // base value for scale
                let darknessMultiplier = 0.3    // if in dark, multiply by this
                var fade = 1

                raycaster.set(satPosition, toSun)
                if (intersectSphere2(raycaster.ray, this.globe, hitPoint, hitPoint2)) {

                    const midPoint = hitPoint.clone().add(hitPoint2).multiplyScalar(0.5)
                    const originToMid = midPoint.clone().sub(this.globe.center)
                    const occludedMeters = this.globe.radius - originToMid.length()
                    if (occludedMeters < this.penumbraDepth) {

                        // fade will give us a value from 1 (no fade) to 0 (occluded)
                        fade = 1 - occludedMeters/this.penumbraDepth

                        scale *= darknessMultiplier + (1 - darknessMultiplier) * fade
                    } else {
                        fade = 0;
                        scale *= darknessMultiplier;
                        this.removeSatArrows(satData);
                    }
                }

                // fade will be 1 for full visible sats, < 1 as they get hidden
                if (fade > 0) {

                    // checking for flares
                    // we take the vector from the camera to the sat
                    // then reflect that about the vecotr from the globe center to the sat
                    // then measure the angle between that and the toSun vector
                    // if it's samall (<5°?) them glint

                    const camToSat = satPosition.clone().sub(this.camera.position)

                    // check if it's visible
                    raycaster.set(this.camera.position, camToSat)
                    var belowHorizon = intersectSphere2(raycaster.ray, this.globe, hitPoint, hitPoint2)
                    if (!belowHorizon) {


                        const globeToSat = satPosition.clone().sub(this.globe.center).normalize()
                        const reflected = camToSat.clone().reflect(globeToSat).normalize()
                        const dot = reflected.dot(toSun)
                        const glintAngle = Math.abs(degrees(Math.acos(dot)))

                        const altitudeKM = (satPosition.clone().sub(this.globe.center).length() - wgs84.RADIUS) / 1000

                        // if (altitudeKM < 450) {
                        //     scale *= 3 // a bit of a dodgy patch to make low atltitde trains stand out.
                        // }

                        const spread = this.flareAngle
                        const glintSize = 5;
                        if (glintAngle < spread) {
                            // we use the square of the angle (measured from the start of the spread)
                            // as the extra flare, to concentrate it in the middle
                            const glintScale = 1 + fade * glintSize * (spread - glintAngle) * (spread - glintAngle) / (spread * spread)
                            scale *= glintScale

                            // arrows from camera to sat, and from sat to sun
                            var arrowHelper = DebugArrowAB(satData.name, this.camera.position, satPosition, (belowHorizon?"#303030":"#FF0000"), true, this.sunArrowGroup, 10, LAYER.MASK_HELPERS)
                            var arrowHelper2 = DebugArrowAB(satData.name + "sun", satPosition,
                                satPosition.clone().add(toSun.clone().multiplyScalar(10000000)), "#c08000", true, this.sunArrowGroup, 10, LAYER.MASK_HELPERS)
                           // var arrowHelper3 = DebugArrowAB(satData.name + "reflected", satPosition,
                           //     satPosition.clone().add(reflected.clone().multiplyScalar(10000000)), "#00ff00", true, this.sunArrowGroup, 0.025, LAYER.MASK_HELPERS)
                            satData.hasArrow = true;
                        } else {
                            this.removeSatArrows(satData);

                            // do the scale again to incorporate al
                            // satData.sprite.scale.set(scale, scale, 1);

                        }
                    } else {
                        this.removeSatArrows(satData);
                    }
                }

                if (scale < Sit.satCutOff)
                    scale = 0;

                magnitudes[i] = scale
            }
            this.satelliteGeometry.attributes.magnitude.needsUpdate = true;
        }
    }

    updateSatelliteText(view) {
        const numSats = this.TLEData.satData.length;
        for (let i = 0; i < numSats; i++) {
            const satData = this.TLEData.satData[i];
            const sprite = satData.spriteText;
            if (sprite) {
                const pos = satData.eus;
                const offsetPost = view.offsetScreenPixels(pos, 0, 30);
                satData.spriteText.position.copy(offsetPost);
            }
        }
    }



// Bright Star Catalog parsed data
// Using seperate arrays for speed


    loadStarData() {
        const buffer = FileManager.get("BSC5")
// https://observablehq.com/@visnup/yale-bright-star-catalog

        const littleEndian = true;

        const utf8decoder = new TextDecoder()
        const view = new DataView(buffer)
        let offset = 0
        const star0 = view.getInt32(offset, littleEndian);
        offset += 4;
        const star1 = view.getInt32(offset, littleEndian);
        offset += 4;
        const starn = view.getInt32(offset, littleEndian);
        offset += 4;
        const stnum = view.getInt32(offset, littleEndian);
        offset += 4;
        const mprop = view.getInt32(offset, littleEndian);
        offset += 4;
        const nmag = view.getInt32(offset, littleEndian);
        offset += 4;
        const nbent = view.getInt32(offset, littleEndian);
        offset += 4;
//    const view = new DataView(buffer.slice(28))

        let nInput = 0;
        while (offset < -starn * nbent - 28) {
            const xno = view.getFloat32(offset, littleEndian);
            offset += 4
            const sra0 = view.getFloat64(offset, littleEndian);
            offset += 8
            const sdec0 = view.getFloat64(offset, littleEndian);
            offset += 8
            const is = utf8decoder.decode(new Uint8Array([view.getUint8(offset), view.getUint8(offset + 1)]));
            offset += 2
            let mag = view.getInt16(offset, littleEndian) / 100;
            offset += 2
            const xrpm = view.getFloat32(offset, littleEndian);
            offset += 4
            const xdpm = view.getFloat32(offset, littleEndian);
            offset += 4

            // assert mag is within expected range for stars, and not NaN
            assert(!isNaN(mag) &&  mag >= -2 && mag <= 8, "mag out of range: "+mag +" at nInput = "+nInput)

            if (sra0 === 0 && sdec0 === 0) {
                // ra and dec of zero indicates a placeholder entry, and is skipped
//                console.log("Skipping star with ra, dec, 0,0, probably a bad entry, nInput = " + nInput)
                // setting to 15 will make it invisible
                // we are not skipping, as we need the numbers in sync to get the names
                mag = 15;
            } else {
                // finding the maximum VALID magnitude
                // so ignoring that 15
                if (mag > this.BSC_MaxMag)
                    this.BSC_MaxMag = mag;
            }

            this.BSC_RA[this.BSC_NumStars] = sra0;
            this.BSC_DEC[this.BSC_NumStars] = sdec0;
            this.BSC_MAG[this.BSC_NumStars] = mag;
            this.BSC_NumStars++;




            nInput++;
        }
    }

// Okab              HR 7235      zet   ζ     Aql A    19054+1352  2.99  V  93747 177724 286.352533  13.863477 2018-06-01
// 7235 17Zet AqlBD+13 3899 177724104461 716I  12026  11724    190048.8+134253190524.6+135148 46.86  3.25 2.99  +0.01 -0.01  0.00   A0Vn               -0.005-0.096 +.045-025SB    331  8.4 158.6AC   3*


// load the IAU CSN (Common Star Names)
// extract those with a HR designation, which is the index into the BSC
// stor them in an array indexed on that
    loadCommonStarNames() {
        const lines = FileManager.get("IAUCSN").split('\n');
        for (const line of lines) {
            if (line[0] == '#') {
                // console.log("Skipping "+line)
            } else {
                const name = line.substring(0, 18).trim()
                const designation = line.substring(36, 49).trim()
                if (designation.startsWith("HR")) {
                    const hr = parseInt(designation.substring(3))
                    this.commonNames[hr] = name;
                    // console.log("Found HR "+hr+" "+name)
                }

            }
        }
    }


// // The text file version with names
// // File format at http://tdc-www.harvard.edu/catalogs/bsc5.readme
// function loadStarDataWithNames() {
//     const lines = FileManager.get("BSC5_DAT").split('\n');
//     console.log(lines[0]);
//     console.log(lines[1]);
//
//     BSC_NumStars = 0
//     for (const line of lines) {
//         const name = line.substring(4,13).trim()
//         BSC_NAME[BSC_NumStars] = name;
//       //  console.log(name)
//
//
//         BSC_NumStars++
//         if (BSC_NumStars > 100) break;
//     }
// }


    addCelestialSphereLines(scene, gap = 15, color = 0x808080) {

        const sphereRadius = 100; // Radius of the celestial sphere
        const material = new LineBasicMaterial({color: color}); // Line color
        const materialWhite = new LineBasicMaterial({color: "#FF00FF"}); // WHite Line color
        const segments = 100; // Number of segments per line

// Function to create a single line
        function createLine(start, end) {
            const geometry = new BufferGeometry().setFromPoints([start, end]);
            return new Line(geometry, material);
        }

// Adding lines for RA (Right Ascension) these go from celestial N to S poles, like lines of longitude
        for (let ra = 0; ra < 360; ra += gap) {
            const raRad = MathUtils.degToRad(ra);
            const points = [];
            for (let dec = -90; dec <= 90; dec += 1.8) {
                const decRad = MathUtils.degToRad(dec);
                const equatorial = raDec2Celestial(raRad, decRad, sphereRadius)
                points.push(new Vector3(equatorial.x, equatorial.y, equatorial.z));
            }
            const geometry = new BufferGeometry().setFromPoints(points);
            const line = new Line(geometry, ra === 0 ? materialWhite : material);
            scene.add(line);
        }

// Adding lines for Dec (Declination), - these go all the way around, like lines of latitude
        for (let dec = -90; dec <= 90; dec += gap) {
            const decRad = MathUtils.degToRad(dec);
            const points = [];
            for (let ra = 0; ra <= 360; ra += 1.5) {
                const raRad = MathUtils.degToRad(ra);
                const equatorial = raDec2Celestial(raRad, decRad, sphereRadius)
                points.push(new Vector3(equatorial.x, equatorial.y, equatorial.z));
            }
            const geometry = new BufferGeometry().setFromPoints(points);
            const line = new Line(geometry, (dec === 90 - gap) ? materialWhite : material);
            scene.add(line);
        }
    }


//     addStars(scene) {
//
//         assert(Sit.lat !== undefined, "addStars needs Sit.lat")
//         assert(Sit.lon !== undefined, "addStars needs Sit.lon")
//
//         this.loadCommonStarNames();
//         this.loadStarData();
//         //  loadStarDataWithNames();
//
//         // Setup the sprite material
//         const spriteMap = new TextureLoader().load('MickStar.png'); // Load a star texture
//         const spriteMaterial = new SpriteMaterial({map: spriteMap, color: 0xffffff});
//
// // Create stars
//         const numStars = this.BSC_NumStars;
//         const sphereRadius = 100; // 100m radius
//
//         for (let i = 0; i < numStars; i++) {
//             const sprite = new Sprite(spriteMaterial);
//
//             // Assuming RA is in radians [0, 2π] and Dec is in radians [-π/2, π/2]
//             const ra = this.BSC_RA[i];   // Right Ascension
//             const dec = this.BSC_DEC[i]; // Declination
//             const mag = this.BSC_MAG[i]; // Magnitude
//             const equatorial = raDec2Celestial(ra, dec, sphereRadius)
//
//             // Set the position and scale of the sprite
//             sprite.position.set(equatorial.x, equatorial.y, equatorial.z);
//
//             let scale = Math.pow((this.BSC_MaxMag + 0.5 - mag) * 0.1, 2);
//
//             scale *= Sit.starScale ?? 1;
//
//             sprite.scale.set(scale, scale, 1); // Random scale between 0.5 and 1.5
//             // Add sprite to scene
//             scene.add(sprite);
//         }
//
//     }

    addStars(scene) {

        this.loadCommonStarNames();
        this.loadStarData();
        //  loadStarDataWithNames();

        // Setup the sprite material
        const spriteMap = new TextureLoader().load(SITREC_APP+'data/images/nightsky/MickStar.png'); // Load a star texture
        const spriteMaterial = new SpriteMaterial({map: spriteMap, color: 0xffffff});

        const numStars = this.BSC_NumStars;
        const sphereRadius = 100; // 100m radius

// Define geometry
        let starGeometry = new BufferGeometry();

// Allocate arrays for positions and magnitudes
        let positions = new Float32Array(numStars * 3); // x, y, z for each star
        let magnitudes = new Float32Array(numStars); // magnitude for each star

        for (let i = 0; i < numStars; i++) {
            // Convert RA, Dec to 3D position
            const equatorial = raDec2Celestial(this.BSC_RA[i], this.BSC_DEC[i], sphereRadius);

            // Store position
            positions[i * 3] = equatorial.x;
            positions[i * 3 + 1] = equatorial.y;
            positions[i * 3 + 2] = equatorial.z;

            const mag = this.BSC_MAG[i]; // Magnitude
            let scale = Math.pow((this.BSC_MaxMag + 0.5 - mag) * 0.1, 3);
         //   scale *= Sit.starScale ?? 1;

            // Store magnitude in W component
            magnitudes[i] = scale //mag;        //this.BSC_MAG[i];
        }

// Attach data to geometry
        starGeometry.setAttribute('position', new BufferAttribute(positions, 3));
        starGeometry.setAttribute('magnitude', new BufferAttribute(magnitudes, 1));

// Custom shaders
        const customVertexShader = `
        // Vertex Shader
varying vec3 vColor;

uniform float maxMagnitude;
uniform float minSize;
uniform float maxSize;
uniform float cameraFOV; // Uniform for camera's field of view
uniform float starScale;

attribute float magnitude;

void main() {
    vColor = vec3(1.0); // White color, modify as needed

    // Adjust size based on magnitude
//    float size = mix(maxSize, minSize, (magnitude / maxMagnitude));
    float size = mix(minSize, maxSize, magnitude);
    
    // Adjust size based on camera FOV
    size *= 3.0 * (30.0 / cameraFOV) * starScale;
   
    
    // Billboard transformation (make the sprite always face the camera)
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = size; // * (300.0 / -mvPosition.z); // Adjust size based on distance
}`; // Your vertex shader code


        const customFragmentShader = `// Fragment Shader
varying vec3 vColor;

uniform sampler2D starTexture;

void main() {
    // Basic circular billboard
    vec2 uv = gl_PointCoord.xy * 2.0 - 1.0;
    float alpha = 1.0 - dot(uv, uv);
  //  if (alpha < 0.0) discard; // Gives a circular shape

    // Apply texture
    vec4 textureColor = texture2D(starTexture, gl_PointCoord);
    gl_FragColor = vec4(vColor, 1.0) * textureColor * alpha;
}`; // Your fragment shader code

// Material with shaders
        this.starMaterial = new ShaderMaterial({
            vertexShader: customVertexShader,
            fragmentShader: customFragmentShader,
            uniforms: {
                maxMagnitude: { value: this.BSC_MaxMag },
                minSize: { value: 1.0 },
                maxSize: { value: 20.0 },
                starTexture: { value: new TextureLoader().load(SITREC_APP+'data/images/nightsky/MickStar.png') },
                cameraFOV: { value: 30},
                starScale: { value: Sit.starScale/window.devicePixelRatio}
            },
            transparent: true,
            depthTest: true,
        });

// Create point cloud
        let stars = new Points(starGeometry, this.starMaterial);

// Add to scene
        scene.add(stars);

    }


    addConstellationNames(scene) {
        const constellations = FileManager.get("constellations");
        const features = constellations.features;
//        console.log(features)

    }

    addConstellationLines(scene) {
        // we will be adding multiple line segments to the scene
        // all the same color, so use on object
        const material = new LineBasicMaterial({color: 0x808080}); // Line color

        const constellationsLines = FileManager.get("constellationsLines");
        // this is a structured GeoJSON object, get the array of features
        const features = constellationsLines.features;
        for (const feature of features) {
            // feature.geometry.coordinates is an array of arrays of Lon/Lat pairs
            // we want to convert these to ECEF coordinates
            // and then create a line segment between each pair

         //   if (feature.id !== "UMi") continue;

            // let's create an array of ECEF coordinates, two each for each line
            const segments = [];
            for (let c of feature.geometry.coordinates) {

                // c is now an array of multiple arrays of two Lat/Lon pairs
                // need to create segments between each of them
                const p0 = c[0];
                const ra0 = MathUtils.degToRad(Number(p0[0]));
                const dec0 = MathUtils.degToRad(Number(p0[1]));
                let equatorial0 = raDec2Celestial(ra0, dec0, 100);
                for (let i = 1; i < c.length; i++) {
                    const p1 = c[i];
                    // convert to ECEF
                    const ra1 = MathUtils.degToRad(Number(p1[0]));
                    const dec1 = MathUtils.degToRad(Number(p1[1]));
                    const equatorial1 = raDec2Celestial(ra1, dec1, 100);
                    segments.push(new Vector3(equatorial0.x, equatorial0.y, equatorial0.z));
                    segments.push(new Vector3(equatorial1.x, equatorial1.y, equatorial1.z));
                    equatorial0 = equatorial1;
                }
            }

            // create the buffer geometry for the line segments
            const geometry = new BufferGeometry().setFromPoints(segments);


            // and create the multi-segment line
            const line = new LineSegments(geometry, material);
            scene.add(line);
        }


    }


    addPlanets(scene) {

        assert(Sit.lat !== undefined, "addStars needs Sit.lat")
        assert(Sit.lon !== undefined, "addStars needs Sit.lon")

        // Setup the sprite material

        const starMap = new TextureLoader().load(SITREC_APP+'data/images/nightsky/MickStar.png'); // Load a star texture

        const sunMap = new TextureLoader().load(SITREC_APP+'data/images/nightsky/MickSun.png'); // Load a star texture

        // alternative way to load a texture, using the file manager, and the "files" list in the Sit
        //const sunMapImg = FileManager.get("sun");
        //const sunMap = new Texture(sunMapImg)
        //sunMap.needsUpdate = true; // Load a star texture

        const moonMap = new TextureLoader().load(SITREC_APP+'data/images/nightsky/MickMoon.png'); // Load a star texture
//        const spriteMaterial = new SpriteMaterial({map: spriteMap, color: 0x00ff00});

        const sphereRadius = 100; // 100m radius

        let date = this.in.startTime.dateNow;

        let observer = new Astronomy.Observer(Sit.lat, Sit.lon, 0);

        this.planetSprites = {}

        var n = 0;
        for (const planet of this.planets) {

            var spriteMap = starMap;
            if (planet === "Sun") spriteMap = sunMap
            if (planet === "Moon") spriteMap = moonMap

            const color = this.planetColors[n++];
            const spriteMaterial = new SpriteMaterial({map: spriteMap, color: color});
            const sprite = new Sprite(spriteMaterial);

            this.updatePlanetSprite(planet, sprite, date, observer,sphereRadius)
            this.planetSprites[planet].color = color

            // Add sprite to scene
            scene.add(sprite);

        }
    }

    /*
// Actual data used.
0 STARLINK-1007
1 44713U 19074A   23216.03168702  .00031895  00000-0  21481-2 0  9995
2 44713  53.0546 125.3135 0001151  98.9698 261.1421 15.06441263205939

// Sample given by ChatGPT
1 25544U 98067A   21274.58668981  .00001303  00000-0  29669-4 0  9991
2 25544  51.6441 179.2338 0008176  49.9505 310.1752 15.48903444320729
     */


    replaceTLE(tle) {
        this.removeSatellites()
        this.TLEData = new CTLEData(tle)
        this.filterSatellites()
        this.addSatellites(this.satelliteGroup, this.satelliteTextGroup)
    }

    removeSatellites() {
        if (this.TLEData !== undefined) {

            if (this.satelliteGeometry) {
                this.satelliteGeometry.dispose();
                this.satelliteGeometry = null;
            }
            if (this.satelliteMaterial) {
                if (this.satelliteMaterial.uniforms.starTexture.value) {
                    this.satelliteMaterial.uniforms.starTexture.value.dispose();
                }
                this.satelliteMaterial.dispose();
                this.satelliteMaterial = null;
            }

            if (this.satellites) {
                this.satelliteGroup.remove(this.satellites);
                this.satellites = null;
            }

            // we no longer use individual sprites for the satellites
            // but they are still used for text.
            for (const [index, satData] of Object.entries(this.TLEData.satData)) {
                // satData.sprite.material.dispose();
                // this.satelliteGroup.remove(sat.sprite)
                //sat.sprite = null;

                satData.spriteText.material.dispose();
                this.satelliteTextGroup.remove(satData.spriteText)
                satData.spriteText = null;
            }
            this.satData = undefined;
        }
    }



    addSatellites(scene, textGroup) {
        assert(Sit.lat !== undefined, "addSatellites needs Sit.lat");
        assert(Sit.lon !== undefined, "addSatellites needs Sit.lon");

        // Define geometry for satellites
        this.satelliteGeometry = new BufferGeometry();


        const len = this.TLEData.satData.length;

        // Allocate arrays for positions and colors
        let positions = new Float32Array(len * 3); // x, y, z for each satellite
        let colors = new Float32Array(len * 3); // r, g, b for each satellite
        let magnitudes = new Float32Array(len); // magnitude for each satellite

        // Custom shaders
        const customVertexShader = `
    varying vec3 vColor;
    uniform float maxMagnitude;
    uniform float minSize;
    uniform float maxSize;
    uniform float cameraFOV;
    uniform float satScale;
    attribute float magnitude;
    attribute vec3 color;
    varying float vDepth;

    void main() {
        vColor = color;
        
        // if magnitude is 0 then do not draw it
        if (magnitude == 0.0) {
            gl_Position = vec4(0,0,0,0);
            gl_PointSize = 0.0;
            return;
        }

        float size = mix(minSize, maxSize, magnitude);
        size *= 3.0 * (30.0 / cameraFOV) * satScale;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = size;
        vDepth = gl_Position.w;
    }`;

        const customFragmentShader = `
    varying vec3 vColor;
    uniform float nearPlane;
    uniform float farPlane;
    varying float vDepth;
    uniform sampler2D starTexture;

    void main() {
        vec2 uv = gl_PointCoord.xy * 2.0 - 1.0;
        float alpha = 1.0 - dot(uv, uv);
        if (alpha < 0.0) discard;

        vec4 textureColor = texture2D(starTexture, gl_PointCoord);
        gl_FragColor = vec4(vColor, 1.0) * textureColor * alpha;

        float z = (log2(max(nearPlane, 1.0 + vDepth)) / log2(1.0 + farPlane)) * 2.0 - 1.0;
        gl_FragDepthEXT = z * 0.5 + 0.5;
    }`;

        // Material with shaders
        this.satelliteMaterial = new ShaderMaterial({
            vertexShader: customVertexShader,
            fragmentShader: customFragmentShader,
            uniforms: {
                maxMagnitude: { value: this.BSC_MaxMag },
                minSize: { value: 0.0 },  // was 1.0, but we want to scale to zero if needed
                maxSize: { value: 20.0 },
                starTexture: { value: new TextureLoader().load(SITREC_APP+'data/images/nightsky/MickStar.png') },
                cameraFOV: { value: 30 },
                satScale: { value: Sit.satScale/window.devicePixelRatio },
                ...sharedUniforms,
            },
            transparent: true,
            depthTest: true,
        });

        for (let i = 0; i < this.TLEData.satData.length; i++) {
            const sat = this.TLEData.satData[i];

            // Calculate satellite position
            const position = V3();

            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            magnitudes[i] = 0.1;



            sat.eus = V3();

            // Manage sprite text separately
            var name = sat.name.replace("0 STARLINK", "SL").replace("STARLINK", "SL");
            // strip whitespae off the end
            name = name.replace(/\s+$/, '');
            const spriteText = new SpriteText(name, 0.01, "white", {depthTest:true} );
            spriteText.layers.mask = LAYER.MASK_LOOK  ;

            sat.spriteText = spriteText;
            textGroup.add(spriteText);

            // Assign a color to each satellite (example: random color)


        // SL-0000 names have are yellow, SL-00000 are orange
            // use the length of the name 7 or 8 to determine the color
            let color = new Color(0xFFFFC0);
            let length = name.length;
            if (length > 7) {
                color = new Color(0xFFA080);
            }

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

        }

        // Attach data to geometry
        this.satelliteGeometry.setAttribute('position', new BufferAttribute(positions, 3));
        this.satelliteGeometry.setAttribute('color', new BufferAttribute(colors, 3));
        this.satelliteGeometry.setAttribute('magnitude', new BufferAttribute(magnitudes, 1));

        // Create point cloud for satellites
        this.satellites = new Points(this.satelliteGeometry, this.satelliteMaterial);

        // Disable frustum culling for satellites
        this.satellites.frustumCulled = false;

        // Add to scene
        scene.add(this.satellites);
    }


    calcSatEUS(sat, date) {
        const positionAndVelocity = satellite.propagate(sat, date);
        if (positionAndVelocity && positionAndVelocity.position) {
            const positionEci = positionAndVelocity.position;

            var gmst = satellite.gstime(date);
            var ecefK = satellite.eciToEcf(positionEci, gmst);
            let ecef = V3(ecefK.x * 1000, ecefK.y * 1000, ecefK.z * 1000);

            // adjust ecef to account for wgs84 ellipsoid
            // rendering uses a sphere, so we need to adjust the position to account for the ellipsoid
            // so the viewpoint is correct

            // simple approximation
            //    ecef.z = ecef.z / (1-wgs84.FLATTENING)

            // const a = 6378137.0; // semi-major axis (equatorial radius)
            // const b = 6356752.314245; // semi-minor axis (polar radius)
            //
            // const scale_factor = b / a;
            // ecef.z = ecef.z / scale_factor;

            // // more complex
            // // convert ellipsoidal to spherical ECEF
            // see discussion: https://www.metabunk.org/threads/the-secret-of-skinwalker-ranch-s03e09-uap-disappearing-into-thin-air-satellite-going-behind-cloud-entering-earths-shadow.13469/post-316283

            // function ecefToLLA(x, y, z) {
            //     const a = 6378137.0; // semi-major axis
            //     const e = 0.081819190842622; // first eccentricity
            //
            //     const b = Math.sqrt(a * a * (1 - e * e));
            //     const ep = Math.sqrt((a * a - b * b) / (b * b));
            //     const p = Math.sqrt(x * x + y * y);
            //     const th = Math.atan2(a * z, b * p);
            //     const lon = Math.atan2(y, x);
            //     const lat = Math.atan2((z + ep * ep * b * Math.sin(th) * Math.sin(th) * Math.sin(th)), (p - e * e * a * Math.cos(th) * Math.cos(th) * Math.cos(th)));
            //     const N = a / Math.sqrt(1 - e * e * Math.sin(lat) * Math.sin(lat));
            //     const alt = p / Math.cos(lat) - N;
            //
            //     return { lat: lat, lon: lon, alt: alt };
            // }


            // optimized version with precalculated values
            const a = 6378137.0; // semi-major axis (equatorial radius)
            const e = 0.081819190842622; // first eccentricity
            const e2 = 0.00669437999014; // e squared
            const b = 6356752.314245; // semi-minor axis
            const ep2 = 0.00673949674227; // ep squared

            function ecefToLLA(x, y, z) {
                const p = Math.sqrt(x * x + y * y);
                const th = Math.atan2(a * z, b * p);
                const lon = Math.atan2(y, x);
                const sinTh = Math.sin(th);
                const cosTh = Math.cos(th);
                const lat = Math.atan2(z + ep2 * b * sinTh * sinTh * sinTh, p - e2 * a * cosTh * cosTh * cosTh);
                const sinLat = Math.sin(lat);
                const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
                const alt = p / Math.cos(lat) - N;

                return { lat: lat, lon: lon, alt: alt };
            }


            function llaToSphericalECEF(lat, lon, alt) {
                const R = 6378137.0; // Mean radius of the Earth (WGS84 Sphere)

                const X = (R + alt) * Math.cos(lat) * Math.cos(lon);
                const Y = (R + alt) * Math.cos(lat) * Math.sin(lon);
                const Z = (R + alt) * Math.sin(lat);

                return { x: X, y: Y, z: Z };
            }

            const llaPos = ecefToLLA(ecef.x, ecef.y, ecef.z);
            const sphericalECEF = llaToSphericalECEF(llaPos.lat, llaPos.lon, llaPos.alt);


            ecef = V3(sphericalECEF.x, sphericalECEF.y, sphericalECEF.z);




            // get the altitude
            const altitude = ecef.length() - wgs84.RADIUS;
            // if the altitude is less than 100km, then it's in the atmosphere so we don't show it
            if (altitude < 100000) {
                return null;
            }

            // if it's significantly (10%) greater than geostationary orbit (35,786 km), then it's probably an error
            // so we don't show it
            // (This should probably be much lower for Starlink, but we'll leave it for now)
            if (altitude > 40000000) {
                return null;
            }

            const enu = ECEF2ENU(ecef, radians(Sit.lat), radians(Sit.lon), wgs84.RADIUS);
            const eus = V3(enu.x, enu.z, -enu.y);
            return eus;
        }
        else
            return null;

    }

    updateAllSatellites(date) {

        const timeMS = date.getTime();

        this.timeStep = 2000
        const numSats = this.TLEData.satData.length;

        // if there's only a few satellites, use a smaller time step
        if (numSats < 100) {
            this.timeStep = 100;
        } else {
            this.timeStep = numSats; // scale it by the number of satellites
        }

        assert (this.satelliteGeometry !== undefined, "updateAllSatellites needs a geometry");

        // Get the position attribute from the geometry
        const positions = this.satelliteGeometry.attributes.position.array;
        const magnitudes = this.satelliteGeometry.attributes.magnitude.array;

        let validCount = 0;
        for (let i = 0; i < numSats; i++) {
            const satData = this.TLEData.satData[i];
            const satrec = bestSat(satData.satrecs, date);

            // Satellites move in nearly straight lines
            // so interpolate every few seconds
            if (satData.timeA === undefined || timeMS < satData.timeA || timeMS > satData.timeB) {

                satData.timeA = timeMS;
                if (satData.timeB === undefined) {
                    // for the first one we spread it out
                    // so we end up updating about the same number of satellites per frame
                    satData.timeB = timeMS + Math.floor(1 + this.timeStep * (i/numSats));
                } else {
                    satData.timeB = timeMS + this.timeStep;
                }
                const dateB = new Date(satData.timeB)
                satData.eusA = this.calcSatEUS(satrec, date)
                satData.eusB = this.calcSatEUS(satrec, dateB)
            }



            // if the position can't be calculated then A and/or B will be null
            // so just skip over this
            if (satData.eusA !== null && satData.eusB !== null) {

                // calculate the velocity from A to B in m/s
                const velocity = satData.eusB.clone().sub(satData.eusA).multiplyScalar(1000 / (satData.timeB - satData.timeA)).length();

                // Starlink is typically 7.5 km/s, so if it's much higher than that, then it's probably an error
                // I use 11,000 as an upper limit to include highly elliptical orbits, see:
                // https://space.stackexchange.com/questions/48830/what-is-the-fastest-satellite-in-earth-orbit
                if (velocity < 5000 || velocity > 11000) {
                    // if the velocity is too high, then we assume it's an error and skip it
                    satData.invalidPosition = true;
                } else {

                    // Otherwise, we have a valid A and B, so do a linear interpolation
                    //satData.eus = satData.eusA.clone().add(satData.eusB.clone().sub(satData.eusA).multiplyScalar(
                    //    (timeMS - satData.timeA) / (satData.timeB - satData.timeA)
                    //));

                    // for optimization do this directly
                    // Calculate the normalized time value
                    var t = (timeMS - satData.timeA) / (satData.timeB - satData.timeA);

                    // Perform the linear interpolation (lerp)
                    satData.eus.lerpVectors(satData.eusA, satData.eusB, t);

                    // Update the position in the geometry's attribute
                    positions[i * 3] = satData.eus.x;
                    positions[i * 3 + 1] = satData.eus.y;
                    positions[i * 3 + 2] = satData.eus.z;
                    satData.invalidPosition = false;

                    satData.currentPosition = satData.eus.clone();
                    satData.spriteText.position.set(satData.eus.x, satData.eus.y, satData.eus.z);

                    // draw an arrow from the satellite in the direction of its velocity (yellow)
                    if (this.showSatelliteTracks) {
                        let A = satData.eusA.clone()
                        let dir = satData.eusB.clone().sub(satData.eusA).normalize()
                        DebugArrow(satData.name+"_t", dir, A, 500000, "#FFFF00", true, this.satelliteTrackGroup, 20, LAYER.MASK_LOOKRENDER)
                    }

                    // Arrow from satellite to ground (red)
                    if (this.showSatelliteGround) {
                        let A = satData.eusA.clone()
                        let B = pointOnGround(A)
                        DebugArrowAB(satData.name+"_g", A, B, "#00FF00", true, this.satelliteGroundGroup, 20, LAYER.MASK_LOOKRENDER)
                    }


                }
            } else {
                // if the new position is invalid, then we make it invisible
                // so we will need to flag it as invalid
                satData.invalidPosition = true;
            }

            if (satData.invalidPosition) {
                this.removeSatArrows(satData);
                // to make it invisible, we set the magnitude to 0 and position to a million km away
                magnitudes[i] = 0;
                positions[i * 3] = 1000000000;
            } else {
                validCount++
            }

        }

        par.validPct = validCount / numSats * 100;

        // Notify THREE.js that the positions have changed
        this.satelliteGeometry.attributes.position.needsUpdate = true;
    }

    removeSatArrows(satData)   {
        if (satData.hasArrow) {
            removeDebugArrow(satData.name)
            removeDebugArrow(satData.name + "sun")
            removeDebugArrow(satData.name + "reflected")
            satData.hasArrow = false;
        }
    }



    // Note, here we are claculating the ECEF position of planets on the celestial sphere
    // these are NOT the actual positions in space
    updatePlanetSprite(planet, sprite, date, observer, sphereRadius) {
        //  const celestialInfo = Astronomy.Search(planet, date, observer, 1);
        const celestialInfo = Astronomy.Equator(planet, date, observer, false, true);
        const illumination = Astronomy.Illumination(planet, date)
        const ra = (celestialInfo.ra) / 24 * 2 * Math.PI;   // Right Ascension NOTE, in hours, so 0..24 -> 0..2π
        const dec = radians(celestialInfo.dec); // Declination
        const mag = illumination.mag; // Magnitude
        const equatorial = raDec2Celestial(ra, dec, sphereRadius)


        let color = "#FFFFFF";
        if (this.planetSprites[planet] !== undefined) {
            color = this.planetSprites[planet].color;
        }


        // Set the position and scale of the sprite
        sprite.position.set(equatorial.x, equatorial.y, equatorial.z);
        var scale = 10 * Math.pow(10, -0.4 * (mag - -5));
        if (scale > 1) scale= 1;
        if (planet === "Sun" || planet === "Moon") scale = 5;
        sprite.scale.set(scale, scale, 1);


        this.updateArrow(planet, ra, dec, date, observer, sphereRadius)


        if (planet === "Sun") {

            // const ecef2 = equatorial.clone()
            // ecef2.applyMatrix4(this.celestialSphere.matrix)

            const gst = calculateGST(date);
            const ecef = celestialToECEF(ra,dec,wgs84.RADIUS, gst)
            // ecef for the sun will give us a vector from the cernter to the earth towards the Sun (which, for our purposes
            // is considered to be infinitely far away
            // We can use this to find the region where Starlink flares are expected

            const eus = ECEF2EUS(ecef, radians(Sit.lat), radians(Sit.lon), wgs84.RADIUS)
            const eusDir = ECEF2EUS(ecef, radians(Sit.lat), radians(Sit.lon), 0, true).normalize();
            // DebugArrow("Sunarrow", eusDir, eus, 2000000,"#FFFFFF")

             // if (Globals.sunLight) {
             //     Globals.sunLight.position.copy(eusDir)
             //
             //
             //     let toSun2 = getCelestialDirection("Sun", date);
             //     assert(eusDir.distanceTo(toSun2) < 0.000001, "Sunlight direction mismatch")
             //
             // }

             // sunDir is the direction vector FROM the sun. i.e. the direction sunlight is in.
            this.toSun.copy(eusDir.clone().normalize())
            this.fromSun.copy(this.toSun.clone().negate())

            const camera = NodeMan.get("lookCamera").camera;

            const cameraPos = camera.position;
            const cameraEcef = EUSToECEF(cameraPos)
            const LLA = ECEFToLLAVD_Sphere(cameraEcef)

            const {az: az1, el: el1} = raDecToAzElRADIANS(ra, dec, radians(LLA.x), radians(LLA.y), getLST(date, radians(LLA.y)))
            const {az, el} = raDecToAltAz(ra, dec, radians(LLA.x), radians(LLA.y), getJulianDate(date))
            //console.log(`RA version ${planet}, ${degrees(az1)}, ${degrees(el1)}`)
            //console.log(`raDecToAltAz  ${planet}, ${degrees(az)}, ${degrees(el)}`)
            this.sunAz = az;
            this.sunEl = el;

            ///////////////////////////////////////////////////////////////////////
            // attempt to find the glint position for radius r
            // i.e. the position on the earth centered sphere, of radius r where
            // a line from the camera to that point will reflect in the direction of
            // the sun
            // This is a non-trivial problem, related to Alhazen's problem, and does not
            // easily submit to analytical approaches
            // So here I use an iterative geometric approach
            // first we simplify the search to two dimensions, as we know the point must lay in
            // the plane specified by the origin O, the camera position P, and the sun vector v
            // we could do it all in 2D, or just rotate about the axis perpendicular to this.
            // 2D seems like it would be fastest, but just rotating maybe simpler
            // So first calculate the axis perpendicular to OP and v
            const P = this.camera.position;
            const O = this.globe.center;
            const OP = P.clone().sub(O)             // from origin to camera
            const OPn = OP.clone().normalize();       // normalized for cross product
            const v = this.toSun                    // toSun is already normalized
            const axis = V3().crossVectors(v,OPn).normalize()   // axis to rotate the point on
            const r = wgs84.RADIUS + 550000         // 550 km is approximate starlink altitude

            // We are looking for a point X, at radisu R. Let's just start directly above P
            // as that's nice and simple
            const X0 = OPn.clone().multiplyScalar(r).add(O)

            var bestX = X0
            var bestGlintAngle = 100000; // large value so the first one primes it
            var bestAngle = 0;

            var start = 0
            var end = 360
            var step = 1
            var attempts = 0
            const maxAttempts = 6

            do {
              //  console.log(`Trying Start = ${start}, end=${end}, step=${step},  bestAngle=${bestAngle}, bestGlintAngle=${bestGlintAngle}`)
                // try a simple iteration for now
                for (var angle = start; angle <= end; angle += step) {
                    // the point needs rotating about the globe origin
                    // (which is not 0,0,0, as we are in EUS)
                    // so sub O, rotate about the axis, then add O back
                    const X = X0.clone().sub(O).applyAxisAngle(axis, radians(angle)).add(O)

                    // we now have a potential new position, so calculate the glint angle

                    // only want to do vectors that point tawards the sun
                    const camToSat = X.clone().sub(P)

                    if (camToSat.dot(v) > 0) {

                        const globeToSat = X.clone().sub(O).normalize()
                        const reflected = camToSat.clone().reflect(globeToSat).normalize()
                        const dot = reflected.dot(v)
                        const glintAngle = (degrees(Math.acos(dot)))
                        if ((glintAngle >= 0) && (glintAngle < bestGlintAngle)) {
                            // check if it's obscured by the globe
                            // this check is more expensive, so only do it
                            // for potential "best" angles.
                            const ray = new Ray(X, this.toSun)
                            if (!intersectSphere2(ray, this.globe)) {
                                bestAngle = angle;
                                bestGlintAngle = glintAngle;
                                bestX = X.clone();

                              //  console.log(bestX.y)

              //                  DebugArrowAB("Best",P,bestX,"#FF00FF")
                            }
                        }
                    }
                   // DebugArrowAB("ToGlint"+angle,P,X,"#008000")
                   // DebugArrowAB("ToGlintO"+angle,O,X,"#8080FF")
                }


                start = bestAngle-step;
                end = bestAngle+step;
                step/=10
                attempts++;

            } while (bestGlintAngle > 0.0001 && attempts<maxAttempts)

         //   DebugArrowAB(sat.name, this.camera.position, sat.sprite.position, "#FF0000", true, this.sunArrowGroup,0.025)

          //  DebugArrowAB("BestGlint",P,bestX,"#FF00FF", true, this.flareRegionGroup, 0.1)

            DebugArrowAB("ToGlint",this.camera.position,bestX,"#FF0000", true, this.flareRegionGroup, 20, LAYER.MASK_HELPERS)
            DebugArrow("ToSunFromGlint",this.toSun,bestX,5000000,"#FF0000", true, this.flareRegionGroup, 20, LAYER.MASK_HELPERS)
            DebugWireframeSphere("ToGlint",bestX,500000,"#FF0000",4, this.flareRegionGroup)



            // const camToSat = sat.sprite.position.clone().sub(this.camera.position)
            // const globeToSat = sat.sprite.position.clone().sub(this.globe.center).normalize()
            // const reflected = camToSat.clone().reflect(globeToSat).normalize()
            // const dot = reflected.dot(toSun)
            // const glintAngle = Math.abs(degrees(Math.acos(dot)))





        }
        // add or update planetSprites
        this.planetSprites[planet] = {
            ra: ra,
            dec: dec,
            mag: mag,
            equatorial: equatorial,
            sprite: sprite,
            color: color,
        }

    }


    updateArrow(planet, ra, dec, date, observer, sphereRadius) {

        // problem with initialization order, so we need to check if the planet sprite is defined
        if (this.planetSprites[planet] === undefined) {
            return;
        }

        const name = planet;
        const flagName = "show" + name + "Arrow";
        const groupName = name + "ArrowGroup";
        const arrowName = name + "arrow";
        const obName = name + "ArrowOb";

        if (this[flagName] === undefined) {
            return;
        }

        if (this[flagName]) {
             const gst = calculateGST(date);
            const ecef = celestialToECEF(ra, dec, wgs84.RADIUS, gst)
            const eusDir = ECEF2EUS(ecef, radians(Sit.lat), radians(Sit.lon), 0, true);
            eusDir.normalize();
            this[obName].updateDirection(eusDir)

        }
    }


}





export function addNightSky(def) {
//    console.log("Adding CNodeDisplayNightSky")
    var nightSky = new CNodeDisplayNightSky({id: "NightSkyNode", ...def});

    // iterate over any 3D views
    // and add an overlay to each for the star names (and any other night sky UI)

//    console.log("Adding night Sky Overlays")
    ViewMan.iterate((key, view) => {
        if (view.canDisplayNightSky) {
            new CNodeDisplaySkyOverlay({
                id: view.id+"_NightSkyOverlay",
                overlayView: view,
                camera: view.camera,
                nightSky: nightSky,
            });
        }
    })

    return nightSky;
}



