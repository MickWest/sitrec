// Creating timed data and then tracks from pre-parsed track files
// should be agnostic to the source of the data (KML/ADSB, CSV, KLVS, etc)
import {CNodeScale} from "./nodes/CNodeScale";
import {CNodeGUIValue} from "./nodes/CNodeGUIValue";
import {CNodeConstant} from "./nodes/CNode";
import * as LAYER from "./LayerMasks";
import {Color} from "../three.js/build/three.module";
import {scaleF2M} from "./utils";
import {Sit, gui, NodeMan, GlobalDateTimeNode} from "./Globals";
import {CNodeDisplayTrack} from "./nodes/CNodeDisplayTrack";
import {CNodeDisplayTargetSphere} from "./nodes/CNodeDisplayTargetSphere";
import {CManager} from "./CManager";
import {CNodeControllerTrackPosition} from "./nodes/CNodeControllerVarious";
import {makeTrackFromDataFile} from "./nodes/CNodeTrack";
import {MISB} from "./MISBUtils";
import {isNumber} from "mathjs";


export const TrackManager = new CManager();

class CSitrecTrack {
    constructor(trackFileName, trackDataNode, trackNode) {
        this.trackNode = trackNode;
        this.trackDataNode = trackDataNode;
        this.trackFileName = trackFileName;
    }


    dispose() {
        NodeMan.disposeRemove(this.trackNode);
        NodeMan.disposeRemove(this.trackDataNode);
        NodeMan.disposeRemove(this.centerNode);
        NodeMan.disposeRemove(this.centerDataNode);
        NodeMan.disposeRemove(this.trackDisplayDataNode);
        NodeMan.disposeRemove(this.trackDisplayNode);
        NodeMan.disposeRemove(this.displayCenterDataNode);
        NodeMan.disposeRemove(this.displayCenterNode);
        NodeMan.disposeRemove(this.displayTargetSphere);
        NodeMan.disposeRemove(this.displayCenterSphere);


        // NodeMan.disposeRemove("TrackData_" + trackFileName);
        // NodeMan.disposeRemove("Track_" + trackFileName);
        // NodeMan.disposeRemove("CenterData_" + trackFileName);
        // NodeMan.disposeRemove("Center_" + trackFileName);
        //
        // NodeMan.disposeRemove("TrackDisplayData_" + trackFileName);
        // NodeMan.disposeRemove("TrackDisplay_" + trackFileName);
        // NodeMan.disposeRemove("TrackSphere_" + trackFileName);

    }

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
            }, gui)
        )
    }

    for (const trackFileName of trackFiles) {
        ////////////////////////////////////////////////////

        // removeDuplicates will be true if it's, for example, loaded via drag-and-drop
        // where the user might drag in the same file(s) twice
        // so if it exists, we call disposeRemove to free any buffers, and remove it from the manager
        // so then we can just reload it again
        if (removeDuplicates) {
            // NodeMan.disposeRemove("TrackData_" + trackFileName);
            // NodeMan.disposeRemove("Track_" + trackFileName);
            // NodeMan.disposeRemove("CenterData_" + trackFileName);
            // NodeMan.disposeRemove("Center_" + trackFileName);
            //
            // NodeMan.disposeRemove("TrackDisplayData_" + trackFileName);
            // NodeMan.disposeRemove("TrackDisplay_" + trackFileName);
            // NodeMan.disposeRemove("TrackSphere_" + trackFileName);
            // WILL NEED TO REMOVE CENTER TRACKS TOO
            if (TrackManager.exists("Track_" + trackFileName)) {
                TrackManager.disposeRemove("Track_" + trackFileName);
            }
        }

        const trackDataID = "TrackData_" + trackFileName;
        const trackID = "Track_" + trackFileName;

        console.log("Creating track with trackID", trackID, "in addTracks")

        // just use the default MISB Columns, so no columns are specified
        makeTrackFromDataFile(trackFileName, trackDataID, trackID);

        // This track will include FOV and angles
        // but if there's a center track, we make a separate track for that
        // in data it looks like
        // targetTrack: {
        //     kind: "TrackFromMISB",
        //         misb: "cameraTrackData",
        //         columns: ["FrameCenterLatitude", "FrameCenterLongitude", "FrameCenterElevation"]
        // },

        const trackNode = NodeMan.get(trackID);
        const trackDataNode = NodeMan.get(trackDataID);
        const trackOb = TrackManager.add(trackID, new CSitrecTrack(trackFileName, trackDataNode, trackNode));
        // this has the original data in common MISB format, regardless of the data type
        // actual MISB (and possibly other CSV inputs) might have a center track
        //
        const misb = trackDataNode.misb;
        let centerID = null;
        if (misb[0][MISB.FrameCenterLatitude] !== undefined) {

            const centerDataID = "CenterData_" + trackFileName;
            centerID = "Center_" + trackFileName;
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

        if (Sit.dropTargets !== undefined && Sit.dropTargets["track"] !== undefined) {
            const dropTargets = Sit.dropTargets["track"]
            for (const dropTargetSwitch of dropTargets) {
                if (NodeMan.exists(dropTargetSwitch)) {
                    const switchNode = NodeMan.get(dropTargetSwitch);

                    // switchNode.removeOption("KML Track")
                    // switchNode.addOptionToGUIMenu("KML Track", new CNodeControllerTrackPosition({
                    //     sourceTrack: trackID,
                    // }))

                    const menuText = "Track " + trackFileName

                    if (Sit.dropAsController) {
                        // backwards compatibility for SitNightSky
                        // which expects dropped tracks to create a controller
                        switchNode.addOption(menuText, new CNodeControllerTrackPosition({
                            sourceTrack: trackID,
                        }))
                        // and select it
                        switchNode.selectOption(menuText)
                    } else {
                        // drag and drop default now just adds the data source track, not a controller
                        // this is more flexible, as the user can then add a controller if they want
                        switchNode.removeOption(menuText)
                        switchNode.addOption(menuText, NodeMan.get(trackID))
                        // and select it
                        switchNode.selectOption(menuText)

                        // if there's a center point track, make that as well
                        if (centerID !== null) {
                            const menuTextCenter = "Center " + trackFileName;
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
                    // and call it
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
        let hasFOV = false;
        const value = trackNode.v(0);
        if (typeof value === "number") {
            hasFOV = true;
        } else if (value.misbRow !== undefined && isNumber(value.misbRow[MISB.SensorVerticalFieldofView])) {
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


        trackOb.trackDisplayDataNode = new CNodeDisplayTrack({
            id: "TrackDisplayData_" + trackFileName,
            track: "TrackData_" + trackFileName,
            color: new CNodeConstant({value: new Color(1, 0, 0)}),
            width: 0.5,
            //  toGround: 1, // spacing for lines to ground
            ignoreAB: true,
            layers: LAYER.MASK_HELPERS,

        })

        trackOb.trackDisplayNode = new CNodeDisplayTrack({
            id: "TrackDisplay_" + trackFileName,
            track: "Track_" + trackFileName,
            color: new CNodeConstant({value: new Color(1, 0, 1)}),
            width: 3,
            //  toGround: 1, // spacing for lines to ground
            ignoreAB: true,
            layers: LAYER.MASK_HELPERS,

        })


        trackOb.displayTargetSphere = new CNodeDisplayTargetSphere({
            id: "TrackSphere_" + trackFileName,
            inputs: {
                track: trackOb.trackNode,
                size: "sizeTargetScaled",
            },
            color: [1, 0, 1],
            layers:sphereMask
        })

        if (centerID !== null) {

            trackOb.displayCenterDataNode = new CNodeDisplayTrack({
                id: "CenterDisplayData_" + trackFileName,
                track: "CenterData_" + trackFileName,
                color: new CNodeConstant({value: new Color(0, 1, 0)}),
                width: 0.5,
                //  toGround: 1, // spacing for lines to ground
                ignoreAB: true,
                layers: LAYER.MASK_HELPERS,

            })

            trackOb.displayCenterNode = new CNodeDisplayTrack({
                id: "CenterDisplay_" + trackFileName,
                track: centerID,
                color: new CNodeConstant({value: new Color(1, 1, 0)}),
                width: 3,
                //  toGround: 1, // spacing for lines to ground
                ignoreAB: true,
                layers: LAYER.MASK_HELPERS,

            })


            trackOb.displayCenterSphere = new CNodeDisplayTargetSphere({
                id: "CenterSphere_" + trackFileName,
                inputs: {
                    track: trackOb.centerNode,
                    size: "sizeTargetScaled",
                },
                color: [1, 1, 0],
                layers: sphereMask,
            })

        }
    }
}


export function addKMLMarkers(kml) {
    console.log(kml)
}