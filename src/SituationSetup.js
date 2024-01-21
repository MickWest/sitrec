import {gui, mainCamera, NodeMan, setMainCamera, Sit} from "./Globals";
import {CNodeConstant} from "./nodes/CNode";
import {wgs84} from "./LLA-ECEF-ENU";
import {CNodeGUIValue} from "./nodes/CNodeGUIValue";
import {CNodeTerrain} from "./nodes/CNodeTerrain";
import {PerspectiveCamera} from "../three.js/build/three.module";
import {par} from "./par";
import {MV3} from "./threeExt";
import {CNodeCamera} from "./nodes/CNodeCamera";
import * as LAYER from "./LayerMasks";

export function SituationSetup() {
    console.log("++++++ SituationSetup")

    new CNodeConstant({id:"radiusMiles", value: wgs84.radiusMiles});


    for (let key in Sit) {
        console.log(key)

        const data = Sit[key];

        switch (key) {


            case "flattening":
                new CNodeGUIValue({id: "flattening", value: 0, start: 0, end: 1, step: 0.005, desc: "Flattening"}, gui)
                break

            case "terrain":
                //     terrain: {lat: 37.001324, lon: -102.717053, zoom: 9, nTiles: 8},
                new CNodeTerrain({
                    id: "TerrainModel",
                    radiusMiles: "radiusMiles", // constant
                    lat: data.lat,
                    lon: data.lon,
                    zoom: data.zoom,
                    nTiles: data.nTiles,
                    flattening: Sit.flattening?"flattening":undefined,
                    tileSegments: Sit.terrain.tileSegments ?? 100,
                })
                break;

            case "mainCamera":
                // mainCamera: {
                //     fov:  32,
                //         startCameraPosition: [94142.74587419331,13402.067238703776,-27360.90061964375],
                //         startCameraTarget: [93181.8523901133,13269.122270956876,-27117.982222227354],
                // },
                const cameraNode = new CNodeCamera({
                    id:"mainCamera",
                    fov: data.fov     ?? 30,
                    aspect: window.innerWidth / window.innerHeight,
                    near: data.near   ?? 1,
                    far:  data.far    ?? 5000000,
                    layers: data.mask ?? LAYER.MASK_MAINRENDER,

                    // one of these will be undefined. CNodeCamera uses the other
                    startPos: data.startCameraPosition,
                    lookAt: data.startCameraTarget,
                    startPosLLA: data.startCameraPositionLLA,
                    lookAtLLA: data.startCameraTargetLLA,

                })

                setMainCamera(cameraNode.camera) // eventually might want to remove this and be a node

                gui.add(mainCamera, 'fov', 0.35, 80, 0.01).onChange(value => {
                    //mainCamera.fov = value
                    mainCamera.updateProjectionMatrix()
                }).listen().name("Main FOV")
                break;

            case "lookCamera":
                new CNodeCamera({
                    id:"lookCamera",
                    fov: data.fov     ?? 10,
                    aspect: window.innerWidth / window.innerHeight,
                    near: data.near   ?? 1,
                    far:  data.far    ?? 5000000,
                    layers: data.mask ?? LAYER.MASK_LOOKRENDER,
 //                   layers: data.mask ?? LAYER.MASK_MAIN_HELPERS,
                })

                const lookCameraNode = NodeMan.get("lookCamera");
                if (data.addFOVController) {
                    gui.add(lookCameraNode.camera, 'fov', 0.35, 80, 0.01).onChange(value => {
                        lookCameraNode.camera.updateProjectionMatrix()
                    }).listen().name("Look Camera FOV")
                }

                break;
        }


    }
}