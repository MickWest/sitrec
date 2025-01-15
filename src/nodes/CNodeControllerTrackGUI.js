import {CNodeGUIColor} from "./CNodeGUIColor";
import {guiMenus, guiShowHide, NodeMan} from "../Globals";
import {CNode} from "./CNode";
import {par} from "../par";
import * as LAYERS from "../LayerMasks";




// Common GUI Elements for a CMetaTrack
export class CNodeTrackGUI extends CNode {
    constructor(v) {
        super(v);



        this.metaTrack = v.metaTrack;
        this.displayNode = this.metaTrack.trackDisplayNode;
        this.trackNode = this.displayNode.in.track;
        this.gui = v.gui ?? "contents";

//        console.log("CNodeTrackGUI constructor called for ", this.metaTrack.menuText);


        this.showTrackInLook = false;
        this.guiShowInLook = guiMenus.showhide.add(this, "showTrackInLook").listen().onChange(()=>{
            par.renderOne=true;
            // this.metaTrack has a trackDisplayNode and a trackDisplayDataNode and a displayTargetSphere
            // need to set their group mask bit corresponding to VIEW.LOOK

            this.metaTrack.trackDisplayNode.setLayerBit(LAYERS.LOOK, this.showTrackInLook);
            this.metaTrack.trackDisplayDataNode.setLayerBit(LAYERS.LOOK, this.showTrackInLook);

            // the sphere is the object that is always displayed in the look window
            //this.metaTrack.displayTargetSphere.setLayerBit(LAYERS.LOOK, this.showTrackInLook);


        }).name(this.metaTrack.menuText + " track in look view")


    }

    dispose() {
      //  this.guiFolder.destroy();
        super.dispose()
    }




}
