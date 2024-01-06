import {Color} from "../../three.js/build/three.module";
import {scaleF2M} from "../utils";
import {CNodeVideoWebCodecView} from "../nodes/CNodeVideoWebCodec";
import {Sit} from "../Globals";
import {CNodeView3D} from "../nodes/CNodeView3D";
import * as LAYER from "../LayerMasks";
import * as THREE from "../../three.js/build/three.module";
import {CNodeConstant} from "../nodes/CNode";
import {CNodeGUIValue} from "../nodes/CNodeGUIValue";
import {CNodeDisplayTrackToTrack} from "../nodes/CNodeDisplayTrackToTrack";
import {CNodeDisplayTrack} from "../nodes/CNodeDisplayTrack";
import {CNodeDisplayTargetSphere} from "../nodes/CNodeDisplayTargetSphere";
import {CNodeLOSTraverse} from "../nodes/CNodeLOSTraverse";
import {CNodeLOSConstantCamera} from "../nodes/CNodeLOSConstantCamera";
import {CNodeScale} from "../nodes/CNodeScale";
import {CNodeLOSMotionTrack} from "../nodes/CNodeLOSMotionTrack";
import {CNodeWind} from "../nodes/CNodeWind";
import {CNodeHeading} from "../nodes/CNodeHeading";
import {AddSpeedGraph} from "../JetGraphs";
import {gui, guiTweaks, } from "../Globals";
import {SetupGUIFrames} from "../JetGUI";
import {initKeyboard} from "../KeyBoardHandler";
import {CNodeDisplayLOS} from "../nodes/CNodeDisplayLOS";
import {addDefaultLights} from "../lighting";

export const SitHayle = {
    name: "hayle",
    menuName: "Hayle Beach / St. Ives",

    azSlider:false,
    jetStuff:false,
    animated:true,

    files: {
        hayleCSV: "hayle/hayle-track.csv",
    },
    videoFile: "../sitrec-videos/private/Hayle Beach UFO.mp4",

    bigUnits:"Miles",

    fps: 29.97,
    frames: 2780,

    lookFOV: 10,
    // Pt Dume view
    terrain: {lat:  50.197944, lon: -5.428180, zoom:15, nTiles:8},

    fromLat: 50.197944, // Hayle beach
    fromLon:-5.428180,

    fromAltFeet: 64,
    fromAltFeetMin: 0,
    fromAltFeetMax: 100,

    toLat: 50.222085,
    toLon: -5.468553,
    toAlt: 0,


    targetSpeedMax: 100,

    // with a ptz setup, add showGUI:true to allow changing it
    // then can set it to false once the settings are locked in
    ptz: {az: -37.4, el: -4.3, fov: 45, showGUI:false},

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

    startCameraPosition: [278.4748110392168,64.40911042728831,-205.77524399028982],
    startCameraTarget: [374.9433739111792,-41.17793070506451,-1195.4949988311907],

    // A-10 Bird
    //terrain: {  lat:  31.556097, lon: -109.275521, zoom: 15, nTiles:6 },

    // SWR
    // terrain: {lat: 40.2572028, lon: -109.893759, zoom: 15, nTiles: 3},

    targetSize:3,

setup2: function() {

    SetupGUIFrames()
    initKeyboard()


    new CNodeLOSMotionTrack({
    id:"motionTrackLOS",
        cameraTrack:new CNodeLOSConstantCamera({id:"cameraTrack", camera:"lookCamera"}),
        csv:"hayleCSV",
        width:1280,
        height:714,
        fov:45,
        frameCol:0,
        xCol:1,
        yCol:2,
        frames:2780,  //DUPLICATED???
        smooth:30,
    })

    new CNodeVideoWebCodecView({
            id: "video",
            inputs: {
                zoom: new CNodeGUIValue({
                    value: 100, start: 100, end: 1000, step: 1,
                    desc: "Video Zoom x"
                }, guiTweaks)
            },
            visible: true,
            left: 0.5, top: 0, width: -1280 / 714, height: 0.5,
            draggable: true, resizable: true, shiftDrag: false,
            frames: Sit.frames,
            file: Sit.videoFile,
        }
    )



    const view = new CNodeView3D({
        id: "mainView",
        left: 0.0, top: 0, width: 0.5, height: 1,
        draggable:false,resizable:false,
        fov: 50,
        doubleClickFullScreen: true,
        background: new Color("#989fa7"),
        camera: this.mainCamera,
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


    var JetLOSDisplayNode = new CNodeDisplayLOS({
        LOS: "motionTrackLOS",
        
        clipSeaLevel: true,
        layers: LAYER.MASK_HELPERS,

        width: 3,
    })

//    var nodeStartDistance =  new CNodeScale("startDistance", Sit.big2M,new CNodeGUIValue({value: 0.001, start:0, end:1, step: 0.0001,desc: "Tgt Start Dist "+Sit.bigUnits}, gui))
//    var nodeStartDistance =  new CNodeGUIValue({id:"startDistance", value: 100, start:0, end:1000, step: 0.0001,desc: "Tgt Start Dist "+Sit.bigUnits}, gui)

    var nodeStartDistance = new CNodeScale("startDistance", scaleF2M, new CNodeGUIValue(
        {id: "startDistanceFeet", value: 300, start: 0, end: 20000, step: 1, desc: "Tgt Start Dist (Ft)"}, gui))


    new CNodeLOSTraverse({
        id: "LOSTraverseConstantDistance",
        inputs: {
            LOS: "motionTrackLOS",
            startDist: nodeStartDistance,
            //radius: "radiusMiles",
        },
    })

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

    AddSpeedGraph("LOSTraverseConstantDistance", "Target Speed", 0, Sit.targetSpeedMax, 0, 0, 0.5, 0.25)


    new CNodeDisplayTargetSphere({
        inputs: {
            track: "LOSTraverseConstantDistance",
            size: new CNodeScale("sizeScaled", scaleF2M,
                new CNodeGUIValue({value: Sit.targetSize, start: 1, end: 50, step: 0.1, desc: "Target size ft"}, gui)
            )
        },
        
        layers: LAYER.MASK_LOOK,
    })


    new CNodeDisplayTargetSphere({
        track: "LOSTraverseConstantDistance",
        size: 10,
        
        layers: LAYER.MASK_HELPERS,
    })

    new CNodeDisplayTrack({
        track: "LOSTraverseConstantDistance",
        color: new CNodeConstant({value: new THREE.Color(0, 1, 1)}),
        width: 1,
        
        layers: LAYER.MASK_HELPERS,
    })


    // the red line that joins the camera track to the target - i.e. the current LOS.
    new CNodeDisplayTrackToTrack({
        id: "DisplayLOS",
        cameraTrack: "motionTrackLOS",
        targetTrack: "LOSTraverseConstantDistance",
        color: new CNodeConstant({value: new THREE.Color(1, 0, 0)}),
        width: 2,
        
    })

    addDefaultLights(Sit.brightness)

}

}
