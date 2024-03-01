import {Group, REVISION, Scene,} from "../three.js/build/three.module.js";
import "./js/uPlot/uPlot.css"
import "./extra.css"
import "./js/jquery.csv.js?v=2"
import "./js/jquery-ui-1.13.2/jquery-ui.css"
import "./js/jquery-ui-1.13.2/jquery-ui.js?v=1"
import {UpdateNodes} from "./nodes/CNode";
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
    setInfoDiv,
    setNodeMan,
    setSit,
    setSitchMan,
    setUnits,
    setupGUIGlobals, setupGUIjetTweaks,
    Sit,
    SitchMan,
} from "./Globals";
import {disableScroll} from './utils.js'
import {ViewMan} from './nodes/CNodeView.js'
import {CSituation} from "./CSituation";
import {par} from "./par";

import * as LAYER from "./LayerMasks.js"
import {SetupFrameSlider} from "./FrameSlider";
import {registerNodes} from "./RegisterNodes";
import {registerSitches} from "./RegisterSitches";
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
    UIChangedAz,
    updateSize
} from "./JetStuff";
import {GlobalScene, LocalFrame, setupLocalFrame, setupScene} from "./LocalFrame";
import {CNodeFactory} from "./nodes/CNodeFactory";
import {GUI} from "./js/lil-gui.esm";
import {CSitchFactory} from "./CSitchFactory";
import {assert} from "./utils"
import {addNightSky} from "./nodes/CNodeDisplayNightSky";
import {CNodeDateTime} from "./nodes/CNodeDateTime";
import {addAlignedGlobe} from "./Globe";
import JSURL from "./js/jsurl";
import {checkLocal, isLocal, localSituation, SITREC_ROOT, SITREC_SERVER} from "../config";

import {SituationSetup} from "./SituationSetup";
import {CUnits} from "./CUnits";
import {updateLockTrack} from "./updateLockTrack";
import {updateFrame} from "./updateFrame";
import {checkLogin} from "./login";
import {CFileManager} from "./CFileManager";
import {scaleArrows} from "./threeExt";

// This is the main entry point for the sitrec application
// However note that the imports above might have code that is executed
// before this code is executed.

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



await initializeOnce();
selectInitialSitch();


legacySetup();





initRendering();

await setupFunctions();

console.log("animate")
animate(true); // Passing in true for ForceRender to render even if the windows does not have focus, like with live.js
windowChanged()

infoDiv.innerHTML = ""
startAnimating(Sit.fps);


// if testing, then wait 3.5 seconds, and then load the next test URL

setTimeout( function() {
    if (toTest != undefined && toTest != "") {
        var url = SITREC_ROOT + "?test=" + toTest
        window.location.assign(url)
    } else {
        testing = false;
    }
}, 3500);

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function initializeOnce() {

// Check to see if we are running in a local environment
    checkLocal()

    await checkLogin();

    setNodeMan(new CNodeFactory())
    setSitchMan(new CSitchFactory())

    // Some metacode to find the node types and sitches (and common setup fragments)

    registerNodes();

// Get all the text based sitches from the server
// these are the sitches defined by <name>.sitch.js files inside the folder of the same name in data
    let textSitches = [];
    await fetch((SITREC_SERVER+"getsitches.php"), {mode: 'cors'}).then(response => response.text()).then(data => {
        console.log("TEXT BASED Sitches: " + data)
        console.log ("parsed data: ")
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
    var _gui = new GUI()

    var _guiShowHide = _gui.addFolder('Show/Hide').close();
    var _guiTweaks = _gui.addFolder('Tweaks').close();


    setupGUIGlobals(_gui,_guiShowHide,_guiTweaks)
    setUnits(new CUnits("Nautical"));
    setFileManager(new CFileManager())


    // Add the menu to select a situation
// The onChange function will change the url to the new situation
// which will cause the page to reload with the new situation
// selectableSitches is defined in situations.js
    _gui.add(par, "name", selectableSitches).name("Sitch").listen().onChange(sitch => {
        console.log("SITCH par.name CHANGE TO: "+sitch+" ->"+par.name)
        var url = SITREC_ROOT+"?sitch=" + sitch

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
            url = SITREC_ROOT + "?test="+toTest;
        }
        window.location.assign(url) //
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
///////////////////////////////////////////////////////////////////////////////////////
// SITUATION SPECIFIC SETUP

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

// Start loading the assets in Sit.files, but don't await them yet

    console.log("START Load Assets")
    const assetsLoading = Sit.loadAssets();

    console.log("START Location Request")


// Now that geolocation is obtained, await the asset loading
    console.log("WAIT Load Assets")
    await assetsLoading;
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

// Each sitch can have a setup() and setup2() function
// however only Gimbal actually used setup2() as gimbal and gimabalfar have different setup2() functions

    if (Sit.setup  !== undefined) Sit.setup();
    if (Sit.setup2 !== undefined) Sit.setup2();

// Redo tnhe data-driven setup, but this is for any deferred setup
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

    if (Sit.nightSky) {
        console.log("addNightSky()")
        addNightSky()
    }

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

        // if (par.effects)
        //     GlobalComposer.render();

    } else {
        // It is not yet time for a new frame
        // so just render - which will allow smooth 60 fps motion moving the camera
        const oldPaused = par.paused
        par.paused = true;
        renderMain();
        par.paused = oldPaused;
    }
    requestAnimationFrame( animate );

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

    if (par.paused && !par.renderOne) return;

    // par.renderOne is a flag set whenever something is done that forces an update.
    par.renderOne = false;

    if (Sit.updateFunction) {
        Sit.updateFunction(par.frame)
    }

    if (Sit.update) {
        Sit.update(par.frame)
    }

    UpdateNodes(par.frame)

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
                        node.preViewportUpdate(view.camera)
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

function selectInitialSitch() {

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
    setSit(new CSituation(startSitch))
}

async function requestGeoLocation() {
    await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition((position) => {
            let lat = position.coords.latitude;
            let long = position.coords.longitude;

            Sit.lat = parseFloat(lat.toFixed(2));
            Sit.lon = parseFloat(long.toFixed(2));
            Sit.fromLat = Sit.lat;
            Sit.fromLon = Sit.lon;

            NodeMan.get("cameraLat").value = Sit.lat
            NodeMan.get("cameraLon").value = Sit.lon

            console.log("RESOLVED Local Lat, Lon =", Sit.lat, Sit.lon);

            resolve(); // Resolve the promise when geolocation is obtained
        }, (error) => {
            //   reject(error); // Reject the promise if there's an error
            console.log("Location request failed")
            resolve(); // if nothing, then just continue with defaults
        });
    });
}