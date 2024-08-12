import {CNodeGUIColor} from "./CNodeGUIColor";
import {guiMenus, NodeMan} from "../Globals";
import {CNode} from "./CNode";

// Common GUI Elements for a CMetaTrack
export class CNodeTrackGUI extends CNode {
    constructor(v) {
        super(v);



        this.metaTrack = v.metaTrack;
        this.displayNode = this.metaTrack.trackDisplayNode;
        this.trackNode = this.displayNode.in.track;
        this.gui = v.gui ?? "color";

        console.log("CNodeTrackGUI constructor called for ", this.metaTrack.menuText);


        this.guiFolder = guiMenus[this.gui].addFolder(this.metaTrack.menuText).close();

        this.guiColor = this.addDisplayTrackColor(this.metaTrack.trackDisplayNode, this.metaTrack.trackDisplayDataNode)

    }

    dispose() {
        this.guiFolder.destroy();
        super.dispose()
    }


    addDisplayTrackColor(displayNode, displayDataNode) {
        return new CNodeGUIColor({
            id: displayNode.id + "_color",
            desc: "Color",
            value: displayNode.in.color.v0,
            gui: this.guiFolder,
            onChange: (v) => {
                displayNode.inputs.color.value = v;
                displayNode.recalculate();
                displayDataNode.inputs.color.value = v;
                displayDataNode.recalculate();

            },
        })
    }


}
