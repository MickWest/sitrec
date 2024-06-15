import {MetaBezierCurveEditor} from "../MetaCurveEdit";
import {Sit} from "../Globals";
import {CNode} from "./CNode";
import {CNodeViewCanvas2D} from "./CNodeViewCanvas";
import {CNodeGraphLine} from "./CNodeGraphLine";


// The CurveEditorView can have inputs from the curve editor (i.e. the compare nodes)
// it's a view, so should not be used as in input
// that's what CNodeCurveEditor is used for
// althought hey are both essentially interfaces to the same .editor

export class CNodeCurveEditorView extends CNodeViewCanvas2D {
    constructor(v) {
        v.menuName = v.menuName ?? v.editorConfig.yLabel
        super(v);
        v.editorConfig.canvas = this.canvas
        this.addInputs(v.displayInputs)
        this.editor = new MetaBezierCurveEditor(v.editorConfig)
        this.recalculate()
    }

    renderCanvas(frame) {
        super.renderCanvas(frame)
        this.editor.update();
    }


    recalculate() {
        this.editor.compareNode = []

        // add the legacy nodes
        if (this.in.compare && this.in.compare.frames>0)  this.editor.compareNode.push (this.in.compare);
        if (this.in.compare1 && this.in.compare1.frames>0) this.editor.compareNode.push (this.in.compare1);
        if (this.in.compare2 && this.in.compare2.frames>0) this.editor.compareNode.push (this.in.compare2);
        if (this.in.compare3 && this.in.compare3.frames>0) this.editor.compareNode.push (this.in.compare3);
        if (this.in.compare4 && this.in.compare4.frames>0) this.editor.compareNode.push (this.in.compare4);
        if (this.in.compare5 && this.in.compare5.frames>0) this.editor.compareNode.push (this.in.compare5);
        if (this.in.compare6 && this.in.compare6.frames>0) this.editor.compareNode.push (this.in.compare6);
        if (this.in.compare7 && this.in.compare7.frames>0) this.editor.compareNode.push (this.in.compare7);
        if (this.in.compare8 && this.in.compare8.frames>0) this.editor.compareNode.push (this.in.compare8);
        if (this.in.compare9 && this.in.compare9.frames>0) this.editor.compareNode.push (this.in.compare9);

        // iterate over all the inputs, find any that are of type CNodeGraphSeries
        // if their name is not "compare" and not "compareX", where X is a digit, then push it
        for (let input in this.inputs) {
            if (this.inputs[input].constructor.name === "CNodeGraphSeries") {
                if (input !== "compare" && !input.match(/compare\d+/)) {
                    this.editor.compareNode.push(this.inputs[input])
                }
            }
        }

        this.editor.dirty = true;
//        console.log("+++ Set Editor DIRTY in CNodeCurveEditorView.recalculate")

    }

}

// curve editor as a node allows real-time editing of a bezier curve
// outputs can cause the above display node to be redrawn
export class CNodeCurveEditor extends CNode {
    constructor(v) {
        super(v);

        v.id = v.id + "View"; // they can't share the same id, so add "view" to it

        

        // bit of a patch here, FLIR1, etc use graphs  set to the number of frames in the sitch
        // but that means we can't textualize it, so just pass a string and check here
        if (v.editorConfig.maxX === "Sit.frames")
            v.editorConfig.maxX = Sit.frames;

        this.editorView = new CNodeCurveEditorView(v)
        this.editor = this.editorView.editor
        this.editor.onChange = x => this.recalculateCascade();
        this.recalculate() // to hook up any compare nodes

        if (!v.noFrameLine) {
            // add a line overlay - uses an overlay so we don't have to redraw the graph
            new CNodeGraphLine({
                id: this.id + "_GraphLine",
                overlayView: this.editorView,
                color: "#800000"
            })
        }

    }

    modSerialize() {
        return {
            ...super.modSerialize(),
            editorConfig: this.editor.getProfile(),
        }
    }

    modDeserialize(v) {
        super.modDeserialize(v);
        this.editor.setPointsFromFlatArray(v.editorConfig)
        this.editorView.recalculate()
    }


    getValueFrame(f) {
        return this.editor.getY(f)
    }

}

