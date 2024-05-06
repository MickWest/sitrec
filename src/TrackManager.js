// Creating timed data and then tracks from pre-parsed track files
// should be agnostic to the source of the data (KML/ADSB, CSV, KLVS, etc)
import {CNodeScale} from "./nodes/CNodeScale";
import {CNodeGUIValue} from "./nodes/CNodeGUIValue";
import {CNodeTrackFromMISB} from "./nodes/CNodeTrackFromMISB";
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


//export const TrackManager = new CManager();

// tracks = array of filenames of files that have been loaded and that
// we cant to make tracks from
export function addTracks(tracks, removeDuplicates = false, sphereMask = LAYER.MASK_HELPERS) {

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

    for (const track of tracks) {
        ////////////////////////////////////////////////////

        // removeDuplicates will be true if it's, for example, loaded via drag-and-drop
        // where the user might drag in the same file(s) twice
        // so if it exists, we call disposeRemove to free any buffers, and remove it from the manager
        // so then we can just reload it again
        if (removeDuplicates) {
            NodeMan.disposeRemove("TrackData_" + track);
            NodeMan.disposeRemove("Track_" + track);
            NodeMan.disposeRemove("CenterData_" + track);
            NodeMan.disposeRemove("Center_" + track);

            NodeMan.disposeRemove("TrackDisplayData_" + track);
            NodeMan.disposeRemove("TrackDisplay_" + track);
            NodeMan.disposeRemove("TrackSphere_" + track);

            // WILL NEED TO REMOVE CENTER TRACKS TOO
        }

        const trackDataID = "TrackData_"+track;
        const trackID = "Track_"+track;

        console.log("Creating track with trackID", trackID, "in addTracks")

        // just use the default MISB Columns, so no columns are specified
        makeTrackFromDataFile(track, trackDataID, trackID);

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
        // this has the original data in common MISB format, regardless of the data type
        // actual MISB (and possibly other CSV inputs) might have a center track
        //
        const misb = trackDataNode.misb;
        let centerID = null;
        if (misb[0][MISB.FrameCenterLatitude] !== undefined) {

            const centerDataID = "CenterData_" + track;
            centerID = "Center_" + track;
            // const centerTrack = new CNodeTrackFromMISB({
            //     id: centerTrackID,
            //     misb: trackDataNode,
            //     columns: ["FrameCenterLatitude", "FrameCenterLongitude", "FrameCenterElevation"],
            //     exportable: true,
            // })

            makeTrackFromDataFile(track, centerDataID, centerID,
                ["FrameCenterLatitude", "FrameCenterLongitude", "FrameCenterElevation"]);

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

                    const menuText = "Track "+track

                    if (Sit.dropAsController) {
                        // backwards compatibility for SitNightSky
                        // which expects dropped tracks to create a controller
                        switchNode.addOption(menuText, new CNodeControllerTrackPosition({
                            sourceTrack: trackID,
                        }))
                    } else {
                        // drag and drop default now just adds the data source track, not a controller
                        // this is more flexible, as the user can then add a controller if they want
                        switchNode.addOption(menuText, NodeMan.get(trackID))

                        // if there's a center point track, make that as well
                        if (centerID !== null) {
                            switchNode.addOption("Center "+track, NodeMan.get(centerID))
                        }

                    }
                    // and select it
                    switchNode.selectOption(menuText)

                    // add a "Sync to Track" button, if there isn't one.
                    GlobalDateTimeNode.addSyncToTrack(trackDataID);
                    // and call it
                    //GlobalDateTimeNode.syncStartTimeTrack(trackDataID);

                }
            }
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
                    switchNode.addOption(trackID, NodeMan.get(trackID))
                    switchNode.selectOption(trackID)
                }
            }
        }


        new CNodeDisplayTrack({
            id: "TrackDisplayData_"+track,
            track: "TrackData_"+track,
            color: new CNodeConstant({value: new Color(1, 0, 0)}),
            width: 0.5,
          //  toGround: 1, // spacing for lines to ground
            ignoreAB: true,
            layers: LAYER.MASK_HELPERS,

        })

        new CNodeDisplayTrack({
            id: "TrackDisplay_"+track,
            track: "Track_"+track,
            color: new CNodeConstant({value: new Color(1, 0, 1)}),
            width: 3,
          //  toGround: 1, // spacing for lines to ground
            ignoreAB: true,
            layers: LAYER.MASK_HELPERS,

        })

        if (centerID !== null) {

            new CNodeDisplayTrack({
                id: "CenterDisplayData_" + track,
                track: "CenterData_" + track,
                color: new CNodeConstant({value: new Color(0, 1, 0)}),
                width: 0.5,
                //  toGround: 1, // spacing for lines to ground
                ignoreAB: true,
                layers: LAYER.MASK_HELPERS,

            })

            new CNodeDisplayTrack({
                id: "CenterDisplay_" + track,
                track: centerID,
                color: new CNodeConstant({value: new Color(1, 1, 0)}),
                width: 3,
                //  toGround: 1, // spacing for lines to ground
                ignoreAB: true,
                layers: LAYER.MASK_HELPERS,

            })
        }



        new CNodeDisplayTargetSphere({
            id: "TrackSphere_"+track,
            inputs: {
                track: "Track_"+track,
                size: "sizeTargetScaled",
            },
            color: [1, 1, 0],
            layers: sphereMask,
        })



    }

}


export function addKMLMarkers(kml) {
    console.log(kml)
}