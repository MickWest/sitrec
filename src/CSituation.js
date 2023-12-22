import {PerspectiveCamera} from "../three.js/build/three.module.js";
import {FileManager} from "./CManager";
import {CNodeTerrain} from "./nodes/CNodeTerrain";
import {infoDiv, NodeMan, setGlobalPTZ, Sit} from "./Globals";
import {PTZControls} from "./PTZControls";
import {CNodeUICameraLLA} from "./nodes/CNodeUICameraLLA";
import {par} from "./par";
import {LLAToEUS, LLAVToEUS} from "./LLA-ECEF-ENU";
import {boxMark, MV3, V3} from "./threeExt";
import * as LAYER from "./LayerMasks";
import {CNodeConstant} from "./nodes/CNode";
import {CNodeGUIValue} from "./nodes/CNodeGUIValue";
import {CNodeLOSMotionTrack} from "./nodes/CNodeLOSMotionTrack";
import {GlobalScene} from "./LocalFrame";
import {gui} from "./Globals";
import {mainCamera} from "./Globals";
import {NightSkyFiles} from "./ExtraFiles";
import {f2m,assert} from "./utils";
import {setupOpts} from "./JetChart";
import {CNodeCamera} from "./nodes/CNodeCamera";




/*

Currently we have a simple heirachy of type of sitch,

CSituation - the default
  CSituation3D - intermedate for
    CSituationLookAt


defaultSit which is created here:

    export var defaultSit = new CSituation({})

and then in index.js se call SetSit, which sets the global Sit

    setSit(defaultSit)


The situation is determined in index.js by the situtation string, which defaults to:

    var situation = "gimbal";

(Or localSituation)

Them, depending on that, we are doing one of:

    Sit.change(SitLineTest)
or
    setSit(new CSituationLookAt(SitDume))
or
    setSit(new CSituation3D(SitHayle))

This is rather redundent currently, as only SitDume uses CSituationLookAt and CSituation3D does not extend anything

So maybe we need to move to a component model.

CSituationLookAt does not even have any code for looking at things
it just sets up two CNodeView3D, and a bit of othere stuff. The exact ype of things done
in other setup or setup2 functions

Stup amount of duplicated code copied between sitches.


*/


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
    LOSSpacing:30,

    // Display Units
    bigUnits: "NM",

    azSlider:true,
    jetStuff:true,
    animated:true,

    //
    mainFOV: 30,
    NARFOV: 0.35,
    farClip: 5000000,
    nearClip: 1,
    farClipNAR: 800000,
    nearClipNAR: 1,

    defaultCameraDist: 1300,


    startTime: "2000-01-01T00:00:00Z",  // Default to start of the Epoch

    simSpeed:1,

    jetOrigin: V3(0,f2m(25000),0),  // default for Gimbal and GOfast, will be ovewritten...


    cameraSphereSize: 2000,
    targetSphereSize: 2000,

    displayFrustum: false,
    frustumRadius: 50000,
    frustumColor: 0xffff00,
    frustumLineWeight: 2,

    startCameraPosition:[-7136.71,380520.26,747460.97],
    startCameraTarget:[-7150.08,380080.93,746562.74]

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


        switch (this.bigUnits) {
            case "NM": // Nautical miles and feet
                this.m2Big = 0.000539957;   // scale meters to big units
                this.big2M = 1852;          // scale meters to big units
                this.smallUnits = "Feet"
                this.m2Small = 3.28084      // scale meters to small (feet)
                this.small2M = 0.3048       // scale small (feet) to meters
                this.speedUnits = "Knots"
                this.m2Speed = 1.94384      // 1 m/s to knots
                break;
            case "miles":
            case "Miles": // Statute (ordinary) miles and feet
                this.smallUnits = "Feet"
                this.m2Big = 0.000621371
                this.big2M = 1609.34
                this.speedUnits = "mph"
                this.m2Speed = 2.23694
                break;
        }

    }

    // Most complex sitches will FULLY override this CSituation::setup() function
    // So don't rely on anything in here for things like Gimbal, Agua, etc....
    setup() {
        // more data-driven stuff that's indepent of type of situation

        setupOpts();

        this.mainCamera = new PerspectiveCamera(par.mainFOV, window.innerWidth / window.innerHeight, 1, Sit.farClip);
        this.mainCamera.layers.enable(LAYER.HELPERS)
        new CNodeCamera({
            id:"mainCamera",
            camera:this.mainCamera,
        })

        if (this.startCameraPosition !== undefined) {
            this.mainCamera.position.copy(MV3(this.startCameraPosition));  //
            this.mainCamera.lookAt(MV3(this.startCameraTarget));
        }

        if (this.startCameraPositionLLA !== undefined) {
            this.mainCamera.position.copy(LLAVToEUS(MV3(this.startCameraPositionLLA)))
            this.mainCamera.lookAt(LLAVToEUS(MV3(this.startCameraTargetLLA)));
        }

        if (this.lookFOV !== undefined) {
            //this.lookCamera = new PerspectiveCamera(this.lookFOV, window.innerWidth / window.innerHeight, 1, Sit.farClipNAR);
            new CNodeCamera({
                id:"lookCamera",
                fov:this.lookFOV,
                aspect:window.innerWidth / window.innerHeight,
                near: 1,
                far: Sit.farClipNAR,
            })

            this.lookCamera = NodeMan.get("lookCamera").camera // TEMPORARY

            console.log("Added lookCamera")

        }

        if (this.flattening) {
            new CNodeConstant({id: "radiusMiles", value: 3963.190592})
            new CNodeGUIValue({id: "flattening", value: 0, start: 0, end: 1, step: 0.005, desc: "Flattening"}, gui)

        } else {
            // Previously we had an adjustable node for the Earth's radius to allow
            // the suer to simulate refraction by setting it to 7/6R, or similar
            // It's not been much of a factor, and is better if we just use
            // the WGS84 standard radius
            /*
            new CNodeGUIValue({
                id: "radiusMiles",
                value: 3963.190592,
                start: 3963.190592,
                end: 40000,
                step: 1,
                desc: "Earth Radius"
            }, gui)
             */
            if (!NodeMan.exists("radiusMiles"))
                new CNodeConstant({id: "radiusMiles", value: 3963.190592})
        }

        // Terrain is currently a patch of terrain (i.e. height mapped satellite images)
        // specified per-sitch (if used)
        if (this.terrain) {
            console.log("Making terrain")
            this.makeTerrain(this.terrain,)
        }

        // a lookFOV implies we have a look camera, which most sitches do

        if (this.lookFOV) {
            if (this.ptz) {
                setGlobalPTZ(new PTZControls({
                        az: this.ptz.az, el: this.ptz.el, fov: this.ptz.fov, camera: this.lookCamera, showGUI:this.ptz.showGUI
                    },
                    gui
                ))

                // THis is a UI controller for adjusting PTZ of a given camera
                new CNodeUICameraLLA({
                    id:"CameraLLA",
                    fromLat: new CNodeGUIValue({
                        id: "cameraLat",
                        value: this.fromLat,
                        start: -90,
                        end: 90,
                        step: 0.001,
                        desc: "Camera Lat"
                    }, gui),

                    fromLon: new CNodeGUIValue({
                        id: "cameraLon",
                        value: this.fromLon,
                        start: -180,
                        end: 180,
                        step: 0.001,
                        desc: "Camera Lon"
                    }, gui),

                    fromAlt: new CNodeGUIValue({
                        id: "cameraAlt",
                        value: this.fromAlt,
                        start: this.fromAltMin,
                        end: this.fromAltMax,
                        step: 0.1,
                        desc: "Camera Altitude"
                    }, gui),
                    camera: "lookCamera",
                    radiusMiles: "radiusMiles",
                })

            } else {
                gui.add(this, 'lookFOV', 0.35, 120, 0.01).onChange(value => {
                    this.lookCamera.fov = value
                    this.lookCamera.updateProjectionMatrix()
                }).listen().name("Look FOV")
                // Lock the camera on a spot, no editing position by user
                new CNodeUICameraLLA({
                    fromLat: this.fromLat, // e.g. point dume
                    fromLon: this.fromLon,
                    fromAlt: new CNodeGUIValue({
                        id: "cameraAlt",
                        value: this.fromAlt,
                        start: this.fromAltMin,
                        end: this.fromAltMax,
                        step: 0.1,
                        desc: "Camera Altitude"
                    }, gui),
                    toLat: this.toLat,
                    toLon: this.toLon,
                    toAlt: this.toAlt, // elevation in meters
                    camera: "lookCamera",
                    radiusMiles: "radiusMiles",
                })
            }
        }

        if (this.marks) this.marks.forEach(mark => {
            var enu = LLAToEUS(mark.LL.lat, mark.LL.lon)
            GlobalScene.add(boxMark(enu, mark.width, 10000, mark.width, mark.color))
        })

        if (this.motionTrackLOS) {
            console.log("motion track")
            new CNodeLOSMotionTrack(this.motionTrackLOS)
        }


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

    makeTerrain(terrain) {
        if (this.flattening) {
            new CNodeTerrain({
                id: "TerrainModel",
                radiusMiles: "radiusMiles",
                flattening: "flattening",
                lat: terrain.lat,
                lon: terrain.lon,
                zoom: terrain.zoom,
                nTiles: terrain.nTiles
            })
        } else {
            new CNodeTerrain({
                id: "TerrainModel",
                radiusMiles: "radiusMiles",
                lat: terrain.lat,
                lon: terrain.lon,
                zoom: terrain.zoom,
                nTiles: terrain.nTiles
            })
        }
    }

}
