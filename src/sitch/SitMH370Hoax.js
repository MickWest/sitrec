import {Color} from "../../three.js/build/three.module";
import {f2m} from "../utils";
import {Sit} from "../Globals";
import {CNodeView3D} from "../nodes/CNodeView3D";

import {CNodeWind} from "../nodes/CNodeWind";
import {CNodeHeading} from "../nodes/CNodeHeading";
import {gui, guiTweaks, } from "../Globals";
import {SetupGUIFrames} from "../JetGUI";
import {initKeyboard} from "../KeyBoardHandler";
import {addDefaultLights} from "../lighting";
import {LLAToEUS} from "../LLA-ECEF-ENU";
import {CNodeDisplayTargetModel} from "../nodes/CNodeDisplayTargetModel";
import {CNodeMunge} from "../nodes/CNodeMunge";

export const SitMH370Hoax = {
    name: "mh370hoax",
    menuName: "MH370 Hoax",
    hidden: true,
    azSlider:false,
    jetStuff:false,
    animated:true,
    useGlobe:true,

    files: {

        B777: "./models/777-200ER-Malaysia.glb",

     //   hayleCSV: "./hayle-track.csv",
    },

    farClipLook: 80000000,

    bigUnits:"Miles",

    fps: 29.97,
    frames: 2780,


    startTime: "2014-03-08T00:19:37.000Z",  // Partial handshake, final comms from MH370
  //  nightSky: true,

    lookCamera: {
        fov: 10,
    },
    // Pt Dume view
   // terrain: {lat:  50.197944, lon: -5.428180, zoom:15, nTiles:8},

    fromLat: 7.750084115970515, // Indian ocean spculative MH370
    fromLon:95.8422752416429,

    fromAltFeet: 707*5280,  // 707 miles is perigee (lowest point) of NROL-22's Molniya orbit
    fromAltFeetMin: 0,
    fromAltFeetMax: 2000*5280,

    lat:    7.750084115970515,
    lon:    95.8422752416429,

    toLat: 7.750084115970515,
    toLon: 95.8422752416429,
    toAlt: 20000,


    targetSpeedMax: 100,

    // with a ptz setup, add showGUI:true to allow changing it
    // then can set it to false once the settings are locked in
    ptz: {az: 0, el: -88, fov: 1, showGUI:true},

    /*
    motionTrackLOS: {
        id:"motionTrackLOS",
// TODO - This should not run at startup, as it's not registered yet
//  cameraTrack:new CNodeLOSConstantCamera({id:"cameraTrack", camera:"lookCamera"}),
        csv:"hayleCSV",
        width:1280,
        height:714,
        fov:50,
        frameCol:0,
        xCol:1,
        yCol:2,
        frames:2780,  //DUPLICATED???
        smooth:50,
    },
*/

    marks: [
        //       {LL: {lat:50.197944,lon:-5.428180}, width: 1, color:0xffff00},
    ],

    mainCamera: {
        far:    80000000,
        startCameraPosition: [278.4748110392168, 64.40911042728831, -205.77524399028982],
        startCameraTarget: [374.9433739111792, -41.17793070506451, -1195.4949988311907],
    },
    // A-10 Bird
    //terrain: {  lat:  31.556097, lon: -109.275521, zoom: 15, nTiles:6 },

    // SWR
    // terrain: {lat: 40.2572028, lon: -109.893759, zoom: 15, nTiles: 3},

    targetSize:3,

    setup2: function() {

        SetupGUIFrames()
        initKeyboard()



        new CNodeMunge({
            id:"targetTrack",
            frames:Sit.frames,
            munge: function(f) {
                var pos = LLAToEUS(Sit.toLat,Sit.toLon, Sit.toAlt)

                return {position: pos}

            }
        })


        new CNodeMunge({
            id:"cameraTrack",
            frames:Sit.frames,
            munge: function(f) {
                var pos = LLAToEUS(Sit.fromLat,Sit.fromLon, f2m(Sit.fromAltFeet))

                return {position: pos}

            }
        })

        new CNodeDisplayTargetModel({
            inputs: {
                track: "targetTrack",
            },
            TargetObjectFile:"B777",
        })

        const view = new CNodeView3D({
            id: "mainView",
            left: 0.0, top: 0, width: 0.5, height: 1,
            draggable:false,resizable:false,
            fov: 50,
            doubleClickFullScreen: true,
            background: new Color("#989fa7"),
            camera: "mainCamera",
        })
        view.addOrbitControls(this.renderer);

        const viewLook = new CNodeView3D({
            id: "lookView",
            draggable:false,resizable:false,
            left: 0.5, top: 0.5, width: -1280 / 714, height: 0.5,
            fov: 50,
            camera: this.lookCamera,
            doubleClickFullScreen: true,
            background: new Color("#989fa7"),
        })
        //     viewLook.camera = this.lookCamera;
        viewLook.addOrbitControls(this.renderer);


        // var JetLOSDisplayNode = new CNodeDisplayLOS({
        //     LOS: "motionTrackLOS",
        //
        //     clipSeaLevel: true,
        //     layers: LAYER.MASK_HELPERS,
        //
        //     width: 3,
        // })

//    var nodeStartDistance =  new CNodeScale("startDistance", Sit.big2M,new CNodeGUIValue({value: 0.001, start:0, end:1, step: 0.0001,desc: "Tgt Start Dist "+Sit.bigUnits}, gui))
//    var nodeStartDistance =  new CNodeGUIValue({id:"startDistance", value: 100, start:0, end:1000, step: 0.0001,desc: "Tgt Start Dist "+Sit.bigUnits}, gui)

        // var nodeStartDistance = new CNodeScale("startDistance", scaleF2M, new CNodeGUIValue(
        //     {id: "startDistanceFeet", value: 300, start: 0, end: 20000, step: 1, desc: "Tgt Start Dist (Ft)"}, gui))


        // new CNodeLOSTraverse({
        //     id: "LOSTraverseConstantDistance",
        //     inputs: {
        //         LOS: "motionTrackLOS",
        //         startDist: nodeStartDistance,
        //         //radius: "radiusMiles",
        //     },
        // })

        new CNodeWind({
            id: "targetWind",
            from: 270,
            knots: 0,
            name: "Target",
            arrowColor: "cyan"

        }, gui)

        // zero wind for traversing
        // NOTE, this is not used, and needs setting up so that there's
        // a zero velocity for the balloon, and this wind variable
        // is used to solve the path based on LOS.
        new CNodeWind({id: "localWind", from: 70, knots: 0, name: "Local", arrowColor: "cyan"}, gui)

        new CNodeHeading({
            id: "initialHeading",
            heading: 0,
            name: "Initial",
            arrowColor: "green"

        }, gui)

     //   AddSpeedGraph("LOSTraverseConstantDistance", "Target Speed", 0, Sit.targetSpeedMax, 0, 0, 0.5, 0.25)


        // new CNodeDisplayTargetSphere({
        //     inputs: {
        //         track: "LOSTraverseConstantDistance",
        //         size: new CNodeScale("sizeScaled", scaleF2M,
        //             new CNodeGUIValue({value: Sit.targetSize, start: 1, end: 50, step: 0.1, desc: "Target size ft"}, gui)
        //         )
        //     },
        //
        // })
        //
        //
        // new CNodeDisplayTargetSphere({
        //     track: "LOSTraverseConstantDistance",
        //     size: 10,
        //
        //     layers: LAYER.MASK_HELPERS,
        // })
        //
        // new CNodeDisplayTrack({
        //     track: "LOSTraverseConstantDistance",
        //     color: new CNodeConstant({value: new THREE.Color(0, 1, 1)}),
        //     width: 1,
        //
        //     layers: LAYER.MASK_HELPERS,
        // })
        //
        //
        // // the red line that joins the camera track to the target - i.e. the current LOS.
        // new CNodeDisplayTrackToTrack({
        //     id: "DisplayLOS",
        //     cameraTrack: "motionTrackLOS",
        //     targetTrack: "LOSTraverseConstantDistance",
        //     color: new CNodeConstant({value: new THREE.Color(1, 0, 0)}),
        //     width: 2,
        //
        // })

        addDefaultLights(Sit.brightness)

    }

}
