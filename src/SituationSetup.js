import {FileManager, gui, guiMenus, guiPhysics, NodeFactory, NodeMan, Sit, SitchMan} from "./Globals";
import {CNode, CNodeConstant} from "./nodes/CNode";
import {LLAToEUS, wgs84} from "./LLA-ECEF-ENU";
import {CNodeGUIValue, makeCNodeGUIValue} from "./nodes/CNodeGUIValue";
import {CNodeCamera} from "./nodes/CNodeCamera";
import * as LAYER from "./LayerMasks";
import {CNodeDisplayTrack} from "./nodes/CNodeDisplayTrack";
import {abs, ExpandKeyframes, f2m, floor, getArrayValueFromFrame, normalizeLayerType, radians, scaleF2M} from "./utils";
import {CNodeView3D} from "./nodes/CNodeView3D";
import {CNodeVideoWebCodecView} from "./nodes/CNodeVideoWebCodecView";
import {DragDropHandler} from "./DragDropHandler";
import {CNodeSplineEditor} from "./nodes/CNodeSplineEdit";
import {GlobalScene} from "./LocalFrame";
import {CNodeScale} from "./nodes/CNodeScale";
import {CNodeDisplayTargetModel} from "./nodes/CNodeDisplayTargetModel";
import {CNodeDisplayTargetSphere} from "./nodes/CNodeDisplayTargetSphere";
import {CNodeArray} from "./nodes/CNodeArray";
import {par} from "./par";
import {CNodeViewUI} from "./nodes/CNodeViewUI";
import {AddTimeDisplayToUI} from "./UIHelpers";
import {SetupGUIFrames} from "./JetGUI";
import {addTracks, makeTrackFromDataFile, TrackManager} from "./TrackManager";
import {CNodeWind} from "./nodes/CNodeWind";
import {curveChanged, initJetVariables, initViews, SetupTraverseNodes, UIChangedAz} from "./JetStuff";
import {addNightSky} from "./nodes/CNodeDisplayNightSky";
import {AddAltitudeGraph, AddSpeedGraph, AddTailAngleGraph, AddTargetDistanceGraph} from "./JetGraphs";
import {CNodeWatch} from "./nodes/CNodeWatch";
import {CNodeCurveEditor} from "./nodes/CNodeCurveEdit";
import {CNodeGraphSeries} from "./nodes/CNodeGraphSeries";
import {DebugSphere, testColorCube, testTextureCube} from "./threeExt";
import {makeLOSNodeFromTrackAngles} from "./nodes/CNodeMISBData";
import {CNodeLOSTargetAtDistance} from "./nodes/CNodeLOSTargetAtDistance";
import {makeArrayNodeFromMISBColumn} from "./nodes/CNodeArrayFromMISBColumn";
import {assert} from "./assert.js";
import {makePositionLLA} from "./nodes/CNodePositionLLA";
import {MV3} from "./threeUtils";
import {registerNodeConsole} from "./RegisterNodes.js"
import {Frame2Az} from "./JetUtils";
import {isConsole} from "./configUtils";
import {CNodeMirrorVideoView} from "./nodes/CNodeMirrorVideoView";

export async function SituationSetup(runDeferred = false) {
    console.log("++++++ SituationSetup")

    // a good test is Jellyfish as it fails on jetOrigin, which is a Vector in Sit
    // which does not work with serialization
    // and probaby needs reworking to be a node
     // const serialized = stringify(Sit, {maxLength: 180, indent: 2});
     // console.log(serialized);
     //
     // const deserialized = JSON.parse(serialized);
     // console.log(deserialized);
     //
     // setSit(deserialized);

    if (!runDeferred)
        new CNodeConstant({id:"radiusMiles", value: wgs84.radiusMiles});

    await SituationSetupFromData(Sit, runDeferred);

}

// this is a recursive function that expands the "include_" keys in the sitData
// into a single object
// this is used to allow us to have a base situation, and then override some values
// effectively the same as using ... includes.
export function expandSitData(sitData, into = {}) {
    for (let key in sitData) {
        const data = sitData[key];
        if (key.startsWith("include_") && data) {
            const includeKey = key.slice(8);
            console.log("+++ SituationSetup: including: " + includeKey)
            expandSitData(SitchMan.get(includeKey), into);
        } else {
//            console.log("### SituationSetup: adding: " + key )
            into[key] = data;
        }
    }
    return into;
}

// for each possible kind in sitch.js, fileIDMap is a list of the keys which specify a file
// in the data. This is used to pre load the files into the file manager
// with startLoadingInlineAssets
// example
// cameraTrack: {file: "westjet/FlightAware_WJA1517_KPHX_CYYC_20231219.kml"},
// usually there will just be one
let fileIDMap = {
    "cameraTrack": ["file"],
    "TargetTrackData": ["file"],
    "nightSky": ["starLink"],
    "addTracks": ["tracks"], // this will be an array
}

export async function startLoadingInlineAssets(sitData) {
    // load the inline assets
    for (let key in sitData) {
        const data = sitData[key];
        const fileIDs = fileIDMap[key];
        if (fileIDs) {
            // see if any of the fileIDs are in the data as keys
            for (let fileID of fileIDs) {
                let possibleFiles = data[fileID];
                // if not an array, make it an array
                if (!Array.isArray(possibleFiles)) {
                    possibleFiles = [possibleFiles];
                }

                for (let file of possibleFiles) {

                    // we don't load the file if it already exists
                    // which generally means either:
                    // 1 - It was loaded already in some way
                    // 2 - It's an ID of a file specifed in files:{}
                    if (file && !FileManager.exists(file)) {
                        console.log("SituationSetup: loading inline asset: " + file)
                        // we are using the filename as the ID
                        // so later we can use FileManager.get("filename") to get the file
                        // meaning the filename is the key to the file and it will just work when
                        // the sitch file is parsed.
                        let assetName = file;
                        // if it does not start with http, then assume it's
                        // in the in the sitrec-upload directory
                        // if (!assetName.startsWith("http")) {
                        //     assetName = SITREC_UPLOAD + assetName;
                        //     console.log("Modifed asset  name to : " + assetName)
                        // }

                        await FileManager.loadAsset(assetName, assetName);
                    }
                }
            }
        }

    }

}


export async function SituationSetupFromData(sitData, runDeferred) {

    // const sitDataExpanded = expandSitData(sitData); // see CSituation constructor
    const sitDataExpanded = sitData;  //


    for (let key in sitDataExpanded) {

        // _data should be immutable, as we want to use it again
        const _data = sitDataExpanded[key];

        // we can have undefined values in sitData, so skip them
        // this normally occurs when we have a base situation, and then override some values
        if (_data === undefined || _data === null) continue;

        const dataDeferred = _data.defer ?? false;
        // assert dataDeferred is a boolean
        assert(typeof dataDeferred === "boolean", "SituationSetup: _data.defer must be a boolean")
        // assert runDeferred is a boolean
        assert(typeof runDeferred === "boolean", "SituationSetup: runDeferred must be a boolean")

        if (dataDeferred !== runDeferred) {
            // if (!runDeferred) console.log("SituationSetup: skipping deferred data: " + key)
            continue;
        }

        let runTests = true;

        // for backwards compatibility, some note types were previously setup up with commands
        // like "terrain" and "mainCamera" - and we are transitioning to them being nodes
        // but old sitches will still have the old commands
        // so we rename them with the correct node type
        // this all is needed for serialization testing and usage
        // we also don't expect to serialize these, so we don't run tests on them
        if (key === "terrain") {
            key = "Terrain";
            runTests = false;
        }

        // we generally don't want to run the test on the Terrain node
        // as it requires loading the terrain
        if (key === "Terrain" || _data.kind === "Terrain") {
            runTests = false;
        }

        let node = await SetupFromKeyAndData(key, _data);
//         if (runTests && node !== null && node.canSerialize && isLocal) {
//
//             // remember how many nodes there are, as these tests should not alter that
//             const nodeCount = NodeMan.size();
//
//           // the issue here is that the object is not a simple object
//           // it contains a reference to a lil-gui object, which is a circular reference
//             // so we can't use JSON.stringify, or this.
//
//             function objectHash(obj) {
//                 if (obj === null || typeof obj !== 'object') {
//                     return String(obj);
//                 }
//
//                 const keys = Object.keys(obj).sort();
//                 const hashParts = keys.map(key => {
//                     const value = obj[key];
//                     if (typeof value === 'object') {
//                         // if it's derived from CNode, then we can use the id
//                         if (value instanceof CNode) {
//                             return `${key}:{${value.id}}`;
//                         }
//                         return `${key}:{...}`;
//                     }
//                     return `${key}:${String(value)}`;
//                 });
//
//                 return `{${hashParts.join('\n')}}`;
//             }
//
//             // we now do some quick tests to ensure round-trip compatibility
//             // get the node as text
// //            const nodeAsText = JSON.stringify(node, null, 2);
//             const nodeAsText = objectHash(node);
// //            console.log(nodeAsText)
//             // remove it
//             NodeMan.disposeRemove(node.id);
//             // create it again
//             node = await SetupFromKeyAndData(key, _data);
//             // and get text from that
//             //const nodeAsText2 = JSON.stringify(node, null, 2);
//             const nodeAsText2 = objectHash(node);
//             // and assert they are the same
//             // assert(nodeAsText === nodeAsText2, "SituationSetup: node serialization round-trip failed for node: " + key +
//             //     "\n"+nodeAsText +"\n" + nodeAsText2);
//
//             function compareTwoNodeTexts(nodeAsText, nodeAsText2, info) {
//                 if (nodeAsText !== nodeAsText2) {
//                     console.log("SituationSetup: node serialization round-trip failed for node: " + key);
//                     console.log(nodeAsText);
//                     console.log(nodeAsText2);
//                     // convert both to arrays of lines and print out the first line that is different
//                     const lines1 = nodeAsText.split("\n");
//                     const lines2 = nodeAsText2.split("\n");
//                     for (let i = 0; i < lines1.length; i++) {
//                         if (lines1[i] !== lines2[i]) {
//                             console.log("First difference at line: " + i);
//                             console.log("1: " + lines1[i]);
//                             console.log("2: " + lines2[i]);
//                             break;
//                         }
//                     }
//
//                     assert(0, "SituationSetup: node serialization round-trip failed for node: " + key +" "+info);
//                 }
//             }
//             compareTwoNodeTexts(nodeAsText, nodeAsText2, "second setup with same data");
//
//             // check the number of nodes has not changed
//             assert(NodeMan.size() === nodeCount, "Node serialization test 1, node count changed from " + nodeCount + " to " + NodeMan.size());
//
//
//
//             // the above test is to ensure this type of test (deleting and re-creating the node) is valid, and has no side effects
//             // we now repeat the test by serializing the node to a string, and then re-creating it
//             const serialized = node.serialize();
//             // remove the node
//             NodeMan.disposeRemove(node.id);
//             // and re-create it from the serialized data
//             node = await SetupFromKeyAndData(key, serialized);
//             // get that as text
//             //const nodeAsText3 = JSON.stringify(node, null, 2);
//             const nodeAsText3 = objectHash(node);
//             // and compare it to the original text
//             compareTwoNodeTexts(nodeAsText, nodeAsText3, "Serialized Node");
//             // if we didn't get any asserts, then serialization is good for this node
//
//             assert(NodeMan.size() === nodeCount, "Node serialization test 2, node count changed from " + nodeCount + " to " + NodeMan.size());
//         }

    }
}

export async function resolveAnonObjects(data, depth=0) {
    // iterate over the keys in data
    // if the value for that key is an object
    // and that object has a "kind" key, then recursively call SetupFromKeyAndData
    for (let subKey in data) {
        if (typeof data[subKey] === "object") {
            if (data[subKey].kind !== undefined) {
                // here the key will be the name of a variable
                // so we can't use it as a node id
                // so instead we pass in undefined,
                // so the node system will generate an id for it
                const anonResult = await SetupFromKeyAndData(undefined, data[subKey], depth+1);
                // assert it's a CNode derived object
                assert(anonResult instanceof CNode, "SituationSetup: anonymous object must be a CNode derived object. Kind = "+data[subKey].kind+"\n"+JSON.stringify(data));
                // replace the object with the id of the newly created node
                data[subKey] = anonResult.id;
            }
        }
    }
}

// information about which nodes/keys are allowed/needed in console mode
var consoleKeys = null

function initConsoleKeys() {
    if(consoleKeys)
        return

    // The keys here refer to either nodes of a certain kind
    // or keys from the sitch data that are allowed/needed in console mode.
    // Nodes/keys which are not mentioned here will be ignored in console mode.
    // By default a node of a certain Kind will be loaded from CNodeKind.js,
    // but some CNode source files export more than one node class
    // so the optional 'file' property defines which file a node should be loaded from.
    const keyInfo = {
        Constant: { file: "CNode.js" },
        Origin: { file: "CNode.js" },
        TrackFromLLA: {},
        Wind: {},
        inputFeet: {}
    }

    consoleKeys = new Map(Object.entries(keyInfo))
}


// given a key and some data, execute the appropiate setup
// this is often a node, but can be a GUI element, or some other setup
// setup commands start with lower case and are handled in the switch statement
// nodes start with upper case and that's handled in the default case
export async function SetupFromKeyAndData(key, _data, depth=0) {
    let data;
    // if _data is an object, then make data be a clone of _data, so we can modify it (adding defaults, etc)
    if (typeof _data === "object") {

        //  data = {..._data}; // old way, but this is a shallow copy
        // make a deep copy of the object, as there are sub=objects, like "inputs"
        // and the anonymous objects
//        data = JSON.parse(JSON.stringify(_data));
        data = structuredClone(_data);



        // resolve any anonymous objects at the top level
        // which will recursively call SetupFromKeyAndData as needed
        // so you can nest anonymous objects as deep as you like
        await resolveAnonObjects(data, depth);

        // if it has an "inputs" object then do the same with that
        // inputs (as a parameter) is largely legacy, but still required for a couple of things
        if (data.inputs !== undefined) {
            await resolveAnonObjects(data.inputs);
        }

        // if it has an "effects" object then parse each effect's inputs and resolve any anonymous objects
        // for example usage, see the effects structure in SitCustom.js
        const effects = data.effects;
        if (effects !== undefined) {
            for (let effectKey in effects) {
                if (effects[effectKey].inputs !== undefined) {
                    await resolveAnonObjects(effects[effectKey].inputs);
                }
            }
        }

    } else {
        // if not an object (e.g. a number, boolean, or string), then just use _data
        data = _data;
    }

//        console.log("SituationSetup iterating: key = " + key );

    function SSLog() {
//        console.log("..... SSLOG SituationSetup: " + key + " " + JSON.stringify(data))
    }

    if (data.kind !== undefined) {
        // new way of doing it, the "kind" is the kind of thing we want to setup
        // which means the key is the id of the node OR the id of some setup code in the switch statement below
        // the depth check means we can allow a data.id AND a data.kind in the same object
        // but only for sub-objects, which were previously anonymous objects
        // we need the have an id for serialization
        // example:
        // turnRateBS: {kind: "TurnRateBS",
        //     id: "turnRateBS",
        //     inputs: {
        //     speed: { id: "watchTAS", kind: "parWatch", watchID: "TAS"},
        //     bank: "bank"
        // }
        // the id will be turnRateBS, and the kind will be TurnRateBS
        // but we can't use "speed" as an id, as it's a parameter name
        // so we have another id for that, which is watchTAS

        if (depth === 0)
        {
            assert(data.id === undefined, "SituationSetup: data.id is deprecated, use key as id");
            // for top level objects, the key is the id
            // but not for sub-objects, as the key is usally a parameter name
            // and not a unique object
            data.id = key;
        }

        key = data.kind;
    }


    let node = null;

    // only certain nodes work in console mode
    if(isConsole) {
        initConsoleKeys()
        var consoleKeyInfo = consoleKeys.get(key)
        if(!consoleKeyInfo)
            return null
    }

    switch (key) {

        case "frames":
            SSLog();
            SetupGUIFrames();
            break;

        case "flattening":
            SSLog();
            node = new CNodeGUIValue({id: "flattening", value: 0, start: 0, end: 1, step: 0.005, desc: "Flattening"}, gui)
            // terrain has likely already been set up, so we need to add this as an input manually
            const terrain = NodeMan.get("TerrainModel",false);
            if (terrain) {
                terrain.addInput("flattening", node);
            }

            break;

        // case "terrain":
        //     SSLog();
        //     //     terrain: {lat: 37.001324, lon: -102.717053, zoom: 9, nTiles: 8},
        //     node = new CNodeTerrain({
        //         id: data.id ?? "TerrainModel",
        //         radiusMiles: "radiusMiles", // constant
        //         lat: data.lat,
        //         lon: data.lon,
        //         zoom: data.zoom,
        //         nTiles: data.nTiles,
        //         flattening: Sit.flattening ? "flattening" : undefined,
        //         tileSegments: data.tileSegments ?? 100,
        //     })
        //     break;

        case "mainCamera":
            SSLog();
            // mainCamera: {
            //     fov:  32,
            //         startCameraPosition: [94142.74587419331,13402.067238703776,-27360.90061964375],
            //         startCameraTarget: [93181.8523901133,13269.122270956876,-27117.982222227354],
            // },

            // if we don't have a startCameraPosition or startCameraPositionLLA, then add some defaults
            // basically a high camera to the south of the region, looking at the center
            if (data.startCameraPosition === undefined && data.startCameraPositionLLA === undefined) {
                data = {
                    ...data,
                    ...{startCameraPosition:[0,130000,160000],
                        startCameraTarget:[0,0,0]}
                }
            }

            const cameraNode = new CNodeCamera({
                id: "mainCamera",
                fov: data.fov ?? 30,
                aspect: window.innerWidth / window.innerHeight,
                near: data.near ?? 1,
                far: data.far ?? 80000000,
                layers: data.mask ?? LAYER.MASK_MAINRENDER,

                // one of these will be undefined. CNodeCamera uses the other
                startPos: data.startCameraPosition,
                lookAt: data.startCameraTarget,
                startPosLLA: data.startCameraPositionLLA,
                lookAtLLA: data.startCameraTargetLLA,

            })

            guiMenus.view.add(cameraNode.camera, 'fov', 0.35, 80, 0.01).onChange(value => {
                cameraNode.camera.updateProjectionMatrix()
            }).listen().name("Main FOV")
                .tooltip("Field of View of the main view's camera (VERTICAL)");

            node = cameraNode;
            break;

        case "lookCamera":
            SSLog();

            const cameraID = data.id ?? "lookCamera";
            node = new CNodeCamera({
                id: cameraID,
                fov: data.fov ?? 10,
                //            aspect: window.innerWidth / window.innerHeight,
                near: data.near ?? 1,
                far: data.far ?? 8000000,
                layers: data.mask ?? LAYER.MASK_LOOKRENDER,
                //                   layers: data.mask ?? LAYER.MASK_MAIN_HELPERS,
            })

            if (cameraID === "lookCamera") {
                const lookCameraNode = NodeMan.get("lookCamera");

                if (data.addFOVController) {
                    guiMenus.camera.add(lookCameraNode.camera, 'fov', 0.35, 80, 0.01).onChange(value => {
                        lookCameraNode.camera.updateProjectionMatrix()
                    }).listen().name("Look Camera FOV")
                }
            }

            break;

        // cameraTrack: {
        //     id: "cameraTrack",
        //         file: "cameraFile",
        // },
        case "cameraTrack":
            SSLog();
            assert(Sit.lat !== undefined && Sit.lon !== undefined, "SituationSetup: cameraTrack needs Sit.lat and Sit.lon defined. i.e. after terrain");

            const id = data.id ?? "cameraTrack";
            if (data.LLA !== undefined) {
                node = makePositionLLA(id, data.LLA[0], data.LLA[1], f2m(data.LLA[2]));
                node.frames = Sit.frames;
                node.useSitFrames = Sit.frames;
            } else {
                const file = data.file ?? "cameraFile";

                node = makeTrackFromDataFile(file, id + "Data", id);

                new CNodeDisplayTrack({
                    id: id + "Display",
                    track: id,
                    color: [1, 1, 0],
                    width: 2,
                })

                new CNodeDisplayTrack({
                    id: id + "DisplayData",
                    track: id + "Data",
                    color: [0.7, 0.3, 0],
                    width: 1,
                    ignoreAB: true,
                })


            }
            break;


        // focalLenController: {source: "cameraTrack", object: "lookCamera", len: 166, fov: 5},
        case "focalLenController":
            SSLog();
            NodeMan.get(data.object ?? "lookCamera").addController("FocalLength", {
                id:data.id,
                focalLength: data.source,
                referenceFocalLength: data.len,
                referenceFOV: data.fov,
            })
            break;

        case "fovController":
            SSLog();
            NodeMan.get(data.object ?? "lookCamera").addController("FOV", {
                id:data.id,
                source: data.source,
            })
            break;

        case "matrixController":
            SSLog();
            NodeMan.get(data.object ?? "lookCamera").addController("Matrix", {
                id:data.id,
                source: data.source,
            })
            break;

        case "wescamFOV":
            SSLog();

            // get the CSV data from the file
            let wescamSource = FileManager.get(data.file)

            // now make a per-frame array of focal lengths
            const focalLengths = new Array(Sit.frames);
            for (var frame = 0; frame < Sit.frames; frame++) {
                var focalLength = getArrayValueFromFrame(wescamSource, 0, data.focalIndex, frame)
                const mode = getArrayValueFromFrame(wescamSource, 0, data.modeIndex, frame);
                if (mode !== "IR") {
                    focalLength *= 2
                }
                focalLengths [frame] = focalLength;
            }

            // wrap the array in a node
            new CNodeArray({id: "focalLengthsNode", array: focalLengths});

            // and add a focal length controller based on this.
            NodeMan.get(data.object ?? "lookCamera").addController("FocalLength", {
                id:data.id,
                focalLength: "focalLengthsNode",
                referenceFocalLength: data.len,
                referenceFOV: data.fov,
            })

            break;



        case "mainView":
            SSLog();

            const mainViewDef = {
                id: "mainView",
                //     draggable:true,resizable:true,
                left: 0.0, top: 0, width: .5, height: 1,
                fov: 50,
                background: data.background ?? Sit.skyColor,
                camera: "mainCamera",
                ...data,
            }
            const view = new CNodeView3D(mainViewDef);
            view.addOrbitControls(Sit.renderer);
            node = view;
            break;

        case "lookView":
            SSLog();

            var color = Sit.skyColor

            // if we have a mainView, then use its background color
            if (NodeMan.exists("mainView")) {
                color = NodeMan.get("mainView").background;
            }

            const lookViewDef = {
                id: "lookView",
                //     draggable:true,resizable:true,

                // what might these defaults not work for?
                draggable:true,resizable:true,shiftDrag:true,freeAspect:false,

                left: 0.75, top: 0, width: .25, height: 1,
                fov: 50,
                background: color,
                camera: "lookCamera",
                syncVideoZoom: true,
                ...data,
            }
            const lookView = new CNodeView3D(lookViewDef);
            node = lookView;
            if (!data.noOrbitControls)
                lookView.addOrbitControls(Sit.renderer);
            break;

        case "videoView":
            SSLog();

            // legacy sitches have the video file in the root of the sitch
            // but we now use Sit.files.videoFile
            // to keep the files consistent for rehosting
            let videoFile = Sit.videoFile;
            if (videoFile === undefined && Sit.files !== undefined) {
                videoFile = Sit.files.videoFile
            }

            // we allow no video file, we just want somewhere to drop a new video
            //    assert(videoFile !== undefined, "videoView needs a video file")

            if (!NodeMan.exists("videoZoom")) {
                new CNodeGUIValue({
                    id: "videoZoom",
                    value: 100, start: 5, end: 2000, step: 1,
                    desc: "Video Zoom %",
                    tip: "Zoom in on the center of the video. Will also zoom the 'lookView' camera to match, if linked",
                }, guiMenus.view)
            }


            node = new CNodeVideoWebCodecView({
                    id: /*data.id ?? */"video",
                    inputs: {
                        zoom: "videoZoom"
                    },
                    visible: true,
                    draggable: true, resizable: true,
                    frames: Sit.frames,
                    videoSpeed: Sit.videoSpeed,
                    file: videoFile,
                    ...data,
                }
            )
            break;

        case "focusTracks":
            SSLog();
            NodeMan.get("mainView").addFocusTracks(data);

            break;

        // need to implement views first, as the spline editor needs a renderer and controls
        case "targetSpline":
            SSLog();
            const mainView = NodeMan.get("mainView")
            assert(mainView !== undefined, "SituationSetup: targetSpline needs a mainView defined");
            node = new CNodeSplineEditor({
                id: data.id ?? "targetTrack",
                type: data.type,   // chordal give smoother velocities
                scene: GlobalScene,
                camera: "mainCamera",
                view: mainView,
                renderer: mainView.renderer,
                controls: mainView.controls,
                frames: Sit.frames,
                terrainClamp: data.terrainClamp ?? "TerrainModel",

                initialPoints: data.initialPoints,
                initialPointsLLA: data.initialPointsLLA,
            })
            break;

        case "dragDropHandler":
            if (NodeMan.exists("mainView"))
                DragDropHandler.addDropArea(NodeMan.get("mainView").div);
            if (NodeMan.exists("lookView"))
                DragDropHandler.addDropArea(NodeMan.get("lookView").div);
            break;

        case "startDistanceFeet":
            SSLog();
            node = new CNodeScale(data.id ?? "startDistance", scaleF2M, new CNodeGUIValue(
                {id: "startDistanceFeet", ...data}, data.gui ?? gui))
            break;

        case "sizeFeet":
            SSLog();
            node = new CNodeScale(data.id ?? "targetSize", scaleF2M, new CNodeGUIValue(
                {...data, ...{id: "targetSizeFeetGUI"}}, data.gui ?? gui))
            break;

        case "inputFeet":
            SSLog();
            node = new CNodeScale(data.id, scaleF2M, new CNodeGUIValue(
                {...data, ...{id: data.id + "GUI"}}, data.gui ?? gui));
            break

        case "ptz":
            SSLog();

            console.log("MAKE PTZ lookCamera, quaternion = " + NodeMan.get("lookCamera").camera.quaternion.x)

            const camera = data.camera ?? "lookCamera";
            //data.id ??= camera + "PTZ"; // i.e. lookCameraPTZ
            const addID = data.id ?? camera.id + "_PTZUI";
            const idObject = {id: addID};
            const showGUI = data.showGUI ?? true;
            NodeMan.get(camera).addController("PTZUI", {
                gui: data.gui ?? guiMenus.camera, ...data, ...idObject, showGUI: showGUI});

            break;

        case "lookPosition":
            SSLog();
            NodeMan.get("lookCamera").addController("UIPositionLLA", {
                id: "CameraLLA",
                fromLat: new CNodeGUIValue({
                    id: "cameraLat",
                    value: data.fromLat,
                    start: -90,
                    end: 90,
                    step: 0.001,
                    desc: "Camera Lat"
                }, data.gui ?? guiMenus.view),

                fromLon: new CNodeGUIValue({
                    id: "cameraLon",
                    value: data.fromLon,
                    start: -180,
                    end: 180,
                    step: 0.001,
                    desc: "Camera Lon"
                }, data.gui ?? guiMenus.view),

                fromAltFeet: new CNodeGUIValue({
                    id: "cameraAlt",
                    value: data.fromAltFeet,
                    start: data.fromAltFeetMin ?? 0,
                    end: data.fromAltFeetMax ?? 50000,
                    step: 0.1,
                    desc: "Camera Alt (ft)"
                }, data.gui ?? guiMenus.view),
                radiusMiles: "radiusMiles",
            })
            break;

        case "followTrack":
            SSLog();
            NodeMan.get(data.object ?? "lookCamera").addController("TrackPosition", {
                id:data.id,
                sourceTrack: data.track ?? "cameraTrack",
            })
            break;

        case "lookAt":
            SSLog();
            NodeMan.get(data.object ?? "lookCamera").addController("LookAtLLA", {
                id:data.id,
                toLat: data.toLat,
                toLon: data.toLon,
                toAlt: data.toAlt,
            })
            break;

        case "lookAtTrack":
            SSLog();
            NodeMan.get(data.object ?? "lookCamera").addController("LookAtTrack", {
                id:data.id,
                targetTrack: data.track ?? "targetTrack",
            })
            break;

        case "trackToTrack":
            SSLog();
            NodeMan.get(data.object ?? "lookCamera").addController("TrackToTrack", {
                id:data.id,
                sourceTrack: data.target ?? "cameraTrack",
                targetTrack: data.target ?? "targetTrack",
            })
            break;



        case "trackFromDataFile":
            SSLog();

            node = makeTrackFromDataFile(data.file, data.dataID, data.id);
            break;

        case "targetObject":
            SSLog();
            node = new CNodeDisplayTargetModel({
                id: data.id ?? "targetObject",
                track: data.track ?? "targetTrack",
                TargetObjectFile: data.file,
                wind: data.wind ?? undefined,
                tiltType: data.tiltType ?? "none",
                //  ...maybeWind,
            })
            break;

        case "targetSizedSphere":
            SSLog();
            data.id = data.id ?? "targetSizedSphere";
            node = new CNodeDisplayTargetSphere({
                id: data.id,
                track: data.track ?? "targetTrack",
                size: new CNodeScale("sizeScaledLOS" + data.id, scaleF2M,
                    new CNodeGUIValue({
                        id: data.id+"Size",
                        value: data.size ?? 3,
                        start: 0,
                        end: 200,
                        step: 0.01,
                        desc: "Target Sphere size ft"
                    }, guiMenus.objects)
                ),
                layers: LAYER.MASK_LOOK,
                color: data.color ?? "#FFFFFF"
            })
            break;

        // Take pan and tilt data from a file and use it to control the camera
        case "arrayDataPTZ":
            SSLog();
            const cameraTrack = NodeMan.get(data.arrayNode ?? "cameraTrack");
            makeArrayNodeFromMISBColumn("headingCol", cameraTrack, data.heading, 30, true)
            makeArrayNodeFromMISBColumn("pitchCol", cameraTrack, data.pitch, 30, true)
            NodeMan.get(data.camera ?? "lookCamera").addController(
                "AbsolutePitchHeading",
                { id:data.id, pitch: "pitchCol", heading: "headingCol"}
            )
            if (data.labelView !== undefined) {
                const labelView = NodeMan.get(data.labelView)
                labelView.addText("alt", "---", 0, 5, 5, '#FFFFFF', 'left').listen(par, "cameraAlt", function (value) {
                    this.text = "Alt " + (floor(0.499999 + abs(value))) + "m";
                })

                labelView.addLine("---").listen(par, "az", function (value) {
                    this.text = "Az " + value.toFixed(2) + "°";
                })

                labelView.addLine("---").update(function (value) {
                    this.text = "Pitch " + NodeMan.get("pitchCol").v(par.frame).toFixed(2) + "°";
                })
            }
            break;

        case "losTrackMISB":
            SSLog();
            node = makeLOSNodeFromTrackAngles(data.arrayNode ?? "cameraTrack", data);
            break;

        case "labelView":
            SSLog();
            const overlayNode = data.overlay ?? "lookView";
            const overlayView = NodeMan.get(overlayNode);
            var labelVideo = new CNodeViewUI({id: data.id ?? "labelVideo", overlayView: overlayView});
            let textSize = 2.5;
            let dataTimeY = data.dateTimeY ?? 96;
            AddTimeDisplayToUI(labelVideo, 50, dataTimeY, textSize, "#f0f000")
            labelVideo.setVisible(true)
            node = labelVideo;
            break;

        case "tilt":
            SSLog();
            NodeMan.get("lookCamera").addController("Tilt", {
                id:data.id,
                tilt: makeCNodeGUIValue("tilt", data, -30, 30, 0.01, "Tilt", gui),
            })
            break;

        case "addTracks":
            SSLog();
            const sphereMask = data.sphereMask ?? LAYER.MASK_HELPERS;
            const removeDuplicates = data.removeDuplicates ?? false;
            addTracks(data.tracks, removeDuplicates, sphereMask);
            break;

        case "targetWind":
            SSLog();
            node = new CNodeWind({
                id: "targetWind",
                from: data.from,
                knots: data.knots,
                max: data.max,
                name: "Target",
                arrowColor: "red"
            }, guiPhysics)
            break;

        case "objectWind":
            SSLog();
            node = new CNodeWind({
                id: "objectWind",
                from: data.from,
                knots: data.knots,
                max: data.max,
                name: "Object",
                arrowColor: "cyan"
            }, guiPhysics)
            break;

        case "localWind":
            SSLog();
            node = new CNodeWind({
                id: "localWind",
                from: data.from,
                knots: data.knots,
                max: data.max,
                name: "Local",
                arrowColor: "yellow"
            }, guiPhysics)
            break;

        case "losTarget":
            // ONly used for LAXUAP
            let control = {};
            if (data.distance) {
                new CNodeScale("controlLOS", scaleF2M,
                    new CNodeGUIValue({
                        value: data.distance,
                        start: 1,
                        end: 100000,
                        step: 0.1,
                        desc: "LOS Sphere dist ft"
                    }, gui))
                control = {distance: "controlLOS"}
            } else if (data.altitude) {
                new CNodeScale("controlLOS", scaleF2M,
                    new CNodeGUIValue({
                        value: data.altitude,
                        start: 1,
                        end: 40000,
                        step: 0.1,
                        desc: "LOS Sphere alt ft"
                    }, gui))
                control = {altitude: "controlLOS"}
            }


            new CNodeLOSTargetAtDistance({
                id: "LOSTargetTrack",
                track: data.track,
                camera: data.camera,
                ...control,
                frame: data.frame,
                offsetRadians: radians(data.offset),
            })

            new CNodeLOSTargetAtDistance({
                id: "LOSTargetWithWindTrack",
                track: data.track,
                camera: data.camera,
                ...control,
                frame: data.frame,
                offsetRadians: radians(data.offset),
                wind: "objectWind",
            })

            new CNodeDisplayTargetSphere({
                id: "LOSTargetDisplayGroundRelative",
                track: "LOSTargetTrack",
                size: new CNodeScale("sizeScaledLOS", scaleF2M,
                    new CNodeGUIValue({
                        value: data.size,
                        start: 0,
                        end: 200,
                        step: 0.01,
                        desc: "Target Sphere size ft"
                    }, guiMenus.objects)
                ),
                layers: LAYER.MASK_LOOK,
                color: "#00c000"  // green fixed relative to ground
            })

            new CNodeDisplayTargetSphere({
                id: "LOSTargetDisplayWindRelative",
                track: "LOSTargetWithWindTrack",
                size: "sizeScaledLOS",
                layers: LAYER.MASK_LOOK,
                color: "#00ffff"  // cyan = with wind
            })
            break;

        case "smoothTrack":
            SSLog();

            if (data.method === "moving") {
                node = NodeFactory.reinterpret(data.track, "SmoothedPositionTrack",
                    {
                        //   source: data.track,
                        method: data.method,
                        copyData: true,
                        window: new CNodeGUIValue({
                            id: data.track+"smoothingWindow",
                            value: data.window ?? 20,
                            start: 1,
                            end: 200,
                            step: 1,
                            desc: "Smoothing window size"
                        }, gui),
                    },
                    "source"
                );
            } else {
                node = NodeFactory.reinterpret(data.track, "SmoothedPositionTrack",
                    {
                        //   source: data.track,
                        method: "catmull",
                        intervals: new CNodeGUIValue({
                            id: data.track+"catmullInterval",
                            value: 20,
                            start: 1,
                            end: 200,
                            step: 1,
                            desc: "Catmull Intervals"
                        }, gui),
                        tension: new CNodeGUIValue({
                            id: data.track+"catmullTension",
                            value: 0.5,
                            start: 0,
                            end: 5,
                            step: 0.001,
                            desc: "Catmull Tension"
                        }, gui),
                        copyData: true,
                    },
                    "source"
                );
            }
            break;

        case "straightenTrack":
            SSLog();
            node = NodeFactory.reinterpret(data.track, "InterpolateTwoFramesTrack",
                {
                    source: data.track,
                }
            );
            break;


        case "azSlider":
            if (data) {
                SSLog();
                let aZMin = Frame2Az(0)
                let aZMax = Frame2Az(Sit.frames - 1)
                if (aZMin > aZMax) {
                    const t = aZMin;
                    aZMin = aZMax;
                    aZMax = t;
                }
                guiPhysics.add(par, 'az', aZMin, aZMax, 0.2).listen().onChange(UIChangedAz).name("azimuth")
            }
            break;

        case "nightSky":
            SSLog();
            // if data true or it is an object with no keys (i.e. {} )
            // then add the default night sky
            if (data === true || Object.keys(data).length === 0) {
                node = addNightSky({starLink: "starLink"})
            } else {
                node = addNightSky(data)
            }
            break;

        case "traverseNodes":
            SSLog();
            SetupTraverseNodes(data.id ?? "LOSTraverseSelect", data.menu, data.default, data.los ?? "JetLOS", data.idExtra ?? "", data.exportable ?? true);
            break;

        case "speedGraph":
            SSLog();
            const speedGraph = AddSpeedGraph(
                data.track ?? "targetTrack",
                data.label ?? "Speed",
                data.min ?? 0,
                data.max ?? 100,
                data.left ?? 0,
                data.top ?? 0,
                data.width ?? 0.2,
                data.height ?? 0.25,
                undefined,
                data.dynamicY ?? false,


            );
            if (data.visible === false) {
                speedGraph.editorView.hide();
            }
            break;

        case "altitudeGraph":
            SSLog();

            // this should be changed to be the same as the speed graph
            const altitudeGraph = AddAltitudeGraph(
                data.min ?? 0,
                data.max ?? 100,
                data.track ?? "targetTrack",
//                    data.label ?? "Speed",
                data.left ?? 0,
                data.top ?? 0,
                data.width ?? 0.2,
                data.height ?? 0.25,
                data.yStep ?? 5000,
                data.xStep ?? 200,
                data.dynamicY ?? false,

            );
            if (data.visible === false) {
                altitudeGraph.editorView.hide();
            }
            break;

        case "tailAngleGraph":
            SSLog();
            AddTailAngleGraph(
                {
                    targetTrack: data.targetTrack ?? "targetTrack",
                    cameraTrack: data.cameraTrack ?? "cameraTrack",
                    wind: data.wind ?? "targetWind",
                },
                {
                    left: data.left ?? 0,
                    top: data.top ?? 0,
                    width: data.width ?? 0.15,
                    height: data.height ?? 0.25,
                },
                {
                    maxY: data.maxY ?? 90,
                    dynamicX: true,
                    dynamicY: data.dynamicY ?? false,
                }

            );
            break;

        case "targetDistanceGraph":
            SSLog();
            const tdGraph = AddTargetDistanceGraph(
                {
                    targetTrack: data.targetTrack ?? "targetTrack",
                    cameraTrack: data.cameraTrack ?? "cameraTrack",
                },
                {
                    left: data.left ?? 0,
                    top: data.top ?? 0.25,
                    width: data.width ?? 0.15,
                    height: data.height ?? 0.25,
                },
                {
                    maxY: data.maxY ?? 30,
                    dynamicX: true,
                    dynamicY: data.dynamicY ?? false,
                }

            );
            if (data.visible === false) {
                tdGraph.editorView.hide();
            }
            break;

        case "mirrorVideo":
            SSLog();
            node = new CNodeMirrorVideoView({
                id: data.id ?? "mirrorVideo",
                inputs: {
                    zoom: "videoZoom"
                },
                mirror: "video",
                overlayView: "lookView",
                transparency: 0.15,
                ...data,
            })
            break;

        case "arrayFromKeyframes":
            SSLog();
            const expanded = ExpandKeyframes(FileManager.get(data.file), Sit.frames,
                data.frameCol ?? 0,
                data.dataCol ?? 1,
                data.stepped ?? false,
                data.string ?? false,
                data.degrees ?? false,
                data.frameOffset ?? 0);
            node = new CNodeArray({id: data.id, array: expanded, exportable: data.exportable});
            if (data.smooth) {
                node = NodeFactory.reinterpret(data.id, "SmoothedArray", {source: data.id, window: data.smooth}, "source")
            }
            break;

            // creates a watch node for a variable in par
        case "parWatch":
            SSLog();
            assert(par[data.watchID] !== undefined, "SituationSetup: parWatch needs a valid watchID that references a variable in par");
            node = new CNodeWatch({id:data.id, ob:par, watchID:data.watchID});
            break;


        case "addGraphSeries":
            SSLog();
            assert(data.source !== undefined, "SituationSetup: addGraphSeries needs a source object");
            assert(data.graph !== undefined, "SituationSetup: addGraphSeries needs a graph object");
            const graph = NodeMan.get(data.graph);
            assert(graph instanceof CNodeCurveEditor, "SituationSetup: addGraphSeries needs a valid graph object");
            graph.editorView.addInput(data.id+"_view",
                new CNodeGraphSeries({id:data.id, source:data.source, color: data.color ?? "#000000"}));
            graph.editorView.recalculate();
            break;

            // a few bits of FLIR1 setup that were non-trivial to textualize
            // but could eventaully be moved.
            // note that initJetVariables is shared by GoFast and anything with Sit.jetStuff true
        case "flir1LegacyCode":
            SSLog();
            initJetVariables();
            initViews()
            guiPhysics.add(par, 'jetPitch', -8, 8, 0.01).onChange(function () {
                curveChanged();
                // calculateGlareStartAngle();
                par.renderOne = true;
            }).listen().name('Jet Pitch')
            Sit.update = function(f) {
                let IRW = true;
                if (f>=536 && f<1236) {
                    IRW = false;
                }

                if (!NodeMan.get("FLIR1_Invert").guiHasDisabled)
                    NodeMan.get("FLIR1_Invert").enabled = IRW;

                if (!NodeMan.get("FLIR1_IRW_Levels").guiHasDisabled)
                    NodeMan.get("FLIR1_IRW_Levels").enabled = IRW;

                if (!NodeMan.get("FLIR1_TV_Levels").guiHasDisabled)
                    NodeMan.get("FLIR1_TV_Levels").enabled = !IRW;
            }
            break;

        case "segmentSelect":
            SSLog();

            par.segment = data.default;
            gui.add(par, 'segment', data.menu).onChange(function (v) {
                console.log("Segment changed to " + v)
                Sit.aFrame = v[0];
                Sit.bFrame = v[1];
                par.frame = Sit.aFrame;
                // recalculate all tracks
                NodeMan.iterate((key, node) => {
                    // is node derived from CNodeTrack?
                    //  if (node instanceof CNodeTrack) {
                    node.recalculateCascade();
                    //  }
                })
            });
            break;

        case "LLASphere":
            SSLog();
            const position = LLAToEUS(data.LLA[0], data.LLA[1], data.LLA[2]);
            const layers = normalizeLayerType(data.layers ?? LAYER.MASK_HELPERS);
            new DebugSphere(data.id, position, data.radius, data.color, GlobalScene, layers);
            break;

        case "textureCube":
            SSLog();
            testTextureCube(data.url, MV3(data.position), data.size, GlobalScene);
            break;

        case "colorCube":
            SSLog();
            testColorCube(data.color, MV3(data.position), data.size, GlobalScene);
            break;


        case "swapTargetAndCameraTracks":
            SSLog();
            console.log("swapTargetAndCameraTracks is not implemented yet")
            //    guiMenus.physics.add(TrackManager, "swapTargetAndCameraTracks").name("Swap Target and Camera Tracks");

            break;

        default:
            // what if it's a controller???
            // we have custom setup above, but need a more generic way to do this
            // with nodes. Specifically create the controller and add it to the camera
            // so we'll have a "camera" key in the data, and we'll add the controller to that
            // but need to detect if it's derived from CNodeController
            // and then add it to the camera
            if (NodeFactory.isController("Controller" + key)) {
                const objectID = data.object ?? data.camera ?? "lookCamera";
                const objectNode = NodeMan.get(objectID);
                data.id = data.id ?? (objectNode.id+"_Controller" + key);
                if (objectNode) {
                    node = NodeFactory.create("Controller"+key, data);
                    objectNode.addControllerNode(node);
                } else {
                    console.error("SituationSetup: controller " + key + " needs an object/camera")
                }
            } else {
                // check to see if the "kind" is a node type
                // if so, then create a node of that type
                // passing in the data as the constructor
                let valid = NodeFactory.validType(key)

                // in console mode the nodes many not already be registered
                // so attempt to register them if they're not already known to be valid
                if(isConsole && !valid && data.kind !== undefined) {
                    valid = await registerNodeConsole(key, consoleKeyInfo.file)
                }
                
                if (valid) {
                    SSLog();
                    // otherwise it's just a regular node
                    node = NodeFactory.create(key, data);
                } else {
                    if (data.kind !== undefined) {
                        assert(false, "SituationSetup: unknown CNode kind: " + data.kind + " for key: " + key+ " - If new class, check it's in the src/nodes folder, extends CNode and is exported");
                    }
                }
            }
            break;
    }

    return node;

}


/*
 Nodes can be converted by using this regular expression / replacement

new\s+CNode(\w+)\(\s*\{\s*id:\s*"(\w+)",\s*((.|\s)+?)\}\s*\)

$2: { kind: "$1",\n$3},

 */