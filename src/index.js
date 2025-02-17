import {ColorManagement, Group, REVISION, Scene, WebGLRenderer,} from "three";
import "./js/uPlot/uPlot.css"
import "./js/jquery-ui-1.13.2/jquery-ui.css"
import "./js/jquery-ui-1.13.2/jquery-ui.js?v=1"
import {
    addGUIFolder,
    addGUIMenu, CustomManager,
    FileManager,
    GlobalDateTimeNode,
    Globals, guiMenus,
    guiTweaks,
    incrementMainLoopCount,
    infoDiv,
    NodeMan, setCustomManager,
    setFileManager,
    setGlobalDateTimeNode,
    setGlobalURLParams,
    setInfoDiv,
    setNodeFactory,
    setNodeMan,
    setNullNode,
    setSit,
    setSitchMan,
    setUnits,
    setupGUIGlobals,
    setupGUIjetTweaks,
    Sit,
    SitchMan,
} from "./Globals";
import {checkForModding, disableScroll, parseBoolean, stripComments} from './utils.js'
import {CSituation} from "./CSituation";
import {par, resetPar} from "./par";

import * as LAYER from "./LayerMasks.js"
import {SetupFrameSlider} from "./nodes/CNodeFrameSlider";
import {registerNodes} from "./RegisterNodes";
import {registerSitches, textSitchToObject} from "./RegisterSitches";
import {SetupMouseHandler} from "./mouseMoveView";
import {initKeyboard, showHider} from "./KeyBoardHandler";
import {
    CommonJetStuff,
    initJetStuff,
    initJetStuffOverlays,
    initJetVariables,
    updateSize
} from "./JetStuff";
import {
    GlobalDaySkyScene,
    GlobalNightSkyScene,
    GlobalScene,
    LocalFrame,
    setupDaySkyScene,
    setupLocalFrame,
    setupNightSkyScene,
    setupScene
} from "./LocalFrame";
import {CNodeManager} from "./nodes/CNodeManager";
import {CSitchFactory} from "./CSitchFactory";
import {CNodeDateTime} from "./nodes/CNodeDateTime";
import {addAlignedGlobe} from "./Globe";
import JSURL from "./js/jsurl";
import {
    localSituation
} from "../config/config";
import {isConsole, isLocal, setupConfigPaths, SITREC_APP, SITREC_SERVER} from "./configUtils.js"
import {SituationSetup, startLoadingInlineAssets} from "./SituationSetup";
import {CUnits} from "./CUnits";
import {updateLockTrack} from "./updateLockTrack";
import {updateFrame} from "./updateFrame";
import {checkLogin, configParams} from "./login";
import {CFileManager, waitForParsingToComplete} from "./CFileManager";
import {disposeDebugArrows, disposeDebugSpheres, disposeScene, scaleArrows} from "./threeExt";
import {removeMeasurementUI, setupMeasurementUI} from "./nodes/CNodeLabels3D";
import {imageQueueManager} from "./js/get-pixels-mick";
import {disposeGimbalChart} from "./JetChart";
import {CNodeMath} from "./nodes/CNodeMath";
import {CNode, CNodeConstant} from "./nodes/CNode";
import {DragDropHandler} from "./DragDropHandler";
import {CGuiMenuBar} from "./lil-gui-extras";
import {assert} from "./assert.js";
import {CNodeFactory} from "./nodes/CNodeFactory";
import {extraCSS} from "./extra.css.js";
import {TrackManager} from "./TrackManager";
import {ViewMan} from "./CViewManager";
import {glareSprite, targetSphere} from "./JetStuffVars";
import {CCustomManager} from "./CustomSupport";
import {EventManager} from "./CEventManager";
import {checkLocal, getConfigFromServer} from "./configUtils";

console.log ("SITREC START - index.js after imports")


// This is the main entry point for the sitrec web application
// However note that the imports above might have code that is executed
// before this code is executed.
// Building sitrec as a console application uses indexCommon instead.

// We default to nightsky on the public version
// as it's now the most popular usage.
let situation = "nightsky";

// Some (essentially) global variables
let urlParams;
const sortedSitches = {};
const selectableSitches = {};
const builtInSitches = {};
const toolSitches = {};
let toTest;
let testing = false;
let container;
var fpsInterval, startTime, now, then, elapsed;

let animationFrameId;

checkUserAgent();

await setupConfigPaths();

//await getConfigFromServer();

// quick test of the server config
// just call config.php

// fetch(SITREC_SERVER+"config.php", {mode: 'cors'}).then(response => response.text()).then(data => {
//     if (data !== "") {
//         console.log("Server Config ERROR: " + data)
//         // now just render a pain text message of data as an error
//         const errorDiv = document.createElement('div');
//         errorDiv.style.position = 'absolute';
//         errorDiv.style.width = 100;
//         errorDiv.style.height = 100;
//         errorDiv.style.color = "white";
//         errorDiv.innerHTML = data;
//         errorDiv.style.top = 40 + 'px';
//         errorDiv.style.left = 20 + 'px';
//         errorDiv.style.fontSize = 20 + 'px';
//         errorDiv.style.display = 'block';
//         errorDiv.style.padding = 5 + 'px';
//         errorDiv.style.background="black";
//         document.body.appendChild(errorDiv);
//         // and that's it
//         throw new Error("config.php error: "+data);
//         debugger;
//
//     }
// })

resetPar();
const queryString = window.location.search;
urlParams = new URLSearchParams(queryString);
setGlobalURLParams(urlParams)

Globals.fixedFrame = undefined;
if (urlParams.get("frame") !== null) {
    Globals.fixedFrame = parseInt(urlParams.get("frame"));
}

await initializeOnce();
if (!initRendering()) {
    // we failed to create a renderer, so we can't continue
    // terminate the program
    // but we can't just return, as we are in an async function
    // so we need to throw an error
    throw new Error("Failed to create a renderer");

}



let customSitch = null

// for legacy reasons either "custom" or "mod" can be used
// and we'll check for the modding parameter in the sitch object
if (urlParams.get("custom")) customSitch = urlParams.get("custom");
if (urlParams.get("mod")) customSitch = urlParams.get("mod");



if (customSitch !== null) {
    // customSitch is the URL of a sitch definition file
    // fetch it, and then use that as the sitch
    await fetch(customSitch, {mode: 'cors'}).then(response => response.text()).then(data => {
        console.log("Custom sitch = " + customSitch)
//        console.log("Result = "+data)


        let sitchObject = textSitchToObject(data);

        // do we need this if it's in CustomSupport's deserialize function?
        sitchObject = checkForModding(sitchObject);


        setSit(new CSituation(sitchObject))

        // when loading a custom sitch, we don't want to show the initial drop zone animation
        Sit.initialDropZoneAnimation = false;


    });
// }
//
//
// } else if (urlParams.get("mod")) {
//     // a mod has a "modding" parameter which is the name of a legacy sitch
//     // so we get the object for that sitch and then add the mod
//     // removing the "modding" parameter
//     const modSitch = urlParams.get("mod")
//     // customSitch is the URL of a sitch definition file
//     // fetch it, and then use that as the sitch
//     await fetch(modSitch, {mode: 'cors'}).then(response => response.text()).then(data => {
//         console.log("Mod sitch = "+modSitch)
//         console.log("Result = "+data)
//
//         const modObject = textSitchToObject(data);
//
//         let sitchObject = SitchMan.findFirstData(s => {return s.data.name === modObject.modding;})
//
//         assert(sitchObject !== undefined, "Modding sitch not found: "+modObject.modding)
//
//         // merge the two objects into a new one
//         sitchObject = {...sitchObject, ...modObject}
//
//         // remove the modding parameter to be tidy
//         delete sitchObject.modding
//
//         // and that's it
//         setSit(new CSituation(sitchObject))
//         par.name = Sit.menuName;
//         Sit.initialDropZoneAnimation = false;
//
//     });

} else {
    selectInitialSitch();
}




legacySetup();
await setupFunctions();
windowChanged()

infoDiv.innerHTML = ""
console.log("............... Done with setup, starting animation")
startAnimating(Sit.fps);

// We continutally check to see if we are testing

const testCheckInterval = 1000;
setTimeout( checkForTest, Globals.quickTerrain?1:testCheckInterval);
setTimeout( checkFornewSitchObject, 500);

// **************************************************************************************************
// *********** That's it for top-level code. Functions follow ***************************************
// **************************************************************************************************

function checkUserAgent() {
    Globals.canVR = false;
    Globals.inVR = false;
    Globals.onMetaQuest = false;
    Globals.onMac = false;

    if (!isConsole) {
        const userAgent = navigator.userAgent;
        console.log("User Agent = " + userAgent);
        if (userAgent.includes("OculusBrowser") || userAgent.includes("Quest")) {
            console.log("Running on MetaQuest")
            Globals.onMetaQuest = true;
            Globals.canVR = true;
        }

        // check for Mac
        if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
            Globals.onMac = true;
        }


    }
}

function checkForTest() {
    console.log("Testing = " + testing + " toTest = " + toTest)
    if (toTest != undefined && toTest != "") {
//        var url = SITREC_APP + "?test=" + toTest
//        window.location.assign(url)

        var testArray = toTest.split(',');
        situation = testArray.shift() // remove the first (gimbal)
        toTest = testArray.join(",")
        // log current time:
        console.log("Time = " + new Date().toLocaleTimeString());
        console.warn("  Testing " + situation + ", will text next: " + toTest)


        newSitch(situation)


    } else {
        testing = false;
        Globals.quickTerrain = false;

    }
}

Globals.newSitchObject = undefined;

function checkFornewSitchObject() {

    if (Globals.newSitchObject !== undefined) {
        console.log("New Sitch Text = " + Globals.newSitchObject)
        newSitch(Globals.newSitchObject, true);
        Globals.newSitchObject = undefined;
    }
    setTimeout( checkFornewSitchObject, 500);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function newSitch(situation, customSetup = false ) {


    // for the built-in sitches, we change the url, but we don't reload the page
    // that way the user can share the url direct to this sitch
    let url;
    if (!customSetup) {
        url = SITREC_APP + "?sitch=" + situation
    } else {
        // set the URL to the default
        if (FileManager.loadURL !== undefined) {
            url = SITREC_APP + "?custom=" + FileManager.loadURL;
        } else {
            // loading local sitch, so set to custom sitch
            // we don't have a URL, as it does not make sense to share a local sitch via URL
            url = SITREC_APP + "?sitch=custom";
        }

    }

    if (url !== undefined) {
        window.history.pushState({}, null, url);
    }

    // close all the menus, and reattach them to the bar
    // otherwise it gets messy using an old menu config in a new sitch.
    Globals.menuBar.reset();

    cancelAnimationFrame(animate);
    console.log("%%%%% BEFORE the two AWAITS %%%%%%%%")
    await waitForParsingToComplete();

    if (!parseBoolean(process.env.NO_TERRAIN)) {
        await waitForTerrainToLoad();
    }
    console.log("%%%%% AFTER the two AWAITS %%%%%%%%")
    disposeEverything();
    if (!customSetup) {
        // if it's not custom, then "situation" is a name of a default sitch
        selectInitialSitch(situation);
    } else {
        // if it's custom, then "situation" is a sitch data file
        // i.e. the text of a text based sitch
        setSit(new CSituation(situation))
    }

    console.log("Setting up new sitch: "+situation+ " Sit.menuName = "+Sit.menuName+ " Sit.name = "+Sit.name);

    par.name = Sit.menuName;

    legacySetup();
    await setupFunctions();
    startAnimating(Sit.fps);
    setTimeout( checkForTest, Globals.quickTerrain?1:testCheckInterval);
}

async function initializeOnce() {

    setCustomManager(new CCustomManager());

    Globals.parsing = 0;

    ColorManagement.enabled = false;

// Check to see if we are running in a local environment
    checkLocal()

    await checkLogin();

    setNodeMan(new CNodeManager())
    setNodeFactory(new CNodeFactory(NodeMan))
    setSitchMan(new CSitchFactory())

    // Some metacode to find the node types and sitches (and common setup fragments)

    registerNodes();

// Get all the text based sitches from the server
// these are the sitches defined by <name>.sitch.js files inside the folder of the same name in data
    let textSitches = [];
    await fetch((SITREC_SERVER+"getsitches.php"), {mode: 'cors'}).then(response => response.text()).then(data => {
//        console.log("TEXT BASED Sitches: " + data)
//        console.log ("parsed data: ")
        textSitches = JSON.parse(data) // will give an array of text based sitches
//        console.log ("parse done");
    })

    registerSitches(textSitches);

    // Create the selectable sitches menu
// basically anything that is not hidden and has a menuName
    const unsortedSitches = {}
    SitchMan.iterate((key, sitch) =>{
        if (sitch.hidden !== true && sitch.menuName !== undefined
        && (isLocal || !sitch.localOnly)) {

            if (isLocal && sitch.include_kml)
                sitch.menuName = sitch.menuName + " (KML)"

            unsortedSitches[sitch.menuName] = key;
        }
    })

// Extract sitch keys (the lower case version of the name) and sort them
    const sortedKeys = Object.keys(unsortedSitches).sort();
// Create a new sorted object
    sortedKeys.forEach(key => {
        const sitchName = unsortedSitches[key];
        const sitch = SitchMan.get(sitchName);
        if (sitch.isTool)
            toolSitches[key] = sitchName;
        else
            selectableSitches[key] = sitchName;
        sortedSitches[key] = sitchName
    });
// Add the "Test All" option which smoke-tests all sitches
// and the "Test Here+" option (which does the same as test all, but starts at the current sitch)

    toolSitches["* Test All *"] = "testall";
    toolSitches["* Test Quick *"] = "testquick";
    toolSitches["* Test Here+ *"] = "testhere";

    console.log("SITREC START - Three.JS Revision = " + REVISION)

// Get the URL and extract parameters




///////////////////////////////////////////////////////////////////////
// But if it's local, we default to the local situation, defined in config.js
    if (isLocal) {
        situation = localSituation
//        console.log("LOCAL TEST MODE: " + situation + ", isLocal = " + isLocal)
    }

    // note in lil-gui.esm.js I changed
//   --name-width: 45%;
// to
//  --name-width: 36%;


    Globals.menuBar = new CGuiMenuBar();


    // these area accessed like:
    // guiMenus.main, guiMenus.showhide, guiMenus.tweaks, guiMenus.showhideviews, guiMenus.physics
    var _gui = addGUIMenu("main", "Sitrec").tooltip("Selecting legacy sitches and tools\nSome legacy sitches have controls here by default");
    addGUIMenu("file", "File").tooltip("File operations like saving,loading, and exporting");
    addGUIMenu("view", "View").tooltip("Miscellaneous view controls\nLike all menus, this menu can be dragged off the menu bar to make it a floating menu");
    addGUIMenu("time", "Time").tooltip("Time and frame controls\nDragging one time slider past the end will affect the above slider\nNote that the time sliders are UTC");
    addGUIMenu("objects", "Objects").tooltip("3D Objects and their properties\nEach folder is one object. The traverseObject is the object that traverses the lines of sight - i.e. the UAP we are interested in");
    addGUIMenu("terrain", "Terrain").tooltip("Terrain controls\nThe terrain is the 3D model of the ground. The 'Map' is the 2D image of the ground. The 'Elevation' is the height of the ground above sea level");
    // these four have legacy globals
    var _guiPhysics = addGUIMenu("physics", "Physics").tooltip("Physics controls\nThe physics of the situation, like wind speed and the physics of the traverse object");

    addGUIMenu("camera", "Camera").tooltip("Camera controls for the look view camera\nThe look view defaults to the lower right window, and is intended to match the video.");
    addGUIMenu("target", "Target").tooltip("Target controls\nPosition and properties of the optional target object");
    addGUIMenu("traverse", "Traverse").tooltip( "Traverse controls\nThe traverse object is the object that traverses the lines of sight - i.e. the UAP we are interested in\nThis menu defined how the traverse object moves and behaves");

    var _guiShowHide = addGUIMenu("showhide", "Show/Hide").tooltip("Showing or hiding views, object and other elements");
    var _guiShowHideViews = addGUIFolder("showhideviews", "Views", "showhide").tooltip("Show of hide views (windows) like the look view, the video, the main view, and various graphs");
    var _guiTweaks = addGUIMenu("effects", "Effects" ).tooltip("Special effects like blur, pixelation, and color adjustments that are applied to the final image in the look view");
    addGUIMenu("lighting", "Lighting").tooltip("The lighting of the scene, like the sun and the ambient light");
    addGUIMenu("contents", "Contents").tooltip("The contents of the scene, mostly used for tracks");

    addGUIMenu("help", "Help").tooltip("Links to the documentation and other help resources");


    function addHelpLink(name, file) {
        if (parseBoolean(process.env.LOCAL_DOCS) ) {
            return guiMenus.help.addExternalLink(name+ " (Local)", "./"+file+".html").perm();
        } else {
            return guiMenus.help.addExternalLink(name+ " (Github)", "https://github.com/MickWest/sitrec/blob/main/"+file+".md").perm();
        }
    }

    addHelpLink("Sitrec ReadMe", "README")
    addHelpLink("User Interface", "docs/UserInterface")
    addHelpLink("Custom Sitch Tool", "docs/CustomSitchTool")
    addHelpLink("Custom Models", "docs/CustomModels")

    if (configParams.extraHelpLinks !== undefined) {
        for (const [key, value] of Object.entries(configParams.extraHelpLinks)) {
            guiMenus.help.addExternalLink(key, value).perm();
        }
    }


    // legacy accessor variables. can also use guiMenus.physics, etc
    setupGUIGlobals(_gui,_guiShowHide,_guiTweaks, _guiShowHideViews, _guiPhysics)
    setUnits(new CUnits("Nautical"));
    setFileManager(new CFileManager())
    Globals.menuBar.infoGUI.title(process.env.BUILD_VERSION_STRING);

    const unselectedText = "-Select-";

    par.nameSelect = unselectedText;
    // Add the menu to select a situation
    _gui.add(par, "nameSelect", selectableSitches).name("Built-in Sitch").perm().onChange(sitch => {
        par.name = par.nameSelect;
        console.log("SITCH par.name CHANGE TO: "+sitch+" ->"+par.nameSelect)
        var url = SITREC_APP+"?sitch=" + sitch
        newSitch(sitch);
        window.history.pushState({}, null, url);
        par.nameSelect = unselectedText ;

    })
        .tooltip("Built-in sitches are predefined situations that often have unique code and assets. Select one to load it.");

    // and one for tools
    par.toolSelect = unselectedText;
    _gui.add(par, "toolSelect", toolSitches).name("Tools").perm().listen().onChange(sitch => {
        console.log("SITCH par.name CHANGE TO: "+sitch+" ->"+par.name)
        var url = SITREC_APP+"?sitch=" + sitch

// smoke test of everything after the current sitch in alphabetical order
        if (sitch === "testhere") {
            toTest = ""
            let skip = true;
            for (var key in sortedSitches) {
                if (skip) {
                    if (sortedSitches[key] === situation)
                        skip = false;
                } else {
                    //if (sortedSitches[key] !== "testall" && sortedSitches[key] !== "testquick" && sortedSitches[key] !== "testhere")
                    if (SitchMan.exists(sortedSitches[key]))
                        toTest += sortedSitches[key] + ",";
                }
            }
            toTest+=situation  // end up back where we started
            checkForTest();
        } else {
            newSitch(sitch);
        }

        // not loading the new sitch, so just change the URL of this page
        window.history.pushState({}, null, url);
        par.toolSelect = unselectedText;
    })
        .tooltip("Tools are special sitches that are used for custom setups like Starlink or with user tracks, and for testing, debugging, or other special purposes. Select one to load it.");






    // setup the common keyboard handler
    initKeyboard();


    function injectExtraCSS(cssContent) {
        const styleElement = document.createElement('style');
        styleElement.textContent = cssContent;
        document.head.append(styleElement);
    }



    // add a meta tag to make the page responsive
    // suggested as a fix for the font shrinking on Meta Quest
    // var meta = document.createElement('meta');
    // meta.name = 'viewport';
    // meta.content = 'width=device-width, initial-scale=1.0';
    // document.getElementsByTagName('head')[0].appendChild(meta);
    //



    // after the gui has been created it will have injected its styles into the head
    // so we can now add our own styles

    requestAnimationFrame(() => {
        // strip off any C++ style comments.
        const stripped = stripComments(extraCSS)
        injectExtraCSS(stripped);
    })

}

function initRendering() {
    // create a single div that contains everything
    container = document.createElement('div');
    document.body.append(container)


    console.log("Window inner size = " + window.innerWidth + "," + window.innerHeight)

    setInfoDiv(document.createElement('div'))

    //give it a name so we can find it in the DOM
    infoDiv.id = "infoDiv";

    infoDiv.style.position = 'absolute';
    infoDiv.style.width = 100;
    infoDiv.style.height = 100;
    infoDiv.style.color = "white";
    infoDiv.innerHTML = "Loading";
    infoDiv.style.top = 40 + 'px';
    infoDiv.style.left = 20 + 'px';
    infoDiv.style.fontSize = 20 + 'px';
    infoDiv.style.display = 'none';
    // 5 px border
    infoDiv.style.padding = 5 + 'px';
   // if (isLocal) {
        infoDiv.style.display = 'block';
        infoDiv.style.zIndex = 4000; // behind the gui menus, but in front of everything else
   // }
    infoDiv.style.background="black";
    $(infoDiv).draggable();
    document.body.appendChild(infoDiv);


    // attept to create a renderer to catch issues early and do a graceful exit
    try {
        const renderer = new WebGLRenderer({});
        renderer.dispose();
    } catch (e) {
        console.error("Incompatible Browser or Graphics Acceleration Disabled\n Error creating WebGLRenderer: "+e)
        // show an alert
        alert("Incompatible Browser or Graphics Acceleration Disabled\n Error creating WebGLRenderer:\n "+e)


        return false;
    }


    setupScene(new Scene())
    setupLocalFrame(new Group())

    GlobalScene.add(LocalFrame)

    disableScroll()
    SetupMouseHandler();
    window.addEventListener( 'resize', windowChanged, false );

    return true;
}

// some sitch specific stuff that needs to be done before the main setup
function legacySetup() {
    var _guiJetTweaks;
    if (Sit.jetStuff) {
        _guiJetTweaks = guiTweaks.addFolder('Jet Tweaks').close();
    }
    setupGUIjetTweaks(_guiJetTweaks)
    // guiTweaks.add(par,"effects")

///////////////////////////////////////////////////////////////////////////////////////
// At this point Sit is set up.
// setup common nodes and other things that get set up when a sitch is loaded

    setGlobalDateTimeNode(new CNodeDateTime({
        id:"dateTimeStart",
    }))

    SetupFrameSlider(); // this is the slider and buttons for frame control


//    NodeFactory.create("Sunlight", {id: "sunlight"})

    setNullNode(new CNode({id: "null"}))

// check if Sit.name is all lower case
    assert(Sit.name.slice().toLowerCase() === Sit.name, "Sit.name ("+Sit.name+") is not all lower case")


    var newTitle = "Sitrec "+Sit.name

    if (document.title !== newTitle) {
        document.title = newTitle;
    }
}

async function setupFunctions() {
    resetPar();


    // just setting visibility of the Save/Load menu items
    FileManager.sitchChanged();

    // not sure this is the best place to do this......
    // but resetPar has just set par.paused to false
    // so no earlier.
    par.paused = Sit.paused;

    Globals.showMeasurements = true;


// Parse the URL parameters, if any
// setting up stuff like the local coordinate system
// this will override things like Sit.lat and Sit.lon

// bit of a patch
// if we are going to load a starlink file (i.e. id = starLink - note capitalization)
//  check the flag rhs, which is set to rhs: FileManager.rehostedStarlink,
//  if it's set, then delete the starLink from Sit.files
    var urlData
    if (urlParams.get("data")) {
        urlData = urlParams.get("data")
        var urlObject = JSURL.parse(urlData)
        if (urlObject.rhs && (Sit.files.starLink !== undefined)) {
            delete Sit.files.starLink
            FileManager.rehostedStarlink = true;
            console.log("Deleted starLink from sit, as urlObject.rhs = "+urlObject.rhs)
        }

        if (Sit.parseURLDataBeforeSetup) {
            // currently only used by SitNightSky, and only slightly, to setup Sit.lat/lon from olat/olon URL parameters
            Sit.parseURLDataBeforeSetup(urlData)
        }
    }

// Start loading the assets in Sit.files, and wait for them to load

//    console.log("START Load Assets")
    const assetsLoading = Sit.loadAssets();
//    console.log("WAIT Load Assets")
    await assetsLoading;
//    console.log("START load inline assets")
    await startLoadingInlineAssets(Sit)

    console.log("FINISHED Load Assets")

    // parsing can be async, so we need to wait for it to complete
    // before we do setup
    await waitForParsingToComplete();

    setupMeasurementUI(); // bit of an odd one - setting up the measurement measure ment grounp and UI

//
// Now that the assets are loaded, we can setup the situation
// First we do the data-driven stuff by expanding and then parsing the Sit object
    console.log("SituationSetup()")
    await SituationSetup(false);

// jetStuff is set in Gimbal, GoFast, Agua, and FLIR1
    if (Sit.jetStuff) {
        initJetVariables();
        initJetStuff()
    }


    if (Sit.isCustom || Sit.canMod) {
        CustomManager.setup()
    }

// Each sitch can have a setup() and setup2() function
// however only Gimbal actually used setup2() as gimbal and gimabalfar have different setup2() functions

    if (Sit.setup  !== undefined) Sit.setup();
    if (Sit.setup2 !== undefined) Sit.setup2();
    // we are allowing more, see SitFAA2023
    if (Sit.setup3 !== undefined) Sit.setup3();

// Redo the data-driven setup, but this is for any deferred setup
// i.e data members that have defer: true
    await SituationSetup(true);

// We can get the local lat/lon (i.e. the user's location)
// get only get the local lat/lon if we don't have URL data and if we are not testing
    if (!testing && Sit.localLatLon && urlData === undefined && !isLocal) {
        await requestGeoLocation()
    }

//    console.log("Finalizing....")

    GlobalDateTimeNode.populateStartTimeFromUTCString(Sit.startTime)

    if (Sit.jetStuff) {
        // only gimbal
        // minor patch, defer setting up the ATFLIR UI, as it references the altitude
        initJetStuffOverlays()
        console.log("CommonJetStuff()")
        CommonJetStuff();
    }


    if (Sit.useGlobe) {
//        console.log("addAlignedGlobe()")

        // if a globe scale is set, then use that
        // otherwise, if terrain is set, then use 0.9999 (to avoid z-fighting)
        // otherwise use 1.0, so we get a perfect match with collisions.
        par.globe = addAlignedGlobe(Sit.globeScale ?? (Sit.terrain !== undefined ? 0.9999 : 1.0))
        showHider(par.globe,"[G]lobe", true, "g")
    }

// Finally move the camera and reset the start time, if defined in the URL parameters
    if (urlParams.get("data")) {
        urlData = urlParams.get("data")
        if (Sit.parseURLDataAfterSetup) {
            Sit.parseURLDataAfterSetup(urlData)
        }
    }



// now everything that is normally done is done, we can do any custom stuff that's included
// i.e. load files, apply mods, etc.
        CustomManager.deserialize(Sit);


///////////////////////////////////////////////////////////////////////////////////////////////
}

function startAnimating(fps) {
    fpsInterval = 1000 / fps ;           // e.g. 1000/30 = 33.333333
    then = window.performance.now();    //
    startTime = then;
    console.log("STARTUP TIME = " + startTime/1000);
    animate();
}


function animate(newtime) {
    // Method of setting frame rate, from:
    // http://jsfiddle.net/chicagogrooves/nRpVD/2/
    // uses the sub-ms resolution timer window.performance.now() (a double)
    // and does nothing if the time has not elapsed
    // requestAnimationFrame( animate );

    Globals.stats.begin();
   // infoDiv.innerHTML = "";

    now = newtime;
    elapsed = now - then;

    // note te user can change Sit.fps (for example, if they are unsure of the framerate of the video)
    fpsInterval = 1000 / Sit.fps;

    // if enough time has elapsed, draw the next frame
    if (elapsed > fpsInterval) {

        // Get ready for next frame by setting then=now, but...
        // Also, adjust for fpsInterval not being multiple of 16.67
        then = now - (elapsed % fpsInterval);
        // draw stuff here
        renderMain(elapsed)
    } else {
        // It is not yet time for a new frame
        // so just render - which will allow smooth 60 fps motion moving the camera
       // const oldPaused = par.paused
        //par.paused = true;
        par.noLogic = true;
        renderMain(elapsed);
        par.noLogic = false;
        //par.paused = oldPaused;
    }
    Globals.stats.end();
    animationFrameId = requestAnimationFrame( animate );

}

function windowChanged() {
    updateSize();
}



function renderMain(elapsed) {

    incrementMainLoopCount();


    if (Sit.animated) {
        var lastFrame = par.frame
        updateFrame(elapsed)
        if (lastFrame !== par.frame)
            par.renderOne = true;
    }

    // frame number forced by URL parameter
    if (Globals.fixedFrame !== undefined) {
        par.frame = Globals.fixedFrame;
        GlobalDateTimeNode.update(Globals.fixedFrame);
        par.paused = true;
        par.renderOne = true;
    }


    DragDropHandler.checkDropQueue();

    if (par.paused && !par.renderOne && !par.noLogic) return;

//    console.log(par.renderOne)

    // par.renderOne is a flag set whenever something is done that forces an update.
    //par.renderOne = false;
    if (par.renderOne === true) {
        par.renderOne = 1;
    }
    // allow it to be a number if we want to force more than one frame render
    if (par.renderOne > 0) {
//        console.log("Render One = "+par.renderOne)
        par.renderOne--;
    }

    Globals.menuBar.updateListeners();

    if (Sit.updateFunction) {
        Sit.updateFunction(par.frame)
    }

    if (Sit.update) {
        Sit.update(par.frame)
    }

    if (Sit.isCustom) {
        CustomManager.update()
    }

    NodeMan.iterate((key, node) => {
        if (node.update !== undefined) {
            node.update(par.frame)
        }

        // debug_v should not be used in production
        if (node.debug_v !== undefined) {
            node.debug_v()
        }

    })


    windowChanged();

    if (Sit.jetStuff && Sit.showGlare) {
        if (glareSprite) {
            glareSprite.position.set(targetSphere.position.x, targetSphere.position.y, targetSphere.position.z)

            if (!glareSprite.visible)
                targetSphere.layers.enable(LAYER.podsEye)
            else
                targetSphere.layers.disable(LAYER.podsEye)
        }
    }

    // render each viewport
    ViewMan.iterate((key, view) => {

        // if this is an overlay view, then inherit the "visible" flag from the parent view (this this view overlays)
        if (view.overlayView && !view.seperateVisibilty) {
            view.setVisible(view.overlayView.visible);
        }

        if (view.visible) {

            // we set from div, as that's the jQueryUI moving arond
            // which we really should get rid of, and just do it directly with mouse events
            // dragging, etc.
            view.setFromDiv(view.div)

            view.updateWH()
            if (view.camera) {
                view.camera.updateMatrix();
                view.camera.updateMatrixWorld();
                // Label3DMan.updateScale(view.camera)
                // some nodes need code running on a per-viewport basis - like textSprites
                NodeMan.iterate((id, node) => {
                    if (node.preViewportUpdate !== undefined) {
                        node.preViewportUpdate(view)
                    }
                })

                // patch in arrow head scaling
                scaleArrows(view);

            }
            updateLockTrack(view, par.frame)
            view.renderCanvas(par.frame)
        }
    })

}

function selectInitialSitch(force) {

    if (force) {
        situation = force;
    } else {




        if (urlParams.get("test")) {
            // get the list of situations to test
            toTest = urlParams.get("test")
            testing = true;
        }

// A smoke test of all situations, so we generate the list
// which then gets passed as a URL, as above.
        if (urlParams.get("testAll")) {
            toTest = ""
            for (const key in sortedSitches) {
             //   if (sortedSitches[key] !== "testall" && sortedSitches[key] !== "testquick" && sortedSitches[key] !== "testhere")
                if (SitchMan.exists(sortedSitches[key]));
                    toTest += sortedSitches[key] + ",";
            }
            toTest += localSituation; // end up with the current situation being tested
            testing = true;

            console.log(urlParams.get("testAll"));
            const testType = urlParams.get("testAll")
            if (testType === "2")
                Globals.quickTerrain = true;

        }

// toTest is a comma separated list of situations to test
// if it is set, we will test the first one, then the rest
// will be tested in order.
        if (toTest !== undefined) {
            var testArray = toTest.split(',');
            situation = testArray.shift() // remove the first (gimbal)
            toTest = testArray.join(",")
            console.log("Testing " + situation + ", will text next: " + toTest)
        }

// Either "sit" (deprecated) or "sitch" can be used to specify a situation in the url params
        if (urlParams.get("sit")) {
            situation = urlParams.get("sit")
        }
        if (urlParams.get("sitch")) {
            situation = urlParams.get("sitch")
        }
    }

// situation is a global variable that is used to determine which situation to load
// It's a string, and it's case insensitive.
// We use the lower case version of the string to determine which situation to load
// and the original string to display in the GUI.
// This allows for variants like FLIR1/Tictac
// to test for a particular situation, use Sit.name
// slice
    var lower = situation.slice().toLowerCase();

    if (lower === "testall") {
        const url = SITREC_APP + "?testAll=1"
        window.location.assign(url)
    }
    if (lower === "testquick") {
        const url = SITREC_APP + "?testAll=2"
        window.location.assign(url)
    }

    par.name = lower;

    let startSitch = SitchMan.findFirstData(s => {return lower === s.data.name;})
    assert(startSitch !== null, "Can't find startup Sitch: "+lower)

    console.log("");
    console.log("NEW Situation = "+situation)
    console.log("");

    setSit(new CSituation(startSitch))
}

async function requestGeoLocation() {
    console.log("Requesting geolocation... Situation = " + Sit.name);

    let watchID = null; // Variable to store the watch ID

    Globals.geolocationPromise = new Promise((resolve, reject) => {
        // Use watchPosition instead of getCurrentPosition
        watchID = navigator.geolocation.watchPosition((position) => {

            // Check if local lat/lon is enabled in this situation
            // if not, then this is a patch, to avoid the situation where the user
            // changes sitches before the geolocation is obtained
            // I've tried to cancel it, but it's not working
            if (!Sit.localLatLon) {
                console.warn("Local lat/lon not enabled in this situation. Aborting geolocation.");
                // Clear the watch to stop receiving updates after the first position is obtained
                if (watchID !== null) {
                    navigator.geolocation.clearWatch(watchID);
                    watchID = null;
                }
                resolve(); // Resolve to continue with defaults
                return;
            }

            // a more serious patch, to avoid the situation where the user
            // this seems unlikely to happen, but I've escalated it to an error
            if (!NodeMan.exists("cameraLat")) {
                console.error("cameraLat node not found. Aborting geolocation.");
                // Clear the watch to stop receiving updates after the first position is obtained
                if (watchID !== null) {
                    navigator.geolocation.clearWatch(watchID);
                    watchID = null;
                }
                resolve(); // Resolve to continue with defaults
                return;
            }

            // Successfully obtained the position
            let lat = position.coords.latitude;
            let long = position.coords.longitude;

            Sit.lat = parseFloat(lat.toFixed(2));
            Sit.lon = parseFloat(long.toFixed(2));
            Sit.fromLat = Sit.lat;
            Sit.fromLon = Sit.lon;

            console.log("RESOLVED Local Lat, Lon =", Sit.lat, Sit.lon, " situation = " + Sit.name);

            NodeMan.get("cameraLat").value = Sit.lat;
            NodeMan.get("cameraLon").value = Sit.lon;

            // Clear the watch to stop receiving updates after the first position is obtained
            if (watchID !== null) {
                navigator.geolocation.clearWatch(watchID);
                watchID = null;
            }

            resolve(); // Resolve the promise when geolocation is obtained
        }, (error) => {
            // Handle errors
            console.log("Location request failed");
            resolve(); // Resolve to continue with defaults
            // If you wish to reject the promise on error, use reject(error); but ensure to handle the rejection where requestGeoLocation is called
        });
        console.log("Geolocation watch ID:", watchID);
    });

    // Return the promise so calling code can await it or handle completion/failure
    return Globals.geolocationPromise;
}

// To allow cancellation, you can expose a function to clear the watch from outside
function cancelGeoLocationRequest() {
    if (typeof Globals.geolocationWatchID === 'number') {
        console.log("Cancelling geolocation request.");
        navigator.geolocation.clearWatch(Globals.geolocationWatchID);
        Globals.geolocationWatchID = null;
    }
}


function disposeEverything() {
    console.log("");
    console.log(" >>>>>>>>>>>>>>>>>>>>>>>> disposeEverything() <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
    console.log("");

    // cancel any requested animation frames
    cancelAnimationFrame(animationFrameId);

    // cancel any pending geolocation requests
    cancelGeoLocationRequest();

    // Remove all event listeners
    EventManager.removeAll();

    // specific to the gimbal chart, but no harm in calling it here in case it gets used in other situations
    disposeGimbalChart();

    // stop loading terrain
    imageQueueManager.dispose();

    // The measurement UI is a group node that holds all the measurement arrows
    // it's created as needed, but will get destroyed with the scene
    // so we need to make sure it knows it's been destroyed
    removeMeasurementUI();


    // dispose the track manager managed nodes
    TrackManager.disposeAll();

    // delete all the nodes (which should remove their GUI elements, but might not have implement that all. CNodeSwitch destroys)
    NodeMan.disposeAll();


    // dispose of any remaining GUI, except for the permanent folders and items
    Globals.menuBar.destroy(false);

    disposeDebugArrows();
    disposeDebugSpheres();

    console.log("GlobalScene originally has " + GlobalScene.children.length + " children");
    disposeScene(GlobalScene)
    console.log("GlobalScene now (after dispose) has " + GlobalScene.children.length + " children");
    if (GlobalNightSkyScene !== undefined) {
        disposeScene(GlobalNightSkyScene)
        setupNightSkyScene(undefined)
    }
    if (GlobalDaySkyScene !== undefined) {
        disposeScene(GlobalDaySkyScene)
        setupDaySkyScene(undefined)
    }

    // dispose of the renderers attached to the views
    ViewMan.iterate((key, view) => {
        view.renderer.renderLists.dispose();
    });

    // add the local frame back to the global scene
    GlobalScene.add(LocalFrame)

    // unload all assets - which we might not want to do if jsut restarting
    FileManager.disposeAll()

    // what about the terrain? that should be removed by the terrain node....

   // ViewMan.disposeAll()
    assert(ViewMan.size() === 0, "ViewMan.size() should be zero, it's " + ViewMan.size());
    console.log("disposeEverything() is finished");
    console.log("");
}

/**
 * Waits until all terrain images are loaded.
 * same as above, maybe refactor at some point
 * except this is a flag, and that is a counter
 * but a truthy test works for both
 */
async function waitForTerrainToLoad() {
    console.log("Waiting for terrain loading to complete... Globals.loadingTerrain = " + Globals.loadingTerrain);
    // Use a Promise to wait
    await new Promise((resolve, reject) => {
        // Function to check the value of Globals.parsing
        function checkloadingTerrain() {
            if (!Globals.loadingTerrain) {
                console.log("DONE: Globals.loadingTerrain = " + Globals.loadingTerrain)
                resolve(); // Resolve the promise if Globals.parsing is 0 (or false)
            } else {
                // If not 0, wait a bit and then check again
                setTimeout(checkloadingTerrain, 100); // Check every 100ms, adjust as needed
                console.log("Still Checking, Globals.loadingTerrain = " + Globals.loadingTerrain)
            }
        }

        // Start checking
        checkloadingTerrain();
    });
    console.log("loadingTerrain complete!");
}

