// Support functions for the custom sitches

// per-frame update code for custom sitches
import {NodeMan} from "./Globals";
import * as LAYER from "./LayerMasks";
import {TrackManager} from "./TrackManager";

export function customUpdate(f) {

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

}