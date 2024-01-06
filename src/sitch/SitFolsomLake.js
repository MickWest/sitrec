import {SitKML} from "./SitKML";
import {NodeMan} from "../Globals";
import {CNodeControllerAzElData} from "../nodes/CNodeController";
import {makeArrayNodeFromColumn} from "../nodes/CNodeArray";
import {abs, assert, floor} from "../utils"
import {SRT} from "../KMLUtils";
import {par} from "../par";
import {makeComboNode} from "../nodes/CNodeMunge";

//export const SitPorterville = Object.assign(Object.assign({},SitKML),{
export const SitFolsomLake = {
    ...SitKML,
    name: "folsomlake",
    menuName: "Folsom Lake Test",

    tilt: 0,

    targetSize: 1, // in feet
    displayFrustum: true,
    frustumRadius: 20,
    frustumColor: 0xff0000,
    frustumLineWeight: 1.5,

    planeCameraFOV: 42.15,

    frames: 1156,
    fps: 29.97,

    terrain: {lat: 38.722270, lon: -121.1694455, zoom: 15, nTiles: 12},

    startAltitude: 145, // if a track is relative (like Mini DJI SRT files), then need an initial altitude
    adjustAltitude: 5, // and if not, then we might want to bring it up above the ground
    files: {
        //cameraFile: 'folsomlake/MICK folsomake DJI_0031 - 01.srt',
        cameraFile:'folsomlake/Dec-22nd-2023-11-56AM-Flight-Airdata.csv',
    },
    startTime: "2023-12-22 20:00:18.000Z",  // start time of video, the cameraFile might start before this.

    videoFile: "../sitrec-videos/public/MICK folsomlake DJI_0031 - 01.mp4",
    skyColor: 'skyblue',

    startCameraPositionLLA:[38.719864,-121.172311,265.103926],
    startCameraTargetLLA:[38.725176,-121.163979,-90.574624],

    videoView: {left: 0.5, top: 0, width: -1280 / 714, height: 0.5},

    lookView: {left: 0.5, top: 0.5, width: -1280 / 714, height: 0.5},
    mainView:{left:0.0, top:0, width:0.5,height:1},

    cameraSphereSize: 2,
    targetSphereSize: 2,

    // instead of a target KML file, we define a simple spline
    // in this case just ONE point
    // targetSpline: {
    //     type: "linear",
    //      initialPointsLLA: [
    //         [0, 38.72275880556581, -121.16873415102312, 147.20740124210715]
    //      ]
    // },
    showAltitude: false,

    setup2: function() {

        // smooth some parts of cameraTrack
        // TODO: make this general and data driven, assuming the data exits
        assert (NodeMan.exists("cameraTrack"), "cameraTrack missing")


        const cameraTrack = NodeMan.get("cameraTrack");
        const array = cameraTrack.array
        assert (array !== undefined, "cameraTrack missing array object")


        // makeArrayNodeFromColumn("headingCol",data, SRT.heading)
        // makeArrayNodeFromColumn("pitchCol",data, SRT.pitch)
        makeArrayNodeFromColumn("headingCol", array, "heading",30, true)
        makeArrayNodeFromColumn("pitchCol", array, "gPitch",30, true)
         makeArrayNodeFromColumn("pitchCol1", array, "gPitch",30, true)
         makeArrayNodeFromColumn("pitchCol2", array, "pitch",30, true)

       // makeComboNode("pitchCol","pitchCol1","pitchCol2",(a,b) => {return a+b})

        // NodeMan.get("lookCamera").addControllerNode(
        //     new CNodeControllerAzElData({
        //         sourceTrack: "cameraTrack",
        //     })
        // )

        NodeMan.get("lookCamera").addController(
            "AbsolutePitchHeading",
            {pitch: "pitchCol", heading: "headingCol"}
        )

        const labelVideo = NodeMan.get("labelVideo")
        // custom drone specific UI
        labelVideo.addText("alt", "---", 0, 5, 5, '#FFFFFF','left').listen(par, "cameraAlt", function (value) {
            this.text = "Alt " + (floor(0.499999 + abs(value))) + "m";
        })

        labelVideo.addLine("---").listen(par, "az", function (value) {
            this.text = "Az " + value.toFixed(2) + "°";
        })


        labelVideo.addLine("---").update(function (value) {
            this.text = "Pitch " + NodeMan.get("pitchCol2").v(par.frame).toFixed(2) + "°";
        })

        labelVideo.addLine("---").update(function (value) {
            this.text = "gPitch " + NodeMan.get("pitchCol1").v(par.frame).toFixed(2) + "°";
        })

  //      NodeMan.reinterpret("cameraTrack", "SmoothedPositionTrack", {smooth:100}, "source")

    }
}