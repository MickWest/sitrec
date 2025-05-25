import {MetaBezierCurveEditor, MetaBezierCurve} from "../MetaCurveEdit";
import {Sit} from "../Globals";
import {CNode} from "./CNode";
import {CNodeViewCanvas2D} from "./CNodeViewCanvas";
import {CNodeGraphLine} from "./CNodeGraphLine";

import {isConsole} from "../configUtils";

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

        // We need to call recalculate when its canvas has been resized
        // to force a redraw
        // since graphs do not redraw unless changed
        // (i.e. the "dirty" flag is set)
        this.recalculateOnCanvasChange = true;

    }

    modSerialize() {
            return super.modSerialize();
    }

    modDeserialize(v) {
        console.log("CNodeCurveEditorView.modDeserialize", v)
        super.modDeserialize(v);

        // legacy views, we have to force it visible
        this.visible = !v.visible
        this.show(v.visible)

        // wait a frame and then set it dirty to force a redraw
        // (patch for legacy editor node which is really a container for the MetaBezierCurveEditor)
        // just setting it dirty immediately doesn't work, as the update order is incorrect

        requestAnimationFrame( () => {
            this.editor.dirty = true;}
        )
    }

    // renderCanvas is called every frame from the viewport rendering loop
    // in index.js
    // the super call will handle the canvas resizing
    // the editor.update() will redraw the graph if it's dirty
    // It gets set dirty if:
    // - the points are changed in the editor
    // - the data in a compare node is changed (i.e. the compare node is recalculated)
    // compare nodes are inputs to this node
    // so a change to a compare node will trigger a recalculation of this node
    // A compare node itself is a CNodeGraphSeries
    // which has a "source" input, generally a munge node (or could be a math node)
    // For example, see AddSpeedGraph (in JetGraphs.js), which sets up three munge nodes
    // for ground speed, air speed, and vertical speed
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

        // flag a single frame redraw
//        this.editor.dirty = true;
//        console.log("+++ Set Editor DIRTY in CNodeCurveEditorView.recalculate")


        if (this.visible) {
            // again a bit messed up with the drawing order
            // so weve got this nasty hack to force a redraw
            // on the next frame
            requestAnimationFrame(() => {
                    this.editor.dirty = true;
                }
            )
        }

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

        if(!isConsole) {
            this.editorView = new CNodeCurveEditorView(v)
            this.editor = this.editorView.editor
            this.editor.onChange = x => this.recalculateCascade();
        //    this.recalculate() // to hook up any compare nodes

            if (!v.noFrameLine) {
                // add a line overlay - uses an overlay so we don't have to redraw the graph
                new CNodeGraphLine({
                    id: this.id + "_GraphLine",
                    overlayView: this.editorView,
                    color: "#800000"
                })
            }
            this.curve = this.editor.curve
        } else {
            this.curve = new MetaBezierCurve(v.editorConfig)
            this.curve.recalculate()
            this.curve.update()
        }
    }

    show(visible) {
        super.show(visible);
        if (this.editorView) {
            this.editorView.show(visible);
        }
    }

    recalculate() {
        super.recalculate();
        // no real recalculation is needed here
        // we don't redraw as that is handled by the editorView object
    }

    modSerialize() {
        return {
            ...super.modSerialize(),
            editorConfig: this.curve.getProfile(),
        }
    }

    modDeserialize(v) {
        super.modDeserialize(v);
        if(!isConsole) {
            this.editor.setPointsFromFlatArray(v.editorConfig)
            this.editorView.recalculate()
        } else {
            this.curve.setPointsFromFlatArray(v.editorConfig)
            this.curve.recalculate()
            this.curve.update()
        }
    }

    getValueFrame(f) {
        return this.curve.getY(f)
    }
}

