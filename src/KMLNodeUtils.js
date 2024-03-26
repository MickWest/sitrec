// Creaitng timed data and then tracks from pre-parsed KML files
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


export const KMLTrackManager = new CManager();


export function addKMLTracks(tracks, removeDuplicates = false, sphereMask = LAYER.MASK_HELPERS) {

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
        // so if it exists, we call disposeRemove to free any buffers, and remve it from the manager
        // so then we can just reload it again
        if (removeDuplicates) {
            NodeMan.disposeRemove("KMLTargetData" + track);
            NodeMan.disposeRemove("KMLTarget" + track);
            NodeMan.disposeRemove("KMLDisplayTargetData" + track);
            NodeMan.disposeRemove("KMLDisplayTarget" + track);
            NodeMan.disposeRemove("KMSphere" + track);
        }

        const trackDataID = "KMLTargetData"+track;
        const trackID = "KMLTarget"+track;

        console.log("Creating track with trackID", trackID, "in addKMLTracks")

        makeTrackFromDataFile(track, trackDataID, trackID);

        if (NodeMan.exists("cameraSwitch")) {
            const switchNode = NodeMan.get("cameraSwitch");
            switchNode.removeOption("KML Track")
            switchNode.addOption("KML Track", new CNodeControllerTrackPosition({
                sourceTrack: trackID,
            }) )
            // and select it
            switchNode.selectOption("KML Track")

            // add a "Sync to Track" button, if there isn't one.
            GlobalDateTimeNode.addSyncToTrack(trackDataID);
            // and call it
            //GlobalDateTimeNode.syncStartTimeTrack(trackDataID);

        }


        new CNodeDisplayTrack({
            id: "KMLDisplayTargetData"+track,
            track: "KMLTargetData"+track,
            color: new CNodeConstant({value: new Color(1, 0, 0)}),
            dropColor: new CNodeConstant({value: new Color(0.8, 0.6, 0)}),
            width: 0.5,
          //  toGround: 1, // spacing for lines to ground
            ignoreAB: true,
            layers: LAYER.MASK_HELPERS,

        })


        new CNodeDisplayTrack({
            id: "KMLDisplayTarget"+track,
            track: "KMLTarget"+track,
            color: new CNodeConstant({value: new Color(1, 0, 1)}),
            dropColor: new CNodeConstant({value: new Color(0.8, 0.6, 0)}),
            width: 3,
          //  toGround: 1, // spacing for lines to ground
            ignoreAB: true,
            layers: LAYER.MASK_HELPERS,

        })


        new CNodeDisplayTargetSphere({
            id: "KMSphere"+track,
            inputs: {
                track: "KMLTarget"+track,
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