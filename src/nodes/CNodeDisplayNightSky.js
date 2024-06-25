import {CNode3DGroup} from "./CNode3DGroup";
import {GlobalNightSkyScene, GlobalScene, setupNightSkyScene} from "../LocalFrame";
import {
    BufferAttribute,
    BufferGeometry,
    Color,
    Group,
    Line,
    LineBasicMaterial,
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
import {
    FileManager,
    GlobalDateTimeNode,
    Globals,
    gui,
    guiMenus,
    guiShowHide,
    guiTweaks,
    NodeMan,
    Sit
} from "../Globals";
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
import {CNodeViewUI} from "./CNodeViewUI";
import {ViewMan} from "./CNodeView";
import * as LAYER from "../LayerMasks";
import {par} from "../par";

import SpriteText from '../js/three-spritetext';
import {sharedUniforms} from "../js/map33/material/QuadTextureMaterial";
import {CNodeDisplayGlobeCircle} from "./CNodeDisplayGlobeCircle";
import {assert} from "../assert.js";
import {intersectSphere2, V3} from "../threeUtils";

// npm install satellite.js --save-dev
var satellite = require('satellite.js');

// installed with
// npm install astronomy-engine --save-dev
// in the project dir (using terminal in PHPStorm)
var Astronomy = require("astronomy-engine")


// other source of stars, if we need more (for zoomed-in pics)
// https://www.astronexus.com/hyg

// CNodeDisplaySkyOverlay takes a CNodeCanvas derived node, CNodeDisplayNightSky and a camera
// and displays star names on an overlay
export class CNodeDisplaySkyOverlay extends CNodeViewUI{

    constructor(v) {
        super(v);
        this.addInput("startTime",GlobalDateTimeNode)

        this.camera = v.camera;
        this.nightSky = v.nightSky;

        this.showSatelliteNames = false;
        this.showStarNames = false;

    //    guiShowHide.add(this,"showSatelliteNames" ).onChange(()=>{par.renderOne=true;}).name(this.overlayView.id+" Sat names")
        guiShowHide.add(this, "showStarNames").onChange(()=>{par.renderOne=true;}).name(this.overlayView.id+" Star names")


    }

    //
     renderCanvas(frame) {
         super.renderCanvas(frame);

         const camera = this.camera.clone();
         camera.position.set(0,0,0)
         camera.updateMatrix()
         camera.updateWorldMatrix()
         camera.updateProjectionMatrix()

//         var cameraECEF = ESUToECEF()
//         var cameraLLA = ECEFToLLA()

         var font_h = 9

          this.ctx.font = Math.floor(font_h) + 'px' + " " + 'Arial'
         this.ctx.fillStyle = "#ffffff";
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.textAlign = 'left';

          if (this.showStarNames) {
              for (var HR in this.nightSky.commonNames) {

                  // HR is the HR number, i.e. the index into the BSC + 1
                  // So we sub 1 to get the actual index.
                  const n = HR - 1

                  const ra = this.nightSky.BSC_RA[n]
                  const dec = this.nightSky.BSC_DEC[n]
                  const pos = raDec2Celestial(ra, dec, 100) // get equatorial
                  pos.applyMatrix4(this.nightSky.celestialSphere.matrix) // convert equatorial to EUS
                  pos.project(camera) // project using the EUS camera

                  if (pos.z > -1 && pos.z < 1 && pos.x >= -1 && pos.x <= 1 && pos.y >= -1 && pos.y <= 1) {
                      var x = (pos.x + 1) * this.widthPx / 2
                      var y = (-pos.y + 1) * this.heightPx / 2
                      x += 5
                      y -= 5
                      this.ctx.fillText(this.nightSky.commonNames[HR], x, y)
                  }
              }

              // Note this is overlay code, so we use this.nightSky.
              // CNodeDisplayNightSky would use this.planetSprites
              for (const [name, planet] of Object.entries(this.nightSky.planetSprites)) {
                  var pos = planet.equatorial.clone()
                  pos.applyMatrix4(this.nightSky.celestialSphere.matrix)

                  pos.project(camera)

                  this.ctx.strokeStyle = planet.color;
                  this.ctx.fillStyle = planet.color;

                  if (pos.z > -1 && pos.z < 1 && pos.x >= -1 && pos.x <= 1 && pos.y >= -1 && pos.y <= 1) {
                      var x = (pos.x + 1) * this.widthPx / 2
                      var y = (-pos.y + 1) * this.heightPx / 2
                      x += 5
                      y -= 5
                      this.ctx.fillText(name, x, y)
                  }

              }
          }

         if (this.showSatelliteNames && this.nightSky.TLEData) {
             const date = this.nightSky.in.startTime.dateNow;

             this.ctx.strokeStyle = "#8080FF";
             this.ctx.fillStyle = "#8080FF";

             for (const [index, sat] of Object.entries(this.nightSky.TLEData.satrecs)) {
                 const positionAndVelocity = satellite.propagate(sat, date);

                 if (positionAndVelocity && positionAndVelocity.position) {
                     const positionEci = positionAndVelocity.position;

                     var gmst = satellite.gstime(date);
                     var ecefK = satellite.eciToEcf(positionEci, gmst)
                     const ecef = V3(ecefK.x * 1000, ecefK.y * 1000, ecefK.z * 1000)
                     const enu = ECEF2ENU(ecef, radians(Sit.lat), radians(Sit.lon), wgs84.RADIUS)
                     const eus = V3(enu.x, enu.z, -enu.y)
                     //    pos.applyMatrix4(this.nightSky.celestialSphere.matrix)

                     const pos = eus

                     // we use the actual camera for satellites, as they are just in EUS
                     pos.project(this.camera)


                     if (pos.z > -1 && pos.z < 1 && pos.x >= -1 && pos.x <= 1 && pos.y >= -1 && pos.y <= 1) {
                         var x = (pos.x + 1) * this.widthPx / 2
                         var y = (-pos.y + 1) * this.heightPx / 2
                         x += 5
                         y -= 5
                         this.ctx.fillText(sat.name, x, y)
                     }
                 }
             }
         }
     }
}

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


class CTLEData {
    // constructor is passed in a string that contains the TLE file as \n seperated lines
    // extracts in into
    constructor(fileData) {
        const lines = fileData.split('\n');

        this.satrecs=[]

        // determine if it's a two line element (no names, lines are labeled 1 and 2) or three (line 0 = name)
        if (lines.length < 3 || !lines[1].startsWith("1") || !lines[2].startsWith("2")) {
            for (let i = 0; i < lines.length; i += 2) {
                const tleLine1 = lines[i + 0];
                const tleLine2 = lines[i + 1];
                if (tleLine1 !== undefined && tleLine2 !== undefined) {
                    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
                    // no name in a two line element, so create one.
                    satrec.name = "TLE_"+i
                    this.satrecs[satrec.name] = satrec;
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
                    satrec.name = lines[i]
                    // for duolicate entires, now it's just overwritin earlier ones
                    // with the newest one
                    // which should be what we need
                    this.satrecs[satrec.name] = satrec;
                }
            }
        }

        // after remving duplicates, convert to an indexed array
        const indexedSatrecs = []
        for (const [index, sat] of Object.entries(this.satrecs)) {
            indexedSatrecs.push(sat)
        }
        this.satrecs = indexedSatrecs;

    }





}


export class CNodeDisplayNightSky extends CNode3DGroup {

    constructor(v) {
        if (v.id === undefined) v.id = "NightSkyNode"
        super(v);
        //     this.checkInputs(["cloudData", "material"])
        this.addInput("startTime",GlobalDateTimeNode)

        if (GlobalNightSkyScene === undefined) {
            setupNightSkyScene(new Scene())
        }

   //     GlobalNightSkyScene.matrixWorldAutoUpdate = false


        this.flareAngle = 5
        guiTweaks.add(this, 'flareAngle', 0, 20, 0.1).listen().name("SL Flare Angle")

        this.penumbraDepth = 5000
        guiTweaks.add(this, 'penumbraDepth', 0, 100000, 1).listen().name("Earth's Penumbra Depth")

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

        this.showSunArrows = Sit.showSunArrows;
        this.sunArrowGroup = new Group();
        this.sunArrowGroup.visible = this.showSunArrows;
        GlobalScene.add(this.sunArrowGroup)
        guiShowHide.add(this, "showSunArrows").listen().onChange(()=>{
            par.renderOne=true;
            this.sunArrowGroup.visible = this.showSunArrows;
        }).name("Sun Angle Arrows")

        this.showVenusArrow = Sit.showVenusArrow;
        this.venusArrowGroup = new Group();
        this.venusArrowGroup.visible = this.venusArrow;
        GlobalScene.add(this.venusArrowGroup)
        guiShowHide.add(this, "showVenusArrow").listen().onChange(()=>{
            par.renderOne=true;
            this.venusArrowGroup.visible = this.showVenusArrow;
        }).name("Venus Arrow")


        this.showFlareRegion = Sit.showFlareRegion;
        this.flareRegionGroup = new Group();
        // get a string of the current time in MS
        const timeStamp = new Date().getTime().toString();
        this.flareRegionGroup.debugTimeStamp = timeStamp;
        this.flareRegionGroup.visible = this.showFlareRegion;
        GlobalScene.add(this.flareRegionGroup)
        guiShowHide.add(this, "showFlareRegion").listen().onChange(()=>{
            par.renderOne=true;
            this.flareRegionGroup.visible = this.showFlareRegion;
        }).name("Flare Region")

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
        guiShowHide.add(this, "showFlareBand").listen().onChange(()=>{
            par.renderOne=true;
            this.flareBandGroup.visible = this.showFlareBand;
        }).name("Flare Band")


        this.showSatellites = true;
        guiShowHide.add(this, "showSatellites").listen().onChange(()=>{
            par.renderOne=true;
            this.satelliteGroup.visible = this.showSatellites;
        }).name("Satellites")



        this.showSatelliteTracks = Sit.showSatelliteTracks ?? false;
        guiShowHide.add(this, "showSatelliteTracks").listen().onChange(()=>{
            par.renderOne=true;
            this.satelliteTrackGroup.visible = this.showSatelliteTracks;
        }).name("Satellite Arrows")

        this.showSatelliteGround = Sit.showSatelliteGround ?? false;
        guiShowHide.add(this, "showSatelliteGround").listen().onChange(()=>{
            par.renderOne=true;
            this.satelliteGroundGroup.visible = this.showSatelliteGround;
        }).name("Satellite Ground Arrows")

        this.showSatelliteNames = false;

        guiShowHide.add(this,"showSatelliteNames" ).listen().onChange(()=>{
            par.renderOne=true;
            this.satelliteTextGroup.visible = this.showSatelliteNames;
        }).name("Satellite Names")


        guiMenus.view.add(Sit,"starScale",0,3,0.01).name("Star Brightness").listen()
        guiMenus.view.add(Sit,"satScale",0,6,0.01).name("Sat Brightness").listen()
        guiMenus.view.add(Sit,"satCutOff",0,0.5,0.001).name("Sat Cut-Off").listen()


        // Sun Direction will get recalculated based on data
        this.toSun = V3(0,0,1)
        this.fromSun = V3(0,0,-1)

        this.planets =      ["Sun", "Moon", "Mercury", "Venus",   "Mars",     "Jupiter", "Saturn", "Uranus",  "Neptune", "Pluto"]
        this.planetColors = ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#80ff80", "#ff8080", "#FFFF80", "#FF80FF", "#FFFFFF", "#FFFFFF", "#FFFFFF"]


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


        console.log("Loading stars")
        this.addStars(this.celestialSphere)

        console.log("Loading planets")
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

        console.log("Adding celestial grid")
        this.equatorialSphereGroup = new Group();
        this.celestialSphere.add(this.equatorialSphereGroup);
        this.addCelestialSphereLines(this.equatorialSphereGroup, 10);
        this.showEquatorialGrid = true;

        guiShowHide.add(this,"showEquatorialGrid" ).listen().onChange(()=>{
            par.renderOne=true;
            this.equatorialSphereGroup.visible = this.showEquatorialGrid;
        }).name("Equatorial Grid")
        
        // For the stars to show up in the lookView
        // we need to enable the layer for everything in the celestial sphere.
        this.celestialSphere.layers.enable(LAYER.LOOK);  // probably not needed
        propagateLayerMaskObject(this.celestialSphere)

        this.recalculate()

        this.rot = 0



        console.log("Done with CNodeDisplayNightSky constructor")
    }

    update(frame) {
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
            // for (const [index, sat] of Object.entries(this.TLEData.satrecs)) {
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

    updateSatelliteScales(camera) {

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
        this.starMaterial.uniforms.starScale.value = Sit.starScale/window.devicePixelRatio;


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


            // Update satellites to correct position for nowDate
//            for (const [index, sat] of Object.entries(this.TLEData.satrecs)) {
            for (let i = camera.satStartTime; i < this.TLEData.satrecs.length; i++) {
                const sat = this.TLEData.satrecs[i];

                // satellites might have invalid positions if we load a TLE that's not close to the time we are calculating for
                if (sat.invalidPosition) {
                    continue;
                }

                // stagger updates unless it has an arrow.
                if ((i - camera.satStartTime) % camera.satTimeStep !== 0 && !sat.hasArrow)
                    continue;

                assert(sat.eus !== undefined, `sat.eus is undefined, i= ${i}, this.TLEData.satrecs.length = ${this.TLEData.satrecs.length} `)

                const satPosition = sat.eus;

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
                        this.removeSatArrows(sat);
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
                            var arrowHelper = DebugArrowAB(sat.name, this.camera.position, satPosition, (belowHorizon?"#303030":"#FF0000"), true, this.sunArrowGroup, 10, LAYER.MASK_HELPERS)
                            var arrowHelper2 = DebugArrowAB(sat.name + "sun", satPosition,
                                satPosition.clone().add(toSun.clone().multiplyScalar(10000000)), "#c08000", true, this.sunArrowGroup, 10, LAYER.MASK_HELPERS)
                           // var arrowHelper3 = DebugArrowAB(sat.name + "reflected", satPosition,
                           //     satPosition.clone().add(reflected.clone().multiplyScalar(10000000)), "#00ff00", true, this.sunArrowGroup, 0.025, LAYER.MASK_HELPERS)
                            sat.hasArrow = true;
                        } else {
                            this.removeSatArrows(sat);

                            // do the scale again to incorporate al
                            // sat.sprite.scale.set(scale, scale, 1);

                        }
                    } else {
                        this.removeSatArrows(sat);
                    }
                }

                if (scale < Sit.satCutOff)
                    scale = 0;

                magnitudes[i] = scale
            }
            this.satelliteGeometry.attributes.magnitude.needsUpdate = true;
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

        while (offset < -starn * nbent - 28) {
            const xno = view.getFloat32(offset, littleEndian);
            offset += 4
            const sra0 = view.getFloat64(offset, littleEndian);
            offset += 8
            const sdec0 = view.getFloat64(offset, littleEndian);
            offset += 8
            const is = utf8decoder.decode(new Uint8Array([view.getUint8(offset), view.getUint8(offset + 1)]));
            offset += 2
            const mag = view.getInt16(offset, littleEndian) / 100;
            offset += 2
            const xrpm = view.getFloat32(offset, littleEndian);
            offset += 4
            const xdpm = view.getFloat32(offset, littleEndian);
            offset += 4

            this.BSC_RA[this.BSC_NumStars] = sra0;
            this.BSC_DEC[this.BSC_NumStars] = sdec0;
            this.BSC_MAG[this.BSC_NumStars] = mag;
            this.BSC_NumStars++;

            if (mag > this.BSC_MaxMag)
                this.BSC_MaxMag = mag;
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
        const spriteMap = new TextureLoader().load("data/images/nightsky/MickStar.png"); // Load a star texture
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
                starTexture: { value: new TextureLoader().load('data/images/nightsky/MickStar.png') },
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




    addPlanets(scene) {

        assert(Sit.lat !== undefined, "addStars needs Sit.lat")
        assert(Sit.lon !== undefined, "addStars needs Sit.lon")

        // Setup the sprite material

        const starMap = new TextureLoader().load('data/images/nightsky/MickStar.png'); // Load a star texture

        const sunMap = new TextureLoader().load('data/images/nightsky/MickSun.png'); // Load a star texture

        const moonMap = new TextureLoader().load('data/images/nightsky/MickMoon.png'); // Load a star texture
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
            for (const [index, sat] of Object.entries(this.TLEData.satrecs)) {
                // sat.sprite.material.dispose();
                // this.satelliteGroup.remove(sat.sprite)
                //sat.sprite = null;

                sat.spriteText.material.dispose();
                this.satelliteTextGroup.remove(sat.spriteText)
                sat.spriteText = null;
            }
            this.TLEData = undefined;
        }
    }



//     addSatellites(scene, textGroup) {
//
//         assert(Sit.lat !== undefined, "addSatellites needs Sit.lat")
//         assert(Sit.lon !== undefined, "addSatellites needs Sit.lon")
//
//         // Setup the sprite material
//         const spriteMap = new TextureLoader().load('data/MickStar.png'); // Load a star texture
//
//         const spriteMaterial = new SpriteMaterial({
//             map: spriteMap,
//             depthTest:true,
//             color: 0x8080ff});
//
//
//
//
// // Create Satellites. At this point duplicate TLE entries will have been removed
//         // ALTHOUGH - we might want to keep them all, and refine which one is used based on time?
//         let date = this.in.startTime.dateNow;
//         this.satelliteSprites = []
//
//         for (const [index, sat] of Object.entries(this.TLEData.satrecs)) {
//             const sprite = new Sprite(spriteMaterial);
//             sat.sprite = sprite
//
//             // Add sprite to scene. Position is set later by updateSatelliteSprite
//             const scale = 20
//             sprite.scale.set(scale, scale, 1);
//
//             scene.add(sprite);
//
//             var name = sat.name.replace("0 STARLINK","SL").replace("STARLINK","SL");
//
//             const spriteText = new SpriteText(name,5);
//             sat.spriteText = spriteText
//             textGroup.add(spriteText);
//
//             this.updateSatelliteSprite(sprite, sat, date)
//
//         }
//
//     }


//     updateSatelliteSprite(sprite, satrec1, date)
//     {
//         const positionAndVelocity = satellite.propagate(satrec1, date);
//
//         // hardwired to used the lookCamera
//         // theoretically could do it for both viewports
//         // but the lookCamera is the one where we will see individual satellites
//         const camera = this.camera;
//
//         if (positionAndVelocity && positionAndVelocity.position) {
//             const positionEci = positionAndVelocity.position;
//
//             var gmst   = satellite.gstime(date);
//             var ecefK   = satellite.eciToEcf(positionEci, gmst)
//             const ecef= V3(ecefK.x*1000,ecefK.y*1000,ecefK.z*1000)
//             const enu = ECEF2ENU(ecef, radians(Sit.lat), radians(Sit.lon), wgs84.RADIUS)
//             const eus = V3(enu.x, enu.z, -enu.y)
//

//
//             // Set the position and scale of the sprite
//             sprite.position.set(eus.x, eus.y, eus.z);
//
//             // Calculate distance from camera to sprite
//             const distance = camera.position.distanceTo(sprite.position);
//
//             // Calculate scale to make the sprite appear the same size on screen
//             let scale =  0.010 * distance * Math.tan((camera.fov / 2) * (Math.PI / 180));
//
//             scale *= Sit.starScale ?? 1;
//
//             // Set the sprite scale
// //            sprite.scale.set(scale, scale, 1);
//             sprite.scale.set(scale * 2 * sprite.aspect, scale * 2, 1);
//
//
//             return true;
//         }
//         return false;
//     }


    addSatellites(scene, textGroup) {
        assert(Sit.lat !== undefined, "addSatellites needs Sit.lat");
        assert(Sit.lon !== undefined, "addSatellites needs Sit.lon");

        // Define geometry for satellites
        this.satelliteGeometry = new BufferGeometry();

        // Allocate arrays for positions and colors
        let positions = new Float32Array(this.TLEData.satrecs.length * 3); // x, y, z for each satellite
        let colors = new Float32Array(this.TLEData.satrecs.length * 3); // r, g, b for each satellite
        let magnitudes = new Float32Array(this.TLEData.satrecs.length); // magnitude for each satellite

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
                minSize: { value: 1.0 },
                maxSize: { value: 20.0 },
                starTexture: { value: new TextureLoader().load('data/images/nightsky/MickStar.png') },
                cameraFOV: { value: 30 },
                satScale: { value: Sit.satScale/window.devicePixelRatio },
                ...sharedUniforms,
            },
            transparent: true,
            depthTest: true,
        });

        for (let i = 0; i < this.TLEData.satrecs.length; i++) {
            const sat = this.TLEData.satrecs[i];

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
            const spriteText = new SpriteText(name, 5);
            spriteText.layers.mask = LAYER.MASK_LOOK;
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


    calcSatUES(sat, date) {
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
        const numSats = this.TLEData.satrecs.length;

        // if there's only a few satellites, use a smaller time step
        if (numSats < 100) {
            this.timeStep = 100;
        } else {
            this.timeStep = numSats; // scale it by the number of satellites
        }

        // Get the position attribute from the geometry
        const positions = this.satelliteGeometry.attributes.position.array;
        const magnitudes = this.satelliteGeometry.attributes.magnitude.array;

        let validCount = 0;
        for (let i = 0; i < numSats; i++) {
            const sat = this.TLEData.satrecs[i];

            // Satellites move in nearly straight lines
            // so interpolate every few seconds
            if (sat.timeA === undefined || timeMS < sat.timeA || timeMS > sat.timeB) {

                sat.timeA = timeMS;
                if (sat.timeB === undefined) {
                    // for the first one we spread it out
                    // so we end up updating about the same number of satellites per frame
                    sat.timeB = timeMS + Math.floor(1 + this.timeStep * (i/numSats));
                } else {
                    sat.timeB = timeMS + this.timeStep;
                }
                const dateB = new Date(sat.timeB)
                sat.eusA = this.calcSatUES(sat, date)
                sat.eusB = this.calcSatUES(sat, dateB)
            }



            // if the position can't be calculated then A and/or B will be null
            // so just skip over this
            if (sat.eusA !== null && sat.eusB !== null) {

                // calculate the velocity from A to B in m/s
                const velocity = sat.eusB.clone().sub(sat.eusA).multiplyScalar(1000 / (sat.timeB - sat.timeA)).length();

                // Starlink is typically 7.5 km/s, so if it's much higher than that, then it's probably an error
                // I use 11,000 as an upper limit to include highly elliptical orbits, see:
                // https://space.stackexchange.com/questions/48830/what-is-the-fastest-satellite-in-earth-orbit
                if (velocity < 5000 || velocity > 11000) {
                    // if the velocity is too high, then we assume it's an error and skip it
                    sat.invalidPosition = true;
                } else {

                    // Otherwise, we have a valid A and B, so do a linear interpolation
                    //sat.eus = sat.eusA.clone().add(sat.eusB.clone().sub(sat.eusA).multiplyScalar(
                    //    (timeMS - sat.timeA) / (sat.timeB - sat.timeA)
                    //));

                    // for optimization do this directly
                    // Calculate the normalized time value
                    var t = (timeMS - sat.timeA) / (sat.timeB - sat.timeA);

                    // Perform the linear interpolation (lerp) directly on x, y, z
                    sat.eus.x = sat.eusA.x + (sat.eusB.x - sat.eusA.x) * t;
                    sat.eus.y = sat.eusA.y + (sat.eusB.y - sat.eusA.y) * t;
                    sat.eus.z = sat.eusA.z + (sat.eusB.z - sat.eusA.z) * t;


                    // Update the position in the geometry's attribute
                    positions[i * 3] = sat.eus.x;
                    positions[i * 3 + 1] = sat.eus.y;
                    positions[i * 3 + 2] = sat.eus.z;
                    sat.invalidPosition = false;

                    // draw an arrow from the satellite in the direction of its velocity (yellow)
                    if (this.showSatelliteTracks) {
                        let A = sat.eusA.clone()
                        let dir = sat.eusB.clone().sub(sat.eusA).normalize()
                        DebugArrow(sat.name+"_t", dir, A, 500000, "#FFFF00", true, this.satelliteTrackGroup, 20, LAYER.MASK_LOOKRENDER)
                    }

                    // Arrow from satellite to ground (red)
                    if (this.showSatelliteGround) {
                        let A = sat.eusA.clone()
                        let B = pointOnGround(A)
                        DebugArrowAB(sat.name+"_g", A, B, "#00FF00", true, this.satelliteGroundGroup, 20, LAYER.MASK_LOOKRENDER)
                    }


                }
            } else {
                // if the new position is invalid, then we make it invisible
                // so we will need to flag it as invalid
                sat.invalidPosition = true;
            }

            if (sat.invalidPosition) {
                this.removeSatArrows(sat);
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

    removeSatArrows(sat)   {
        if (sat.hasArrow) {
            removeDebugArrow(sat.name)
            removeDebugArrow(sat.name + "sun")
            removeDebugArrow(sat.name + "reflected")
            sat.hasArrow = false;
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



        // Set the position and scale of the sprite
        sprite.position.set(equatorial.x, equatorial.y, equatorial.z);
        var scale = 10 * Math.pow(10, -0.4 * (mag - -5));
        if (scale > 1) scale= 1;
        if (planet === "Sun" || planet === "Moon") scale = 5;
        sprite.scale.set(scale, scale, 1);


        if (planet === "Venus") {

            // const ecef2 = equatorial.clone()
            // ecef2.applyMatrix4(this.celestialSphere.matrix)

            const gst = calculateGST(date);
            const ecef = celestialToECEF(ra, dec, wgs84.RADIUS, gst)
            // ecef for the sun will give us a vector from the cernter to the earth towards the Sun (which, for our purposes
            // is considered to be infinitely far away
            // We can use this to find the region where Starlink flares are expected

            const eus = ECEF2EUS(ecef, radians(Sit.lat), radians(Sit.lon), wgs84.RADIUS)
            const eusDir = ECEF2EUS(ecef, radians(Sit.lat), radians(Sit.lon), 0, true);
            const camera = NodeMan.get("lookCamera").camera;

            if (Sit.venusArrow) {
                DebugArrow("Venusarrow", eusDir, camera.position, 20000, "#30FF30", true, this.venusArrowGroup)
            }
        }


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

             if (Globals.sunLight) {
                 Globals.sunLight.position.copy(eusDir)


                 let toSun2 = getCelestialDirection("Sun", date);
                 assert(eusDir.distanceTo(toSun2) < 0.000001, "Sunlight direction mismatch")

             }

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
        }

    }



}



// raDec2Celestial takes the ra and dec (in radians) of a celestial point (like a star)
// and returns an x,y,z point on the equatorial celestial sphere of sphereRadius
// in ECEF format, standard celestial coordiantes, centered on the center of the Earth
// X axis - To vernal equinox
// Y Axis - right angles to this, in the equatorial plane
// Z Axis - Up through the North pole
// Compared to a ESU coordinate system where the ECEF X axis exit the surface of the earth
// ESU(X,Y,Z) would be ECEF(Y, Z, X) (not sure if this is useful info).
// See: https://en.wikipedia.org/wiki/Equatorial_coordinate_system#Rectangular_coordinates
function raDec2Celestial(raRad,decRad,sphereRadius) {
    const x = sphereRadius * Math.cos(decRad) * Math.cos(raRad);
    const y = sphereRadius * Math.cos(decRad) * Math.sin(raRad);
    const z = sphereRadius * Math.sin(decRad);
    const equatorial = V3(x,y,z);
    return equatorial;
}


export function getJulianDate(date) {
    return date / 86400000 + 2440587.5; // convert to Julian Date
}


// http://aa.usno.navy.mil/faq/docs/GAST.php


function getSiderealTime(date, longitude) {

    const JD = getJulianDate(date)

    const D = JD - 2451545.0; // Days since J2000.0
    let GMST = 280.46061837 + 360.98564736629 * D; // in degrees

    // Add the observer's longitude (in degrees)
    GMST += longitude;

    // Normalize to [0, 360)
    GMST = GMST % 360;

    if (GMST < 0) {
        GMST += 360; // make it positive
    }

    return GMST; // returns in degrees
}


//Greg Miller (gmiller@gregmiller.net) 2021
//Released as public domain
//http://www.celestialprogramming.com/

//All input and output angles are in radians, jd is Julian Date in UTC
function raDecToAltAz(ra,dec,lat,lon,jd_ut){
    //Meeus 13.5 and 13.6, modified so West longitudes are negative and 0 is North
    const gmst=greenwichMeanSiderealTime(jd_ut);
    let localSiderealTime=(gmst+lon)%(2*Math.PI);


    let H=(localSiderealTime - ra);
    if(H<0){H+=2*Math.PI;}
    if(H>Math.PI){H=H-2*Math.PI;}

    let az = (Math.atan2(Math.sin(H), Math.cos(H)*Math.sin(lat) - Math.tan(dec)*Math.cos(lat)));
    let a = (Math.asin(Math.sin(lat)*Math.sin(dec) + Math.cos(lat)*Math.cos(dec)*Math.cos(H)));
    az-=Math.PI;

    if(az<0){az+=2*Math.PI;}

    const el = a;
//    return [az,a, localSiderealTime,H];
    return {az,el};
}

function greenwichMeanSiderealTime(jd){
    //"Expressions for IAU 2000 precession quantities" N. Capitaine1,P.T.Wallace2, and J. Chapront
    const t = ((jd - 2451545.0)) / 36525.0;

    let gmst=earthRotationAngle(jd)+(0.014506 + 4612.156534*t + 1.3915817*t*t - 0.00000044 *t*t*t - 0.000029956*t*t*t*t - 0.0000000368*t*t*t*t*t)/60.0/60.0*Math.PI/180.0;  //eq 42
    gmst%=2*Math.PI;
    if(gmst<0) gmst+=2*Math.PI;

    return gmst;
}

function earthRotationAngle(jd){
    //IERS Technical Note No. 32

    const t = jd- 2451545.0;
    const f = jd%1.0;

    let theta = 2*Math.PI * (f + 0.7790572732640 + 0.00273781191135448 * t); //eq 14
    theta%=2*Math.PI;
    if(theta<0)theta+=2*Math.PI;

    return theta;

}
// end of Greg Millar code
/////////////////////////////////////////////////////////////////////////////////


export function addNightSky(def) {
    console.log("Adding CNodeDisplayNightSky")
    var nightSky = new CNodeDisplayNightSky({id: "NightSkyNode", ...def});

    // iterate over any 3D views
    // and add an overlay to each for the star names (and any other night sky UI)

    console.log("Adding night Sky Overlays")
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

// TODO: check differences between this and the above GST calculator function.

// Function to calculate Greenwich Sidereal Time (GST)
// This is a simplified example; for more accurate calculations, you may want to use a library
export function calculateGST(date) {
    const julianDate = date / 86400000 + 2440587.5;  // Convert from milliseconds to Julian date
    const T = (julianDate - 2451545.0) / 36525.0;
    let theta = 280.46061837 + 360.98564736629 * (julianDate - 2451545) + T * T * (0.000387933 - T / 38710000);
    theta %= 360;
    return radians(theta);
}


// Function to convert equatorial celestial coordinates in the form of ra and dec to ECEF
// ra and dec in radians.
function celestialToECEF(ra, dec, dist, gst) {
    // Step 1: Convert to Geocentric Equatorial Coordinates (i.e. ECI)
    const x_geo = dist * Math.cos(dec) * Math.cos(ra);
    const y_geo = dist * Math.cos(dec) * Math.sin(ra);
    const z_geo = dist * Math.sin(dec);

    // Step 2: Convert to ECEF Coordinates
    const x_ecef =   x_geo * Math.cos(gst) + y_geo * Math.sin(gst);
    const y_ecef = - x_geo * Math.sin(gst) + y_geo * Math.cos(gst);

    const z_ecef = z_geo;

    return V3(x_ecef,y_ecef, z_ecef);
}


// Function to convert ECI KM to ECEF in m
function eciKToEcefM(eci, date) {
    const { x, y, z } = eci;
    const gst = calculateGST(date);

    // Rotate ECI coordinates by GST to get ECEF
    const xEcef = x * Math.cos(gst) + y * Math.sin(gst);
    const yEcef = -x * Math.sin(gst) + y * Math.cos(gst);
    const zEcef = z;  // No change in the z-coordinate

    return V3(x*1000,y*1000,z*1000)
}

// get a vector in ESU coordinates to a celestial body from a EUS position (like a camera or object)
// - body = (e.g "Sun", "Venus", "Moon", etc)
// - date = date of observation (Date object)
export function getCelestialDirection(body, date, pos) {
    let LLA;
    // if a position is provided, use that to calculate the LLA of the observer
    // realistically this won't make any significant difference for the Sun,
    // the biggest difference will be for the Moon, then nearby planets
    if (pos !== undefined) {
        LLA = ECEFToLLAVD_Sphere(pos)
    } else {
        // default to the local origin, should be fine for the sun.
        LLA = V3(Sit.lat, Sit.lon, 0)
    }

//    let observer = new Astronomy.Observer(Sit.lat, Sit.lon, 0);
    let observer = new Astronomy.Observer(LLA.x, LLA.y, LLA.z);
    const celestialInfo = Astronomy.Equator(body, date, observer, false, true);
    const ra = (celestialInfo.ra) / 24 * 2 * Math.PI;   // Right Ascension NOTE, in hours, so 0..24 -> 0..2π
    const dec = radians(celestialInfo.dec); // Declination
  //  const equatorial = raDec2Celestial(ra, dec, wgs84.RADIUS)

    const gst = calculateGST(date);
    const ecef = celestialToECEF(ra,dec,wgs84.RADIUS, gst)
    // ecef for the sun will give us a vector from the center to the earth towards the Sun (which, for our purposes
    // is considered to be infinitely far away

    // roate this into the EUS coordinate system and normalize
    const eusDir = ECEF2EUS(ecef, radians(Sit.lat), radians(Sit.lon), 0, true).normalize();
    return eusDir;
}

