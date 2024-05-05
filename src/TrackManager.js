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


//export const TrackManager = new CManager();


export function addTracks(tracks, removeDuplicates = false, sphereMask = LAYER.MASK_HELPERS) {

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
            NodeMan.disposeRemove("TrackDisplayData_" + track);
            NodeMan.disposeRemove("TrackDisplay_" + track);
            NodeMan.disposeRemove("TrackSphere_" + track);
        }

        const trackDataID = "TrackData_"+track;
        const trackID = "Track_"+track;

        console.log("Creating track with trackID", trackID, "in addTracks")

        makeTrackFromDataFile(track, trackDataID, trackID);

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


        new CNodeDisplayTrack({
            id: "TrackDisplayData_"+track,
            track: "TrackData_"+track,
            color: new CNodeConstant({value: new Color(1, 0, 0)}),
            dropColor: new CNodeConstant({value: new Color(0.8, 0.6, 0)}),
            width: 0.5,
          //  toGround: 1, // spacing for lines to ground
            ignoreAB: true,
            layers: LAYER.MASK_HELPERS,

        })


        new CNodeDisplayTrack({
            id: "TrackDisplay_"+track,
            track: "Track_"+track,
            color: new CNodeConstant({value: new Color(1, 0, 1)}),
            dropColor: new CNodeConstant({value: new Color(0.8, 0.6, 0)}),
            width: 3,
          //  toGround: 1, // spacing for lines to ground
            ignoreAB: true,
            layers: LAYER.MASK_HELPERS,

        })


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