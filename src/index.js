import {Group, REVISION, Scene,} from "../three.js/build/three.module.js";
import "./js/uPlot/uPlot.css"
import "./extra.css"
import "./js/jquery-ui-1.13.2/jquery-ui.css"
import "./js/jquery-ui-1.13.2/jquery-ui.js?v=1"
import {
    FileManager,
    GlobalDateTimeNode, Globals,
    gui,
    guiTweaks,
    incrementMainLoopCount,
    infoDiv,
    NodeMan, setFileManager,
    setGlobalDateTimeNode,
    setGlobalURLParams,
    setInfoDiv, setNewSitchText,
    setNodeMan, setNullNode,
    setSit,
    setSitchMan,
    setUnits,
    setupGUIGlobals, setupGUIjetTweaks,
    Sit,
    SitchMan,
} from "./Globals";
import {disableScroll, sleep} from './utils.js'
import {ViewMan} from './nodes/CNodeView.js'
import {CSituation} from "./CSituation";
import {par, resetPar} from "./par";

import * as LAYER from "./LayerMasks.js"
import {SetupFrameSlider} from "./FrameSlider";
import {registerNodes} from "./RegisterNodes";
import {registerSitches, textSitchToObject} from "./RegisterSitches";
import {SetupMouseHandler} from "./mouseMoveView";
import {initKeyboard, showHider} from "./KeyBoardHandler";
import {
    CommonJetStuff,
    Frame2Az,
    glareSprite,
    initJetStuff,
    initJetStuffOverlays,
    initJetVariables,
    targetSphere,
    updateSize
} from "./JetStuff";
import {
    GlobalNightSkyScene,
    GlobalScene,
    LocalFrame,
    setupLocalFrame,
    setupNightSkyScene,
    setupScene
} from "./LocalFrame";
import {CNodeFactory} from "./nodes/CNodeFactory";
import {GUI} from "./js/lil-gui.esm";
import {CSitchFactory} from "./CSitchFactory";
import {assert} from "./utils"
import {CNodeDateTime} from "./nodes/CNodeDateTime";
import {addAlignedGlobe} from "./Globe";
import JSURL from "./js/jsurl";
import {checkLocal, isLocal, localSituation, SITREC_ROOT, SITREC_SERVER} from "../config";

import {SituationSetup, startLoadingInlineAssets} from "./SituationSetup";
import {CUnits} from "./CUnits";
import {updateLockTrack} from "./updateLockTrack";
import {updateFrame} from "./updateFrame";
import {checkLogin} from "./login";
import {CFileManager} from "./CFileManager";
import {disposeDebugArrows, disposeDebugSpheres, disposeScene, scaleArrows} from "./threeExt";
import {removeMeasurementUI} from "./nodes/CNodeLabels3D";
import {imageQueueManager} from "./js/get-pixels-mick";
import {disposeGimbalChart} from "./JetChart";
import {CNodeMath} from "./nodes/CNodeMath";
import {CNode, CNodeConstant} from "./nodes/CNode";
import {DragDropHandler} from "./DragDropHandler";
import {CustomManager} from "./CustomSupport";
import {preventDoubleClicks} from "./lil-gui-extras";

// This is the main entry point for the sitrec web application
// However note that the imports above might have code that is executed
// before this code is executed.
// Building sitrec as a console application uses indexCommon instead.

// We default to nightsky on the public version
// as it's now the most popular usage.
let situation = "nightsky";

// Some (essentially) global variables
let urlParams;
const selectableSitches = {};
let toTest;
let testing = false;
let container;
var fpsInterval, startTime, now, then, elapsed;

let animationFrameId;

resetPar();
await initializeOnce();
initRendering();


if (urlParams.get("custom")) {
    const customSitch = urlParams.get("custom")
    // customSitch is the URL of a sitch definition file
    // fetch it, and then use that as the sitch
    await fetch(customSitch, {mode: 'cors'}).then(response => response.text()).then(data => {
        console.log("Custom sitch = "+customSitch)
        console.log("Result = "+data)

        const sitchObject = textSitchToObject(data);
        par.name = "CUSTOM";
        setSit(new CSituation(sitchObject))


    });
} else {
    selectInitialSitch();
}
legacySetup();
await setupFunctions();


// Problem. The sitches are defined from data structures which contain parameters that get passed to variosu setup functions
// however, once we call them, the parameters get added to - especially when we need some defaults
// so, for example, the ptz object has no ID, so it gets and id of "lookCameraPTZ" in SituationSetup
//
// Solution
// 1 - make a deep clone of the sitch object, and pass that to the setup functions




//  testing = true;
// // SitchMan.iterate((key, sitch) =>{
// for (let key in selectableSitches) {
//     if (selectableSitches[key] === "testall" || selectableSitches[key] === "testhere")
//         continue;
//
//     let situation = selectableSitches[key]
//     console.log("Change sitch to "+situation);
//
//     cancelAnimationFrame(animate);
//     await waitForParsingToComplete();
//
//     disposeEverything();
// // // theoretically we should new be able to do the above again....
//     selectInitialSitch(situation);
//     legacySetup();
//     await setupFunctions();
//
//     // render one frame
//     //renderMain();
//
//     // render five frames
//     for (let i = 0; i < 5; i++) {
//         updateFrame();
//         renderMain();
//
//     }
//
// }
// testing = false;

console.log("animate")
//animate(true); // Passing in true for ForceRender to render even if the windows does not have focus, like with live.js
windowChanged()

infoDiv.innerHTML = ""
startAnimating(Sit.fps);

// if testing, then wait 3.5 seconds, and then load the next test URL

setTimeout( checkForTest, 3500);
setTimeout( checkForNewSitchText, 500);

// **************************************************************************************************
// *********** That's it for top-level code. Functions follow ***************************************
// **************************************************************************************************

function checkForTest() {
    console.log("Testing = " + testing + " toTest = " + toTest)
    if (toTest != undefined && toTest != "") {
//        var url = SITREC_ROOT + "?test=" + toTest
//        window.location.assign(url)

        var testArray = toTest.split(',');
        situation = testArray.shift() // remove the first (gimbal)
        toTest = testArray.join(",")
        console.log("Testing " + situation + ", will text next: " + toTest)


        newSitch(situation)
        setTimeout( checkForTest, 3500);

    } else {
        testing = false;
    }
}

Globals.newSitchText = undefined;

function checkForNewSitchText() {
    if (Globals.newSitchText !== undefined) {
        console.log("New Sitch Text = " + Globals.newSitchText)
        newSitch(Globals.newSitchText, true);
        Globals.newSitchText = undefined;
    }
    setTimeout( checkForNewSitchText, 500);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function newSitch(situation, customSetup = false ) {

    var url = SITREC_ROOT+"?sitch=" + situation
    window.history.pushState({}, null, url);


    cancelAnimationFrame(animate);
    await waitForParsingToComplete();
    disposeEverything();
    if (!customSetup) {
        // if it's not custom, then "situation" is a name of a default sitch
        selectInitialSitch(situation);
    } else {
        // if it's custom, then "situation" is a sitch data file
        // i.e. the text of a text based sitch
        par.name = "CUSTOM";
        setSit(new CSituation(situation))
    }
    legacySetup();
    await setupFunctions();
    startAnimating(Sit.fps);
}

async function initializeOnce() {

    Globals.parsing = 0;

// Check to see if we are running in a local environment
    checkLocal()

    await checkLogin();

    setNodeMan(new CNodeFactory())
    setSitchMan(new CSitchFactory())

    // Some metacode to find the node types and sitches (and common setup fragments)

    registerNodes();






    // const test1 = new CNodeMath({
    //     id: "test1",
    //     inputs: {a: 5, b: 6},
    //     math: "a+b",
    // })
    //
    // console.log("TESTING CNodeMath")
    // console.log("TESTING CNodeMath")
    // console.log(test1.getValueFrame(0)) // 11

    new CNodeConstant({id: "nodeA", value: 5})
    new CNodeConstant({id: "nodeB", value: 17})

    const test2 = new CNodeMath({
        math: `X = $nodeA;
                // comment line
               Y = X + $nodeB + 100; // something
               Z = X + Y;
               Z * 100;
               `,
    })
    console.log(test2.getValueFrame(0)) // 11

// Get all the text based sitches from the server
// these are the sitches defined by <name>.sitch.js files inside the folder of the same name in data
    let textSitches = [];
    await fetch((SITREC_SERVER+"getsitches.php"), {mode: 'cors'}).then(response => response.text()).then(data => {
//        console.log("TEXT BASED Sitches: " + data)
//        console.log ("parsed data: ")
        textSitches = JSON.parse(data) // will give an array of text based sitches
        console.log ("parse done");
    })

    registerSitches(textSitches);

    // Create the selectable sitches menu
// basically anything that is not hidden and has a menuName
    const selectableSitchesUnsorted = {}
    SitchMan.iterate((key, sitch) =>{
        if (sitch.hidden !== true && sitch.menuName !== undefined ) {

            if (isLocal && sitch.isSitKML)
                sitch.menuName = sitch.menuName + " (KML)"

            selectableSitchesUnsorted[sitch.menuName] = key;
        }
    })
// Extract sitch keys (the lower case version of the name) and sort them
    const sortedKeys = Object.keys(selectableSitchesUnsorted).sort();
// Create a new sorted object
    sortedKeys.forEach(key => {
        selectableSitches[key] = selectableSitchesUnsorted[key];
    });
// Add the "Test All" option which smoke-tests all sitches
// and the "Test Here+" option (which does the same as test all, but starts at the current sitch)

    selectableSitches["* Test All *"] = "testall";
    selectableSitches["* Test Here+ *"] = "testhere";

    console.log("SITREC START - Three.JS Revision = " + REVISION)

// Get the URL and extract parameters
    const queryString = window.location.search;
    console.log(">"+queryString);
    urlParams = new URLSearchParams(queryString);
    setGlobalURLParams(urlParams)



///////////////////////////////////////////////////////////////////////
// But if it's local, we default to the local situation, defined in config.js
    if (isLocal) {
        situation = localSituation
        console.log("LOCAL TEST MODE: " + situation + "\n")
    }

    // note in lil-gui.esm.js I changed
//   --name-width: 45%;
// to
//  --name-width: 36%;
    var _gui = new GUI().perm()
    preventDoubleClicks(_gui);

    var _guiShowHide = _gui.addFolder('Show/Hide').close().perm();
    var _guiTweaks = _gui.addFolder('Tweaks').close().perm();


    setupGUIGlobals(_gui,_guiShowHide,_guiTweaks)
    setUnits(new CUnits("Nautical"));
    setFileManager(new CFileManager())


    // Add the menu to select a situation
// The onChange function will change the url to the new situation
// which will cause the page to reload with the new situation
// selectableSitches is defined in situations.js
    _gui.add(par, "name", selectableSitches).name("Sitch").perm().listen().onChange(sitch => {
        console.log("SITCH par.name CHANGE TO: "+sitch+" ->"+par.name)
        var url = SITREC_ROOT+"?sitch=" + sitch

        let nextSitch = sitch;

// smoke test of everything after the current sitch
        if (sitch === "testhere") {
            toTest = ""
            let skip = true;
            for (var key in selectableSitches) {
                if (skip) {
                    if (selectableSitches[key] === situation)
                        skip = false;
                } else {
                    if (selectableSitches[key] !== "testall" && selectableSitches[key] !== "testhere")
                        toTest += selectableSitches[key] + ",";
                }
            }
            toTest+=situation  // end up back where we started
            checkForTest();
          //  url = SITREC_ROOT + "?test="+toTest;
        } else {
            newSitch(nextSitch);
        }

        // not loading the new sitch, so just change the URL of this page
        window.history.pushState({}, null, url);

        //window.location.assign(url) //
    })

    // setup the common keyboard handler
    initKeyboard();

}

function initRendering() {
    // create a single div that contains everything
    container = document.createElement('div');
    document.body.append(container)

    SetupFrameSlider();

    console.log("Window inner size = " + window.innerWidth + "," + window.innerHeight)

    setInfoDiv(document.createElement('div'))

    infoDiv.style.position = 'absolute';
    infoDiv.style.width = 100;
    infoDiv.style.height = 100;
    infoDiv.style.color = "white";
    infoDiv.innerHTML = "Loading";
    infoDiv.style.top = 20 + 'px';
    infoDiv.style.left = 20 + 'px';
    infoDiv.style.display = 'block';
    document.body.appendChild(infoDiv);

    setupScene(new Scene())
    setupLocalFrame(new Group())

    GlobalScene.add(LocalFrame)

    disableScroll()
    SetupMouseHandler();
    window.addEventListener( 'resize', windowChanged, false );

}

// some sitch specific stuff that needs to be done before the main setup
function legacySetup() {
    var _guiJetTweaks;
    if (Sit.jetStuff) {
        _guiJetTweaks = guiTweaks.addFolder('Jet Tweaks').close();
    }
    setupGUIjetTweaks(_guiJetTweaks)
    guiTweaks.add(par,"effects")

///////////////////////////////////////////////////////////////////////////////////////
// At this point Sit is set up.

    setGlobalDateTimeNode(new CNodeDateTime({
        id:"dateTimeStart",
    }))

    setNullNode(new CNode({id: "null"}))

// check if Sit.name is all lower case
    assert(Sit.name.slice().toLowerCase() === Sit.name, "Sit.name ("+Sit.name+") is not all lower case")

//gui.title("Sitrec "+Sit.name+" - [U]I")
    gui.title(process.env.BUILD_VERSION_STRING);

    var newTitle = "Sitrec "+Sit.name

    if (document.title !== newTitle) {
        document.title = newTitle;
    }
}

async function setupFunctions() {
    resetPar();

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

    console.log("START Load Assets")
    const assetsLoading = Sit.loadAssets();
    console.log("WAIT Load Assets")
    await assetsLoading;
    console.log("START load inline assets")
    await startLoadingInlineAssets(Sit)

    console.log("FINISHED Load Assets")



//
// Now that the assets are loaded, we can setup the situation
// First we do the data-driven stuff by expanding and then parsing the Sit object
    console.log("SituationSetup()")
    SituationSetup(false);

// jetStuff is set in Gimbal, GoFast, Agua, and FLIR1
    if (Sit.jetStuff) {
        initJetVariables();
        initJetStuff()
    }


    if (Sit.isCustom) {
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
    SituationSetup(true);

// We can get the local lat/lon (i.e. the user's location)
// get only get the local lat/lon if we don't have URL data and if we are not testing
    if (!testing && Sit.localLatLon && urlData === undefined) {
        await requestGeoLocation()
    }

    console.log("Finalizing....")

    GlobalDateTimeNode.populateStartTimeFromUTCString(Sit.startTime)

    if (Sit.jetStuff) {
        // only gimbal
        // minor patch, defer setting up the ATFLIR UI, as it references the altitude
        initJetStuffOverlays()
        console.log("CommonJetStuff()")
        CommonJetStuff();
    }


    if (Sit.useGlobe) {
        console.log("addAlignedGlobe()")

        // if a globe scale is set, then use that
        // otherwise, if terrain is set, then use 0.9999 (to avoid z-fighting)
        // otherwise use 1.0, so we get a perfect match with collisions.
        Sit.globe = addAlignedGlobe(Sit.globeScale ?? (Sit.terrain !== undefined ? 0.9999 : 1.0))
        showHider(Sit.globe,"[G]lobe", true, "g")
    }

    // if (Sit.nightSky) {
    //     console.log("addNightSky()")
    //     addNightSky()
    // }

// Finally move the camera and reset the start time, if defined in the URL parameters
    if (urlParams.get("data")) {
        urlData = urlParams.get("data")
        if (Sit.parseURLDataAfterSetup) {
            Sit.parseURLDataAfterSetup(urlData)
        }
    }
///////////////////////////////////////////////////////////////////////////////////////////////
}

function startAnimating(fps) {
    fpsInterval = 1000 / fps ;           // e.g. 1000/30 = 33.333333
    then = window.performance.now();    //
    startTime = then;
    console.log("Startup time = " + startTime/1000);
    animate();
}


function animate(newtime) {
    // Method of setting frame rate, from:
    // http://jsfiddle.net/chicagogrooves/nRpVD/2/
    // uses the sub-ms resolution timer window.performance.now() (a double)
    // and does nothing if the time has not elapsed
    // requestAnimationFrame( animate );

    now = newtime;
    elapsed = now - then;

    // if enough time has elapsed, draw the next frame
    if (elapsed > fpsInterval) {

        // Get ready for next frame by setting then=now, but...
        // Also, adjust for fpsInterval not being multiple of 16.67
        then = now - (elapsed % fpsInterval);
        // draw stuff here
        renderMain()
    } else {
        // It is not yet time for a new frame
        // so just render - which will allow smooth 60 fps motion moving the camera
       // const oldPaused = par.paused
        //par.paused = true;
        par.noLogic = true;
        renderMain();
        par.noLogic = false;
        //par.paused = oldPaused;
    }
    animationFrameId = requestAnimationFrame( animate );

}

function windowChanged() {
    updateSize();
}

function renderMain() {

    incrementMainLoopCount();


    if (Sit.animated) {
        var lastFrame = par.frame
        updateFrame()
        if (lastFrame !== par.frame)
            par.renderOne = true;
    }

    DragDropHandler.checkDropQueue();

    if (par.paused && !par.renderOne  && !par.noLogic) return;

    // par.renderOne is a flag set whenever something is done that forces an update.
    par.renderOne = false;

    gui.updateListeners();

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
        if (view.visible) {
            view.setFromDiv(view.div)
            view.updateWH()
            if (view.camera) {
                // Label3DMan.updateScale(view.camera)
                // some nodes need code running on a per-viewport basis - like textSprites
                NodeMan.iterate((id, node) => {
                    if (node.preViewportUpdate !== undefined) {
                        node.preViewportUpdate(view)
                    }
                })

                // patch in arrow head scaling
                scaleArrows(view.camera);

            }
            updateLockTrack(view, par.frame)
            view.render(par.frame)
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
            for (const key in selectableSitches) {
                if (selectableSitches[key] !== "testall" && selectableSitches[key] !== "testhere")
                    toTest += selectableSitches[key] + ",";
            }
            toTest += "gimbal"  // just so we end up with something more interesting for more of a soak test
            testing = true;
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
        const url = SITREC_ROOT + "?testAll=1"
        window.location.assign(url)
    }

    par.name = lower;

    const startSitch = SitchMan.findFirstData(s => {return lower === s.data.name;})
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

    // specific to the gimbal chart, but no harm in calling it here in case it gets used in other situations
    disposeGimbalChart();

    // stop loading terrain
    imageQueueManager.dispose();

    // dispose of the GUI, except for the permanent folders and items
    gui.destroy(false);

    // The measurement UI is a group node that holds all the measurement arrows
    // it's created as needed, but will get destroyed with the scene
    // so we need to make sure it knows it's been destroyed
    removeMeasurementUI();

    // delete all the nodes
    NodeMan.disposeAll();

    disposeDebugArrows();
    disposeDebugSpheres();

    console.log("GlobalScene originally has " + GlobalScene.children.length + " children");
    disposeScene(GlobalScene)
    console.log("GlobalScene now (after dispose) has " + GlobalScene.children.length + " children");
    if (GlobalNightSkyScene !== undefined) {
        disposeScene(GlobalNightSkyScene)
        setupNightSkyScene(undefined)
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
 * Waits until Globals.parsing becomes zero.
 */
async function waitForParsingToComplete() {
    console.log("Waiting for parsing to complete... Globals.parsing = " + Globals.parsing);
    // Use a Promise to wait
    await new Promise((resolve, reject) => {
        // Function to check the value of Globals.parsing
        function checkParsing() {
            if (Globals.parsing === 0) {
                resolve(); // Resolve the promise if Globals.parsing is 0
            } else {
                // If not 0, wait a bit and then check again
                setTimeout(checkParsing, 100); // Check every 100ms, adjust as needed
            }
        }

        // Start checking
        checkParsing();
    });
    console.log("Parsing complete!");
}