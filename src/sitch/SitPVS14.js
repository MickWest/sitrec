import {
    Color,
} from "three";
import {gui, guiTweaks, NodeMan, Sit} from "../Globals";

import {par} from "../par";
import {CNodeViewUI} from "../nodes/CNodeViewUI";
import {AddTimeDisplayToUI} from "../UIHelpers";

import {CNodeDisplayTrack} from "../nodes/CNodeDisplayTrack";
import {CNodeConstant} from "../nodes/CNode";
import * as LAYER from "../LayerMasks";
import {ViewMan} from "../CViewManager";

export const SitPVS14 = {
    name: "pvs14",
    menuName: "PVS-14 Pilot Video",
    isTextable: false,

    starScale: 0.65,

    nearClip: 1,
    farClipLook: 6800*1000,
    nearClipLook: 1,
    //videoSpeed: 4,
    simSpeed: 5,

    files: {
        starLink: "pvs14/StarlinkTLE18APr23.txt",
        cameraFile: "pvs14/N77552-track-press_alt_uncorrected.kml",
    },

    units: "Imperial",
    lookCamera: {
        fov: 10,
    },
    cameraTrack: {},



    fps: 29.97,
    frames: Math.floor((7*60+14)*29.97),
    startTime: "2023-04-15T08:06:16.500Z",


  //  terrain: {lat: 36.3237, lon: -101.4765, zoom: 8, nTiles: 8},
    lat: 36.3237, lon: -101.476,

    fromLat: 36.5437,
    fromLon: -100.352,

    fromAltFeet: 11000,
    fromAltMin: 5000,
    fromAltMax: 15000,

    targetSpeedMax: 100,

    marks: [
        //       {LL: {lat:50.197944,lon:-5.428180}, width: 1, color:0xffff00},
    ],

    mainCamera: {
        far:    50000000,
        startCameraPosition: [-829629.50, 1259822.75, 2121960.81],
        startCameraTarget: [-829308.42, 1259357.65, 2121135.83],
    },

    targetSize: 500,

    videoFile: "../sitrec-videos/private/pvs14-2023-pilot-video.mp4",

    mainView:{left:0.0, top:0, width:0.5,height:1,background:'#000000'},
    lookView: {left: 0.5, top: 0.5, width: -1.7927, height: 0.5,background:'#000000'},
    videoView: {left: 0.5, top: 0, width: -1.7927, height: 0.5},
    DisplayCameraFrustum: {radius:100000},

    ptz: {az: 24.8, el: 3.7, fov: 27.7, showGUI: true},

    dragDropHandler: {},

    nightSky: true,  // needs to be at the end of the list, as it needs the camera
    useGlobe: true,

    setup2: function () {

        NodeMan.get("lookCamera").addController("TrackPosition",{
             sourceTrack: "cameraTrack",
        })

        // animated segment of camera track
        new CNodeDisplayTrack({
            id:"KMLDisplay",
            track: "cameraTrack",
            color: [1, 1, 0],
            width: 2,
            layers: LAYER.MASK_HELPERS,
        })

        new CNodeDisplayTrack({
            id:"KMLDisplayMainData",
            track: "cameraTrackData",
            color: [0.7, 0.7, 0],
            dropColor: [0.6, 0.6, 0],
            width: 1,
            ignoreAB:true,
            layers: LAYER.MASK_HELPERS,

        })


        var labelVideo = new CNodeViewUI({id: "labelVideo", overlayView: "lookView"});
        AddTimeDisplayToUI(labelVideo, 50,96, 3.5, "#f0f000")


        // var labelMainViewPVS = new CNodeViewUI({id: "labelMainViewPVS", overlayView: ViewMan.list.mainView.data});
        // labelMainViewPVS.addText("videoLabelp2", ";&' or [&] ' advance start time", 12, 4, 1.5, "#f0f00080")
        // labelMainViewPVS.setVisible(true)

    },



}
