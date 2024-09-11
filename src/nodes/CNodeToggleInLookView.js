import {guiMenus, NodeMan} from "../Globals";
import {par} from "../par";
import * as LAYERS from "../LayerMasks";
import {CNode} from "./CNode";

export class CNodeToggleInLookView extends CNode {
    constructor(v) {
        super(v);
        this.displayNode = NodeMan.get(v.object);

        const name = v.name ?? v.object;

        this.showTrackInLook = false;
        this.guiShowInLook = guiMenus.showhide.add(this, "showTrackInLook").listen().onChange(() => {
            par.renderOne = true;
            this.displayNode.setLayerBit(LAYERS.LOOK, this.showTrackInLook);
        }).name(name+" in look view")
    }
}



