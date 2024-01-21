import {CNodeCloudData} from "./nodes/CNodeCloudData";
import {CNodeGUIValue} from "./nodes/CNodeGUIValue";
import {gui} from "./Globals";
import {CNodeDisplayClouds} from "./nodes/CNodeDisplayClouds";
import {CNodeConstant} from "./nodes/CNode";
import * as LAYER from "./LayerMasks";
import {CNodeLOSHorizonTrack} from "./nodes/CNodeLOSHorizonTrack";
import {CNodeDisplayTrack} from "./nodes/CNodeDisplayTrack";
import {Color, MeshStandardMaterial, TextureLoader} from "../three.js/build/three.module";

// Wrapper for the cloud node setup - used by Gimbal
export function SetupCloudNodes() {

    console.log("+++ cloudData Node")
    new CNodeCloudData({
        id: "cloudData",
        inputs: {
            altitude: "cloudAltitude",
      //      near: new CNodeGUIValue({value: 20, start: 0, end: 400, step: 0.01, desc: "Cloud Nearest"}, gui),
      //      far: new CNodeGUIValue({value: 250, start: 0, end: 400, step: 0.01, desc: "Cloud Farthest"}, gui),

        }
    })

    const cloudTexture = new TextureLoader().load('data/images/cloud-sprite-flatter.png?v=2');
    const cloudMaterial = new MeshStandardMaterial({
        map: cloudTexture,
        transparent: true,
    });

    console.log("+++ CloudDisplay Node")
    new CNodeDisplayClouds({
        id: "cloudDisplay",
        inputs: {
            cloudData: "cloudData",
            radius: "radiusMiles",
            material: new CNodeConstant({value: cloudMaterial}),
            wind: "cloudWind",
            heading: "initialHeading",
        },

        layers: LAYER.MASK_WORLD,
    })

    console.log("+++ LOSHorizon Node")
    new CNodeLOSHorizonTrack({
        id: "LOSHorizonTrack",
        inputs: {
            LOS: "JetLOS",
            cloudAltitude: "cloudAltitude",
            radius: "radiusMiles",
        }
    })

    console.log("+++ LOSHorizonDisplay Node")
    new CNodeDisplayTrack({
        id: "LOSHorizonDisplay",
        track: "LOSHorizonTrack",
        color: new CNodeConstant({value: new Color(0, 0, 1)}),

        width: 3,
    })
}