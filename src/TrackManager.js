// Creating timed data and then tracks from pre-parsed track files
// should be agnostic to the source of the data (KML/ADSB, CSV, KLVS, etc)
import {CNodeScale} from "./nodes/CNodeScale";
import {CNodeGUIValue} from "./nodes/CNodeGUIValue";
import {CNodeConstant} from "./nodes/CNode";
import * as LAYER from "./LayerMasks";
import {Color} from "three";
import {getFileExtension, scaleF2M} from "./utils";
import {FileManager, GlobalDateTimeNode, Globals, gui, guiMenus, NodeMan, Sit} from "./Globals";
import {CNodeDisplayTrack} from "./nodes/CNodeDisplayTrack";
import {CManager} from "./CManager";
import {CNodeControllerMatrix, CNodeControllerTrackPosition} from "./nodes/CNodeControllerVarious";
import {MISB} from "./MISBUtils";
import {isNumber} from "mathjs";
import {CNodeMISBDataTrack, makeLOSNodeFromTrackAngles, removeLOSNodeColumnNodes} from "./nodes/CNodeMISBData";
import {KMLToMISB} from "./KMLUtils";
import {CNodeTrackFromMISB} from "./nodes/CNodeTrackFromMISB";
import {assert} from "./assert.js";
import {getLocalSouthVector, getLocalUpVector, pointOnSphereBelow} from "./SphericalMath";
import {closestIntersectionTime, trackBoundingBox} from "./trackUtils";
import {CNode3DObject} from "./nodes/CNode3DObject";
import {par} from "./par";
import {CNodeTrackGUI} from "./nodes/CNodeControllerTrackGUI";


export const TrackManager = new CManager();

class CMetaTrack {
    constructor(trackFileName, trackDataNode, trackNode) {
        this.trackNode = trackNode;
        this.trackDataNode = trackDataNode;
        this.trackFileName = trackFileName;
    }

    // TODO - call this when switching levels
    dispose() {

        // dispose data nodes before track nodes, as the track nodes have data nodes as inputs
        // OH, BUT THEY LINK FORWARD AND BACKWARDS.... SO WE NEED TO UNLINK THEM FIRST
        // BUT NOT ANYTHING ELSE, AS WE STILL WANT TO CHECK FOR UNANTICIPATED LINKS
        //NodeMan.unlink(this.trackNode, this.trackDataNode); TODO
        //OR  - change disposeRemove so it unlinks first
        NodeMan.unlinkDisposeRemove(this.trackDataNode);
        NodeMan.unlinkDisposeRemove(this.trackNode);
        NodeMan.unlinkDisposeRemove(this.centerDataNode);
        NodeMan.unlinkDisposeRemove(this.centerNode);
        NodeMan.unlinkDisposeRemove(this.trackDisplayDataNode);
        NodeMan.unlinkDisposeRemove(this.trackDisplayNode);
        NodeMan.unlinkDisposeRemove(this.displayCenterDataNode);
        NodeMan.unlinkDisposeRemove(this.displayCenterNode);
        NodeMan.unlinkDisposeRemove(this.displayTargetSphere);
        NodeMan.unlinkDisposeRemove(this.displayCenterSphere);
        NodeMan.unlinkDisposeRemove(this.gui);

        NodeMan.unlinkDisposeRemove(this.anglesNode);
        NodeMan.unlinkDisposeRemove(this.anglesController);
        removeLOSNodeColumnNodes(this.trackID);
        NodeMan.pruneUnusedConstants();
        NodeMan.pruneUnusedControllers();




    }

}

// given a source file id:
// first create a CNodeTimedData from whatever type of data it is (KML, SRT, etc)
// the create a track node from that
// Note, the track node might be recalculated, as it depends on the global start time
//
// sourceFile = the input, either a KLM file, or one already in MISB array format
// if it's a kml file we will first make a MISB array
// dataID = the id of the intermediate CNodeMISBDataTrack
export function makeTrackFromDataFile(sourceFile, dataID, trackID, columns) {

    // determine what type of track it is
    const fileInfo = FileManager.getInfo(sourceFile);
    const ext = getFileExtension(fileInfo.filename)

    let misb = null;

    if (ext === "kml") {
        // new CNodeKMLDataTrack({
        //     id: dataID,
        //     KMLFile: sourceFile,
        // })
        misb = KMLToMISB(FileManager.get(sourceFile));
    } else if (ext === "srt" || ext === "csv" || ext === "klv") {
        misb = FileManager.get(sourceFile)
    } else {
        assert(0, "Unknown file type: " + fileInfo.filename)
    }

    // first make a data track with id = dataID
    // from the misb array source
    // This will be an array of :
    // {
    // position: V3,
    // time: ms,
    // vFov: degrees, (optional)
    // misbRow: object reference to the original row in the MISB array

    new CNodeMISBDataTrack({
        id: dataID,
        misb: misb,
        exportable: true,
    })

    // then use that to make the per-frame track, which might just be a portion of the original data
    return new CNodeTrackFromMISB({
        id: trackID,
        misb: dataID,
        columns: columns,
        exportable: true,
    })

}

// tracks = array of filenames of files that have been loaded and that
// we cant to make tracks from
export function addTracks(trackFiles, removeDuplicates = false, sphereMask = LAYER.MASK_HELPERS) {

    // if we are adding tracks, then we need to add a scale for the target sphere
    if (!NodeMan.exists("sizeTargetScaled")) {
        new CNodeScale("sizeTargetScaled", scaleF2M,
            new CNodeGUIValue({
                value: Sit.targetSize,
                start: 10,
                end: 20000,
                step: 0.1,
                desc: "Target Sphere size ft"
            }, guiMenus.objects)
        )
    }

    for (const trackFileName of trackFiles) {
        ////////////////////////////////////////////////////

        let hasAngles = false;
        let hasFOV = false;
        let hasCenter = false;



        // try to find the flight number as a shorter name
        // For check for format like: FlightAware_DAL2158_KCHS_KBOS_20230218.kml
        let shortName = trackFileName
        let found = false;

        // if it's a KML file, then we might have the flight number in the data
        // check there first, which gives more flexibility in filenames (which might get changed by the user, or the system)

        const ext = getFileExtension(trackFileName);
        if (ext === "kml") {
            const kml = FileManager.get(trackFileName);

            // adsBX flight number will be in
            // kml.kml.Folder.Folder.name in the format "Flightnumber track"
            // so first check that exits, along with intermedia objects
            // kml is NOT an array, so we need to check for the existence of the object
            if (kml.kml !== undefined && kml.kml.Folder !== undefined && kml.kml.Folder.Folder !== undefined
                && kml.kml.Folder.Folder.name !== undefined) {
                const match = kml.kml.Folder.Folder.name['#text'].match(/([A-Z0-9]+) track/);
                if (match !== null) {
                    shortName = match[1];
                    found = true;
                }
            }

            if (!found) {
                if (kml.kml !== undefined && kml.kml.Document !== undefined && kml.kml.Document.name !== undefined) {
                    // example: FlightAware ✈ RYR5580 15-Oct-2022 (EDI / EGPH-ALC / LEAL)
                    // so we want the RYR5580 part
                    const name = kml.kml.Document.name['#text']

                    const match = name.match(/FlightAware ✈ ([A-Z0-9]+) /);
                    if (match !== null) {
                        shortName = match[1];
                        found = true;
                    }
                    else {
                        // another format is like:
                        // "DL4113/SKW4113"
                        // check to see if we have an alphanumeric string followed by a slash then another alphanumeric string
                        // and use the first one if so
                        const match = name.match(/([A-Z0-9]+)\/[A-Z0-9]+/);
                        if (match !== null) {
                            shortName = match[1];
                            found = true;
                        } else {
                            // just use the Document name
                            shortName = name;
                            found = true;
                        }
                    }
                }
            }

        }


        if (!found) {
            const match = trackFileName.match(/FlightAware_([A-Z0-9]+)_/);
            if (match !== null) {
                shortName = match[1];
            } else {
                // check for something like N121DZ-track-EGM96.kml
                const match = trackFileName.match(/([A-Z0-9]+)-track-/);
                if (match !== null) {
                    shortName = match[1];
                } else {
                    // check if this has MISB data, and if so, use the platform tail
                    // if (misb[0][MISB.PlatformTailNumber] !== undefined) {
                    //     shortName = misb[0][MISB.PlatformTailNumber];
                    // }
                    // get the file from the file manager

                    // is it a misb file?
                    if (ext === "srt" || ext === "csv" || ext === "klv") {
                        const misb = FileManager.get(trackFileName)
                        if (misb[0][MISB.PlatformTailNumber] !== undefined) {
                            shortName = misb[0][MISB.PlatformTailNumber];
                        } else {
                            // MISB, but can't find a tail number, so just use the filename without the extension
                            shortName = trackFileName.replace(/\.[^/.]+$/, "");
                        }

                    } else {
                        // some KLM files are like
                        // DL4113-3376e834.kml
                        // so we just want the DL4113 part
                        // but we need to check first to see if it:
                        // alphanum hexnum.kml
                        const match = trackFileName.match(/([A-Z0-9]+)-[0-9a-f]+\.kml/);
                        if (match !== null) {
                            shortName = match[1];
                        } else {
                            // not a misb file, but no filename format found
                            // just use the filename without the extension
                            shortName = trackFileName.replace(/\.[^/.]+$/, "");
                        }

                    }

                }
            }
        }

        // removeDuplicates will be true if it's, for example, loaded via drag-and-drop
        // where the user might drag in the same file(s) twice
        // so if it exists, we call disposeRemove to free any buffers, and remove it from the manager
        // so then we can just reload it again
        if (removeDuplicates) {
            // iterate over the tracks and find if there is one that has the same filename
            // in trackFileName
            TrackManager.iterate((key, trackOb) => {
                if (trackOb.trackFileName === trackFileName) {
                    // remove it from the track manager
                    TrackManager.disposeRemove(key);

                }
            })
        }

        // TODO - check short name for duplicates or being empty


        const trackDataID = "TrackData_" + shortName;
        const trackID = "Track_" + shortName;

        console.log("Creating track with trackID", shortName, "in addTracks")

        // just use the default MISB Columns, so no columns are specified
        makeTrackFromDataFile(trackFileName, trackDataID, trackID);


        const trackNode = NodeMan.get(trackID);
        const trackDataNode = NodeMan.get(trackDataID);
        // this has the original data in common MISB format, regardless of the data type
        // actual MISB (and possibly other CSV inputs) might have a center track
        //
        const misb = trackDataNode.misb;

        // Create the track object
        const trackOb = TrackManager.add(trackID, new CMetaTrack(trackFileName, trackDataNode, trackNode));
        trackOb.trackID = trackID;
        trackOb.menuText = shortName;

        // This track will include FOV and angles
        // but if there's a center track, we make a separate track for that
        // in data it looks like
        // targetTrack: {
        //     kind: "TrackFromMISB",
        //         misb: "cameraTrackData",
        //         columns: ["FrameCenterLatitude", "FrameCenterLongitude", "FrameCenterElevation"]
        // },


        let centerID = null;
        if (misb[0][MISB.FrameCenterLatitude] !== undefined) {
            hasCenter = true;

            const centerDataID = "CenterData_" + shortName;
            centerID = "Center_" + shortName;
            // const centerTrack = new CNodeTrackFromMISB({
            //     id: centerTrackID,
            //     misb: trackDataNode,
            //     columns: ["FrameCenterLatitude", "FrameCenterLongitude", "FrameCenterElevation"],
            //     exportable: true,
            // })

            makeTrackFromDataFile(trackFileName, centerDataID, centerID,
                ["FrameCenterLatitude", "FrameCenterLongitude", "FrameCenterElevation"]);

            trackOb.centerDataNode = NodeMan.get(centerDataID);
            trackOb.centerNode = NodeMan.get(centerID);


        }

        console.log(Sit.dropTargets)

        // how many tracks are there now?
        const trackNUmber = TrackManager.size();
        console.log(`Track number: ${trackNUmber}`)


        if (Sit.dropTargets !== undefined && Sit.dropTargets["track"] !== undefined) {
            const dropTargets = Sit.dropTargets["track"]
            for (let dropTargetSwitch of dropTargets) {

                // if it ends with a - and a number, then we extract that number, called "selectNumber

                // we set the selectNumber to the track number by default
                // which means that it will always be selected
                // unless the dropTarget has a number at the end
                // in which case it will be selected only that's the same as the track number
                let selectNumber = trackNUmber;
                const match = dropTargetSwitch.match(/-(\d+)$/);
                if (match !== null) {
                    selectNumber = Number(match[1]);
                    // strip off the last part
                    dropTargetSwitch = dropTargetSwitch.substring(0, dropTargetSwitch.length - match[0].length);

                }

                if (NodeMan.exists(dropTargetSwitch)) {
                    const switchNode = NodeMan.get(dropTargetSwitch);

                    // switchNode.removeOption("KML Track")
                    // switchNode.addOptionToGUIMenu("KML Track", new CNodeControllerTrackPosition({
                    //     sourceTrack: trackID,
                    // }))


                    if (Sit.dropAsController) {
                        // backwards compatibility for SitNightSky
                        // which expects dropped tracks to create a controller
                        switchNode.addOption(shortName, new CNodeControllerTrackPosition({
                            id: "TrackController_" + trackID,
                            sourceTrack: trackID,
                        }))
                        // and select it
                        if (trackNUmber === selectNumber) {
                            switchNode.selectOption(shortName)
                        }
                    } else {
                        // drag and drop default now just adds the data source track, not a controller
                        // this is more flexible, as the user can then add a controller if they want
                        switchNode.removeOption(shortName)
                        switchNode.addOption(shortName, NodeMan.get(trackID))
                        // and select it (Quietly, as we don't want to zoom to it yet)
                        if (trackNUmber === selectNumber) {
                            switchNode.selectOptionQuietly(shortName)
                        }
                        // if there's a center point track, make that as well
                        if (centerID !== null) {
                            const menuTextCenter = "Center " + shortName;
                            switchNode.removeOption(menuTextCenter)
                            switchNode.addOption(menuTextCenter, NodeMan.get(centerID))
                            // if it's being added to targetTrackSwitch then select it
                            if (switchNode.id === "targetTrackSwitch") {
                                switchNode.selectOption(menuTextCenter)
                            }
                        }

                    }


                    // add to the "Sync Time to" menu
                    GlobalDateTimeNode.addSyncToTrack(trackDataID);
                    // and call it to sync the time
                    // we don't need to recalculate from this track
                    // as it's only just been loaded. ????????
                    // Actually, we do, as the change in time will change the
                    // position of the per-frame track segment and the display
                    GlobalDateTimeNode.syncStartTimeTrack();

                }
            }

            // If we are adding the track to a drop target
            // then also creat a Track Options menu for it, so the user can:
            // - change the color
            // - change the width
            // - toggle the display
            // - toggle distance and altitiude labels
            // - toggle the display of the target sphere
            // - edit the size of the target sphere
            // - toggle wireframe or solid
            // - change the sphere color
            // - toggle sunlight illumination
            // - add a model, like a 737, etc. Maybe even a custom local model?
            // - add a label

            // perhaps we need a track manager to keep track of all the tracks

            // HERE WE ARE!!!!
        }

        // if the track had FOV data, and there's an fov drop target, then add it
        //
        let value = trackNode.v(0);
        if (typeof value === "string") {
            value = Number(value);
        }

        if (isNumber(value)) {
            hasFOV = true;
        } else if (value.misbRow !== undefined && !isNaN(Number(value.misbRow[MISB.SensorVerticalFieldofView]))) {
            hasFOV = true;
        } else if (value.vFOV !== undefined) {
            hasFOV = true;
        }


        if (hasFOV && Sit.dropTargets !== undefined && Sit.dropTargets["fov"] !== undefined) {
            const dropTargets = Sit.dropTargets["fov"]
            for (const dropTargetSwitch of dropTargets) {
                if (NodeMan.exists(dropTargetSwitch)) {
                    const switchNode = NodeMan.get(dropTargetSwitch);
                    switchNode.removeOption(trackID)
                    switchNode.addOption(trackID, NodeMan.get(trackID))
                    switchNode.selectOption(trackID)
                }
            }
        }

        // same type of thing for heading angles
        if (value.misbRow !== undefined && isNumber(value.misbRow[MISB.PlatformPitchAngle])) {
            hasAngles = true;
        }

        //
        if (hasAngles && Sit.dropTargets !== undefined && Sit.dropTargets["angles"] !== undefined) {
            let data = {
                id: trackID+"_LOS",
                smooth: 120, // maybe GUI this?
            }
            let anglesNode = makeLOSNodeFromTrackAngles(trackID, data);
            trackOb.anglesNode = anglesNode;
            let anglesID = "Angles_" + shortName;
            let anglesController = new CNodeControllerMatrix({
                id: anglesID,
                source: anglesNode,
            })
            trackOb.anglesController = anglesController;

            const lookCamera = NodeMan.get("lookCamera");
            lookCamera.addControllerNode(anglesController)

            const dropTargets = Sit.dropTargets["angles"]
            for (const dropTargetSwitch of dropTargets) {
                if (NodeMan.exists(dropTargetSwitch)) {
                    const switchNode = NodeMan.get(dropTargetSwitch);
                    switchNode.removeOption(anglesID)
                    switchNode.addOption(anglesID, NodeMan.get(anglesID))
                    switchNode.selectOption(anglesID)
                }
            }
        }





        trackOb.trackDisplayDataNode = new CNodeDisplayTrack({
            id: "TrackDisplayData_" + shortName,
            track: "TrackData_" + shortName,
            color: new CNodeConstant({id: "colorData_"+shortName, value: new Color(1, 0, 0)}),
            width: 0.5,
            //  toGround: 1, // spacing for lines to ground
            ignoreAB: true,
            layers: LAYER.MASK_HELPERS,

        })

        trackOb.trackDisplayNode = new CNodeDisplayTrack({
            id: "TrackDisplay_" + shortName,
            track: "Track_" + shortName,
            color: new CNodeConstant({id: "colorTrack_"+shortName, value: new Color(1, 0, 1)}),
            width: 3,
            //  toGround: 1, // spacing for lines to ground
            ignoreAB: true,
            layers: LAYER.MASK_HELPERS,

        })


     //    trackOb.displayTargetSphere = new CNodeDisplayTargetSphere({
     //        id: trackOb.shortName+"_ob",
     //        inputs: {
     //            track: trackOb.trackNode,
     // //           size: "sizeTargetScaled",
     //        },
     //        color: [1, 0, 1],
     //        layers: sphereMask,
     //        wireframe: true,
     //
     //    })


        const sphereId = trackOb.menuText ?? shortName;

            // instead of a sphere, add a 3dObject sphere and follow controllers
        trackOb.displayTargetSphere = new CNode3DObject({
            id: sphereId+"_ob",
            object: "sphere",
            radius: 10,

        });

        trackOb.displayTargetSphere.addController("TrackPosition",{
         //   id: trackOb.shortName+"_controller",
            sourceTrack: trackID,
        });

        trackOb.displayTargetSphere.addController("ObjectTilt", {
            track: trackID,
            tiltType: "banking",
        })



        if (centerID !== null) {

            trackOb.displayCenterDataNode = new CNodeDisplayTrack({
                id: "CenterDisplayData_" + shortName,
                track: "CenterData_" + shortName,
                color: new CNodeConstant({id: "colorCenterData_"+shortName, value: new Color(0, 1, 0)}),
                width: 0.5,
                //  toGround: 1, // spacing for lines to ground
                ignoreAB: true,
                layers: LAYER.MASK_HELPERS,

            })

            trackOb.displayCenterNode = new CNodeDisplayTrack({
                id: "CenterDisplay_" + shortName,
                track: centerID,
                color: new CNodeConstant({id: "colorCenter_"+shortName, value: new Color(1, 1, 0)}),
                width: 3,
                //  toGround: 1, // spacing for lines to ground
                ignoreAB: true,
                layers: LAYER.MASK_HELPERS,

            })


            // trackOb.displayCenterSphere = new CNodeDisplayTargetSphere({
            //     id: "CenterSphere_" + shortName,
            //     inputs: {
            //         track: trackOb.centerNode,
            //         size: "sizeTargetScaled",
            //     },
            //     color: [1, 1, 0],
            //     layers: sphereMask,
            //     wireframe: true,
            //
            // })


        }

        if (Sit.centerOnLoadedTracks && !Globals.dontAutoZoom) {
            // maybe adjust the main view camera to look at the center of the track
            const mainCameraNode = NodeMan.get("mainCamera");
            const mainCamera = mainCameraNode.camera;
            const mainView = NodeMan.get("mainView");
            const bbox = trackBoundingBox(trackOb.trackDataNode);
            console.log(`Track ${shortName} bounding box: ${bbox.min.x}, ${bbox.min.y}, ${bbox.min.z} to ${bbox.max.x}, ${bbox.max.y}, ${bbox.max.z}`)
            const center = bbox.min.clone().add(bbox.max).multiplyScalar(0.5);
            // get point on sphere
            const ground = pointOnSphereBelow(center);
            // what's the length of the diagonal of the bounding box?
            const diagonal = bbox.max.clone().sub(bbox.min).length();

            const hfov = mainView.getHFOV();
            // we want the camera height be enough to encompass the diagonal across the hfov
            const cameraHeight = (diagonal * 1.25) / (2 * Math.tan(hfov / 2));


            // move the camera up by the cameraHeight
            const up = getLocalUpVector(ground);
            const cameraTarget = ground.clone().add(up.clone().multiplyScalar(cameraHeight));
            // and move south by  the cameraHeight
            const south = getLocalSouthVector(ground);
            cameraTarget.add(south.clone().multiplyScalar(cameraHeight));
            mainCamera.position.copy(cameraTarget);
            mainCamera.lookAt(ground);

            // since we've set the camera default postion for this track, store it
            // so calling mainCameraNode.resetCamera() will use these new values

            mainCameraNode.snapshotCamera();


            // // first get LLA versions of the EUS values cameraTarget and ground
            // const cameraTargetLLA = EUSToLLA(cameraTarget);
            // const groundLLA = EUSToLLA(ground);
            // // then store them in the mainCamera node
            // mainCameraNode.startPosLLA = cameraTargetLLA;
            // mainCameraNode.lookAtLLA = groundLLA;


            // If this is not the first track, then find the time of the closest intersection.

            const track0 = TrackManager.getByIndex(0);
            if (track0 !== trackOb) {
                let time = closestIntersectionTime(track0.trackDataNode, trackOb.trackDataNode);
                console.log("Closest intersection time: ", time);

                // we want this in the middle, so subtract half the Sit.frames

                //    time -= Math.floor(Sit.frames*Sit.fps*1000);

                GlobalDateTimeNode.setStartDateTime(time);
                GlobalDateTimeNode.recalculateCascade();
                par.renderOne = true;

                // and make the 2nd track the target track if we have a targetTrackSwitch
                if (NodeMan.exists("targetTrackSwitch")) {
                    const targetTrackSwitch = NodeMan.get("targetTrackSwitch");
                    targetTrackSwitch.selectOption(trackOb.menuText);

                    // and make the camera track switch use the other track.
                    const cameraTrackSwitch = NodeMan.get("cameraTrackSwitch");
                    cameraTrackSwitch.selectOption(track0.menuText);

                    // and set the traverse mode to target object
                    const traverseModeSwitch = NodeMan.get("LOSTraverseSelectTrack");
                    traverseModeSwitch.selectOption("Target Object");

                    // second track, so we assume we want to focus on this target
                    // so we are setting the "Camera Heading"  to "To Target" (from "Use Angles")
                    const headingSwitch = NodeMan.get("CameraLOSController", true);
                    if (headingSwitch) {
                        headingSwitch.selectOption("To Target");
                    }


                }

                // and since we have an intersection, zoomTo it if there's a TerrainModel
                if (NodeMan.exists("terrainUI")) {
                    let terrainUINode = NodeMan.get("terrainUI")
                    terrainUINode.zoomToTrack(trackOb.trackNode);
                }


            } else {
                // this is the first track loaded.
                // so just center on this track
                if (NodeMan.exists("terrainUI")) {
                    let terrainUINode = NodeMan.get("terrainUI")
                    terrainUINode.zoomToTrack(trackOb.trackNode);
                }


                // if it's a simple track with no center track and no angles (i.e. not MISB)
                // then switch to "Use Angles" for the camera heading
                // which will use the PTZ control as no angles track will be loaded yet

                if (!hasCenter && !hasAngles) {

                    // first simple track, so just use angles
                    // which will point the camera in a fixed direction
                    const headingSwitch = NodeMan.get("CameraLOSController", true);
                    if (headingSwitch) {
                        headingSwitch.selectOption("Use Angles");
                    }

                }



            }

        }

        trackOb.gui = new CNodeTrackGUI({
            id: trackID + "_GUI",
            metaTrack: trackOb,
        })


    }

    // we've loaded some tracks, and set stuff up, so ensure everything is calculated
    NodeMan.recalculateAllRootFirst()
    par.renderOne = true;

}


export function addKMLMarkers(kml) {
    console.log(kml)
}