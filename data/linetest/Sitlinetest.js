export const SitLineTest = {
    name: "linetest",
    menuName: "Line Detector",
    isTextable: true,
    isTool: true,


    files: {
        LineTest: "linetest/ImageEditorDefault2.jpg"
    },

    smooth: {kind: "GUIValue", value:20, start:1, end:200, step:1, desc: "Filter"},
    ImageEditorView: {
        kind: "ImageAnalysis",
        filename:'LineTest',
        smooth:"smooth",
        draggable:true,resizable:true,
        left:0.0, top:0, width:0.6,height:1,
    },
}
