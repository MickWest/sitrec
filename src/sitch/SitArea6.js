import {Color} from "../../three.js/build/three.module";
import {gui, Sit,  NodeMan} from "../Globals";
import {CNodeView3D} from "../nodes/CNodeView3D";
import {CNodeGUIValue} from "../nodes/CNodeGUIValue";

import {SetupGUIFrames} from "../JetGUI";
import {initKeyboard, isKeyHeld} from "../KeyBoardHandler";
import {addDefaultLights} from "../lighting";
import {par} from "../par";
import {CNodeViewUI} from "../nodes/CNodeViewUI";
import {AddTimeDisplayToUI} from "../UIHelpers";
import {GlobalDateTimeNode} from "../nodes/CNodeDateTime";
import {CNodeVideoWebCodecView} from "../nodes/CNodeVideoWebCodecView";



export const SitArea6 = {
    name: "area6",
    menuName: "Area 6",


    azSlider: false,
    jetStuff: false,
    animated: true,
    nightSky: true,
    useGlobe: true,
    displayFrustum: true,



    files: {
        starLink: "area6/starlink-area6.txt",
    },
    videoFile: "../sitrec-videos/private/Area6-1x-speed-08-05-2023 0644UTC.mp4",

    bigUnits: "Miles",

    fps: 29.97,
    frames: (10*60+50)*29.97,
    startTime: "2023-08-05T07:39:13.000Z",
    lookCamera: {
        fov: 10,
        far: 80000000,
    },

    starScale: 0.3,


    terrain: {lat: 36.208582, lon: -115.984598, zoom: 12, nTiles: 8},
//  terrain: {lat: 0, lon: 0, zoom: 12, nTiles: 8},



    fromLat: 36.208582,
    fromLon: -115.984598,

    fromAltFeet: 2700,
    fromAltFeetMin: 400,
    fromAltFeetMax: 5000,

    // with a ptz setup, add showGUI:true to allow changing it
    // then can set it to false once the settings are locked in
    ptz: {az: -6.2, el: 9.8, fov: 11.8, showGUI: true},


    targetSpeedMax: 100,

    marks: [
        //       {LL: {lat:50.197944,lon:-5.428180}, width: 1, color:0xffff00},
    ],
    mainCamera: {
        far:    80000000,
        startCameraPosition: [41177.15, 35874.31, 182331.95],
        startCameraTarget: [40980.64, 35831.97, 181352.36],
    },

    targetSize: 500,

    mainView:{left:0.0, top:0, width:.50,height:1,background:'#132d44',},


//    syncVideoZoom: true,

    // overrides for video viewport
    videoView: {left: 0.5, top: 0, height: 0.5, width: -16 / 9 },

    setup2: function () {

        SetupGUIFrames()
        initKeyboard()

   //     addKMLTracks(["KMLTarget1", "KMLTarget2", "KMLTarget3"])

        // const ia = new CNodeImage({
        //     id: "ImageEditorView",
        //     filename: 'threePlanes',
        //     smooth: new CNodeGUIValue({id: "smooth", value: 20, start: 1, end: 200, step: 1, desc: "Filter"}, gui),
        //     draggable: true, resizable: true,
        //     left: 0.5, top: 0, width: -1280 / 714, height: 0.5,
        // })


        // const view = new CNodeView3D({
        //     id: "mainView",
        //     left: 0.0, top: 0, width: 0.5, height: 1,
        //     draggable: false, resizable: false,
        //     fov: 50,
        //     doubleClickFullScreen: true,
        //     background: new Color('#132d44'),
        //     camera: "mainCamera",
        // })

        const view = NodeMan.get("mainView");
        view.addOrbitControls(this.renderer);

        const viewLook = new CNodeView3D({
            id: "lookView",
            draggable: true, resizable: true,
            left: 0.5, top: 0.5, width: -1280 / 714, height: 0.5,
            fov: 50,
            camera: this.lookCamera,
            doubleClickFullScreen: true,
            background: new Color('#132d44'),
        })
        //     viewLook.camera = this.lookCamera;
        viewLook.addOrbitControls(this.renderer);

        var labelVideo = new CNodeViewUI({id: "labelVideo", overlayView: viewLook});
        AddTimeDisplayToUI(labelVideo, 50,96, 2.5, "#f0f000")

        gui.add(par, 'mainFOV', 0.35, 150, 0.01).onChange(value => {
            const mainCam = NodeMan.get("mainCamera").camera;
            mainCam.fov = value
            mainCam.updateProjectionMatrix()
        }).listen().name("Main FOV")

        addDefaultLights(Sit.brightness)

        if (Sit.videoFile !== undefined) {
            new CNodeVideoWebCodecView(Object.assign({
                    id: "video",
                    inputs: {
                        zoom: new CNodeGUIValue({
                            id: "videoZoom",
                            value: 100, start: 100, end: 2000, step: 1,
                            desc: "Video Zoom %"
                        }, gui)
                    },
                    visible: true,
                    left: 0.5, top: 0, width: -9 / 16, height: 1,
                    draggable: true, resizable: true,
                    frames: Sit.frames,
                    videoSpeed: Sit.videoSpeed,
                    file: Sit.videoFile,

                },Sit.videoView)
            )
        }

    },

    update: function(frame) {
      if (isKeyHeld(';') ) {

            var time = GlobalDateTimeNode.getStartTimeValue()
            time -= 1000
            GlobalDateTimeNode.populateFromMS(time)
            GlobalDateTimeNode.updateDateTime()
      }
        if (isKeyHeld("'") ) {

            var time = GlobalDateTimeNode.getStartTimeValue()
            time += 1000
            GlobalDateTimeNode.populateFromMS(time)
            GlobalDateTimeNode.updateDateTime()
        }
    },


}
