import {CNodeImageAnalysis} from "../nodes/CNodeImageAnalysis";
import {gui} from "../Globals";
import {CNodeGUIValue} from "../nodes/CNodeGUIValue";

export const SitRGB = {
    name: "rgb",
    menuName: "RGB Profile",

    azSlider:false,
    jetStuff:false,


    animated:false,

    fps: 29.97,
    frames: 1031,
    aFrame: 0,
    bFrame: 1030,

    files: {
        rbgTestImage: "rgb/bees-zoomed.jpg"
    },

    setup: function() {
        const ia = new CNodeImageAnalysis({
            id:"ImageEditorView",
            filename:'rbgTestImage',
            smooth:new CNodeGUIValue({id:"smooth", value:20, start:1, end:200, step:1, desc: "Filter"},gui),
            draggable:true,resizable:true,
            left:0.0, top:0, width:0.6,height:1,
        })
        ia.useFilter = false;
        ia.square=false;
        ia.red = true;
        ia.green = true;
        ia.blue = true;
        ia.grey = false;
        ia.normalize = false;

        ia.relative = true;
        gui.close()
    }

}
