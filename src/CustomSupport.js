// Support functions for the custom sitches

import {FileManager, gui, NodeMan, Sit} from "./Globals";
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


export class CCustomManager {
    constructor() {

    }


    setup() {
        // add a lil-gui button linked ot the serialize function
        FileManager.guiFolder.add(this, "serialize").name("Export Custom Sitch")
    }

    serialize() {
        console.log("Serializing custom sitch")

        FileManager.rehostDynamicLinks(true).then(() => {

            let out = {}

            // merge in the current Sit object
            // which might have some changes?

            out = {...Sit}

            // if there's a dropped video url
            const videoNode = NodeMan.get("video")
            if (videoNode !== undefined) {
                if (videoNode.staticURL) {
                    out.videoFile = videoNode.staticURL;
                }
            }


            // modify the terrain model directly, as we don't want to load terrain twice
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


// we also need to modSialize the controllers, and the camera position controller
//             and the camera itself. Maybe also the lookView and mainView and video windows?
//                 and focus track etc - so WE NEED A PER-NODE flag set in SitCustom saying what needs modSerializing

            // calculate the modifications to be applied to nodes AFTER the files are loaded
            let mods = {}
            NodeMan.iterate((id, node) => {
                if (node.modSerialize !== undefined && node.canSerialize) {
                    mods[node.id] = node.modSerialize()
                }
            })
            out.mods = mods;

            // convert to a string
            let str = JSON.stringify(out, null, 2)

            console.log(str)

            // and rehost it, showing a link
            Rehoster.rehostFile("Custom.js", str).then((staticURL) => {
                console.log("Sitch rehosted as " + staticURL);

                // and make a URL that points to the new sitch
                let customLink = SITREC_ROOT + "?custom=" + staticURL;

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
                        DragDropHandler.handleParsedFile(id, FileManager.list[id].data)
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
                        node.modDeserialize(Sit.mods[id])
                    }
                }
            }
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
