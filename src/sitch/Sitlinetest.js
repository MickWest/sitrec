import {CNodeImageAnalysis} from "../nodes/CNodeImageAnalysis";
import {CNodeGUIValue} from "../nodes/CNodeGUIValue";
import {gui} from "../Globals";

export const SitLineTest = {
    name: "linetest",
    menuName: "Line Detector",

    fps: 29.97,
    frames: 1000,
    aFrame: 0,
    bFrame: 999,

    files: {
        LineTest: "linetest/ImageEditorDefault2.jpg"
    },

    setup: function() {
        new CNodeImageAnalysis({
            id:"ImageEditorView",
            filename:'LineTest',
            smooth:new CNodeGUIValue({id:"smooth", value:20, start:1, end:200, step:1, desc: "Filter"},gui),
            draggable:true,resizable:true,
            left:0.0, top:0, width:0.6,height:1,
        })
    }

}
