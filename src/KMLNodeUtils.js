// give an array of file ID strings, create the KML tracks for them
// along with moving target spheres
import {CNodeScale} from "./nodes/CNodeScale";
import {CNodeGUIValue} from "./nodes/CNodeGUIValue";
import {CNodeKMLTrack} from "./nodes/CNodeKMLTrack";
import {CNodeConstant} from "./nodes/CNode";
import * as LAYER from "./LayerMasks";
import {Color} from "../three.js/build/three.module";
import {scaleF2M} from "./utils";
import {Sit, gui, NodeMan} from "./Globals";
import {CNodeKMLDataTrack} from "./nodes/CNodeKMLDataTrack";
import {CNodeDisplayTrack} from "./nodes/CNodeDisplayTrack";
import {CNodeDisplayTargetSphere} from "./nodes/CNodeDisplayTargetSphere";
import {CManager} from "./CManager";


export const KMLTrackManager = new CManager();


export function addKMLTracks(tracks, removeDuplicates = false) {

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


        // the data track stores the raw positions and timestamps from the KML file
        const targetData = new CNodeKMLDataTrack({
            id: "KMLTargetData"+track,
            KMLFile: track,
        })

        // the target segment is a per-frame track that is interpolated from part of the data track
        const target = new CNodeKMLTrack({
            id: "KMLTarget"+track, // in all these we get a unique id by adding the track id
            KMLData: targetData,
        })


        new CNodeDisplayTrack({
            id: "KMLDisplayTargetData"+track,
            track: "KMLTargetData"+track,
            color: new CNodeConstant({value: new Color(1, 0, 0)}),
            dropColor: new CNodeConstant({value: new Color(0.8, 0.6, 0)}),
            width: 0.5,
          //  toGround: 1, // spacing for lines to ground
            ignoreAB: true,
            layers: LAYER.MASK_NAR,

        })


        new CNodeDisplayTrack({
            id: "KMLDisplayTarget"+track,
            track: "KMLTarget"+track,
            color: new CNodeConstant({value: new Color(1, 0, 1)}),
            dropColor: new CNodeConstant({value: new Color(0.8, 0.6, 0)}),
            width: 3,
          //  toGround: 1, // spacing for lines to ground
            ignoreAB: true,
            layers: LAYER.MASK_NAR,

        })


        new CNodeDisplayTargetSphere({
            id: "KMSphere"+track,
            inputs: {
                track: "KMLTarget"+track,
                size: "sizeTargetScaled",
            },

            layers: LAYER.MASK_NAR,
        })



    }

}


export function addKMLMarkers(kml) {
    console.log(kml)
}