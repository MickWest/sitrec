// Support functions for the custom sitches and mods

import {FileManager, Globals, gui, NodeMan, Sit, Units} from "./Globals";
import * as LAYER from "./LayerMasks";
import {TrackManager} from "./TrackManager";
import {assert} from "./utils";
import {isKeyHeld} from "./KeyBoardHandler";
import {ViewMan} from "./nodes/CNodeView";
import {ECEFToLLAVD_Sphere, EUSToECEF} from "./LLA-ECEF-ENU";
import {Rehoster} from "./CRehoster";
import {SITREC_ROOT} from "../config";
import {createCustomModalWithCopy} from "./CFileManager";
import {DragDropHandler} from "./DragDropHandler";
import {par} from "./par";
import {resolveObjectURL} from "buffer";
import {GlobalScene, LocalFrame} from "./LocalFrame";


export class CCustomManager {
    constructor() {


    }


    setup() {

        if (Sit.canMod)
            this.buttonText = "SAVE MOD"
        else
            this.buttonText = "SAVE CUSTOM"


        // add a lil-gui button linked ot the serialize function
        //FileManager.guiFolder.add(this, "serialize").name("Export Custom Sitch")

        //const theGUI = FileManager.guiFolder;
        const theGUI = gui;

        this.buttonColor = "#80ff80"

        if (Globals.userID > 0)
            this.serializeButton = theGUI.add(this, "serialize").name(this.buttonText).setLabelColor(this.buttonColor)
        else
            this.serializeButton = theGUI.add(this, "loginAttempt").name("Export Disabled (click to log in)").setLabelColor("#FF8080");

        this.serializeButton.moveToFirst();

    }

    loginAttempt() {
        FileManager.loginAttempt(this.serialize, this.serializeButton, this.buttonText, this.buttonColor);
    };

    serialize() {
        console.log("Serializing custom sitch")

        assert (Sit.canMod || Sit.isCustom, "one of Sit.canMod or Sit.isCustom must be true to serialize a sitch")
        assert (!Sit.canMod || !Sit.isCustom, "one of Sit.canMod or Sit.isCustom must be false to serialize a sitch")


        FileManager.rehostDynamicLinks(true).then(() => {

            let out = {}

            // merge in the current Sit object
            // which might have some changes?

            if (Sit.canMod) {
                // for a modded sitch, we just need to store the name of the sitch we are modding
                // TODO: are there some things in the Sit object that we need to store?????
                out = {modding: Sit.name }
            }
            else
            {
                // but for a custom sitch, we need to store the whole Sit object (which automatically stores changes)
                out = {...Sit}
            }

            // the custom sitch is a special case
            // and allows dropped videos and other files
            // (we might want to allow this for modded sitches too, later)
            if (Sit.isCustom) {
                // if there's a dropped video url
                if (NodeMan.exists("video")) {
                    const videoNode = NodeMan.get("video")
                    if (videoNode.staticURL) {
                        out.videoFile = videoNode.staticURL;
                    }
                }


                // modify the terrain model directly, as we don't want to load terrain twice
                // For a modded sitch this has probably not changed
                if (out.TerrainModel !== undefined) {
                    const terrainModel = NodeMan.get("TerrainModel");
                    out.TerrainModel = {
                        ...out.TerrainModel,
                        lat: terrainModel.lat,
                        lon: terrainModel.lon,
                        zoom: terrainModel.zoom,
                        nTiles: terrainModel.nTiles,
                        tileSegments: terrainModel.tileSegments,
                    }
                }

                // the files object is the rehosted files
                // files will be reference in switches using their original file names
                // we have rehosted them, so we need to create a new "files" object
                // that uses the rehosted file names
                // maybe special case for the video file ?
                let files = {}
                for (let id in FileManager.list) {
                    const file = FileManager.list[id]
                    files[id] = file.staticURL
                }
                out.loadedFiles = files;
            }

            // calculate the modifications to be applied to nodes AFTER the files are loaded
            // anything with a modSerialize function will be serialized
            let mods = {}
            NodeMan.iterate((id, node) => {

                if (node.modSerialize !== undefined) {
                    const nodeMod = node.modSerialize()

                    // check it has rootTestRemove, and remove it if it's empty
                    // this is a test to ensure serialization of an object incorporates he parents in the hierarchy
                    assert(nodeMod.rootTestRemove !== undefined, "Not incorporating ...super.modSerialzie.  rootTestRemove is not defined for node:" + id+ "Class name "+node.constructor.name)
                    // remove it
                    delete nodeMod.rootTestRemove

                    // check if empty {} object, don't need to store that
                    if (Object.keys(nodeMod).length > 0) {
                        mods[node.id] = nodeMod;
                    }
                }
            })
            out.mods = mods;

            // now the "par" values, which are deprecated, but still used in some places
            // so we need to serialize some of them
            const parNeeded = [
                "frame",
                "paused",
                "mainFOV",


                // these are JetGUI.js specific, form SetupJetGUI
                // VERY legacy stuff which most sitching will not have
                "pingPong",

                "podPitchPhysical",
                "podRollPhysical",
                "deroFromGlare",
                "jetPitch",

                "el",
                "glareStartAngle",
                "initialGlareRotation",
                "scaleJetPitch",
                "speed",  // this is the video speed
                "podWireframe",
                "showVideo",
                "showChart",
                "showKeyboardShortcuts",
                "showPodHead",
                "showPodsEye",
                "showCueData",

                "jetOffset",
                "TAS",
                "integrate",


            ]
            let pars = {}
            for (let key of parNeeded) {
                if (par[key] !== undefined) {
                    pars[key] = par[key]
                }
            }

            // add any "showHider" par toggles
            // see KeyBoardHandler.js, function showHider
            // these are three.js objects that can be toggled on and off
            // so iterate over all the objects in the scene, and if they have a showHiderID
            // then store the visible state using that ID (which is what the variable in pars will be)
            // traverse GlobalScene.children recursively to do the above
            const traverse = (object) => {
                if (object.showHiderID !== undefined) {
                    pars[object.showHiderID] = object.visible;
                }
                for (let child of object.children) {
                    traverse(child);
                }
            }

            traverse(GlobalScene);





            out.pars = pars;

            // MORE STUFF HERE.......

            out.modUnits = Units.modSerialize()


            // convert to a string
            let str = JSON.stringify(out, null, 2)

            console.log(str)

            let name = "Custom.js"
            let paramName = "custom"
            if (Sit.canMod) {
                name = "Mod_" + Sit.name + ".js"
                paramName = "mod"
            }


            // and rehost it, showing a link
            Rehoster.rehostFile("Custom.js", str).then((staticURL) => {
                console.log("Sitch rehosted as " + staticURL);

                // and make a URL that points to the new sitch
                let customLink = SITREC_ROOT + "?"+paramName+"=" + staticURL;

                createCustomModalWithCopy(customLink)();
            })


        })
    }

    // after setting up a custom scene, call this to perform the mods
    // i.e. load the files, and then apply the mods
    deserialize(sitchData) {
        console.log("Deserializing custom sitch")
        const loadingPromises = [];
        if (sitchData.loadedFiles) {
            // load the files as if they have been drag-and-dropped in
            for (let id in sitchData.loadedFiles) {
                loadingPromises.push(FileManager.loadAsset(Sit.loadedFiles[id], id).then(
                    (result) => {
                        console.log("Loaded " + id)
                        Globals.dontAutoZoom = true;
                        DragDropHandler.handleParsedFile(id, FileManager.list[id].data)
                        Globals.dontAutoZoom = false;
                    }
                ))
            }
        }

        // wait for the files to load
        Promise.all(loadingPromises).then(() => {

            // now

            console.log("Promised files loaded in Custom Manager deserialize")
            if (sitchData.mods) {
                // apply the mods
                for (let id in sitchData.mods) {
                    const node = NodeMan.get(id)
                    if (node.modDeserialize !== undefined) {
                        console.log("Applying mod to node:" + id+ " with data:"+sitchData.mods[id]  )
                        node.modDeserialize(Sit.mods[id])
                    }
                }
            }

            // apply the pars
            if (sitchData.pars) {
                for (let key in sitchData.pars) {
                    par[key] = sitchData.pars[key]
                }
            }

            // apply the units, etc
            if (sitchData.modUnits) {
                Units.modDeserialize(sitchData.modUnits)
            }

            // recalculate everything after the mods
            // in case there's some missing dependency
            // like the CSwitches turning off if they are not used
            // which they don't know immediately
            NodeMan.recalculateAllRootFirst()
            par.renderOne = true;

        })


    }


// per-frame update code for custom sitches
    update(f) {

        // if the camera is following a track, then turn off the object display for that track
        // in the lookView

        const cameraPositionSwitch = NodeMan.get("CameraPositionController");
        // get the selected node
        const choice = cameraPositionSwitch.choice;
        // if the selected node is the track position controller
        if (choice === "Follow Track") {
            // turn off the object display for the camera track in the lookView
            // by iterating over all the tracks and setting the layer mask
            // for the display objects that are associated with the track objects
            // that match the camera track
            const trackPositionMethodNode = cameraPositionSwitch.inputs[choice];
            const trackSelectNode = trackPositionMethodNode.inputs.sourceTrack;
            const currentTrack = trackSelectNode.inputs[trackSelectNode.choice]
            TrackManager.iterate((id, trackObject) => {
                if (trackObject.trackNode.id === currentTrack.id) {
                    assert(trackObject.displayTargetSphere !== undefined, "displayTargetSphere is undefined for trackObject:" + trackObject.trackNode.id);
                    trackObject.displayTargetSphere.changeLayerMask(LAYER.MASK_HELPERS);
                    //console.log("Setting layer mask to MASK_HELPERS for node:" + trackObject.trackNode.id)
                } else {
                    trackObject.displayTargetSphere.changeLayerMask(LAYER.MASK_LOOKRENDER);
                    //console.log("Setting layer mask to MASK_LOOKRENDER for node:" + trackObject.trackNode.id)
                }
                if (trackObject.centerNode !== undefined) {
                    if (trackObject.centerNode.id == currentTrack.id) {
                        trackObject.displayCenterSphere.changeLayerMask(LAYER.MASK_HELPERS);
                        //    console.log("Setting layer mask to MASK_HELPERS for node:" + trackObject.centerNode.id)
                    } else {
                        trackObject.displayCenterSphere.changeLayerMask(LAYER.MASK_LOOKRENDER);
                        //    console.log("Setting layer mask to MASK_LOOKRENDER ("+LAYER.MASK_LOOKRENDER+") for node:" + trackObject.centerNode.id)
                    }
                }
            })
        }


        // handle hold down the t key to move the terrain square around
        if (NodeMan.exists("terrainUI")) {
            const terrainUI = NodeMan.get("terrainUI")
            if (isKeyHeld('t')) {
                const mainView = ViewMan.get("mainView")
                const cursorPos = mainView.cursorSprite.position.clone();
                // convert to LLA
                const ecef = EUSToECEF(cursorPos)
                const LLA = ECEFToLLAVD_Sphere(ecef)

                // only if different
                if (terrainUI.lat !== LLA.x || terrainUI.lon !== LLA.y) {

                    terrainUI.lat = LLA.x
                    terrainUI.lon = LLA.y
                    terrainUI.flagForRecalculation();
                    terrainUI.tHeld = true;
                }
            } else {
                if (terrainUI.tHeld) {
                    terrainUI.tHeld = false;
                    terrainUI.startLoading = true;
                }
            }
        }
    }
}

export const CustomManager = new CCustomManager();
