import {Group, REVISION, Scene,} from "../three.js/build/three.module.js";
import {makeMatLine} from "./MatLines";
import "./js/uPlot/uPlot.css"
import "./extra.css"
import "./js/jquery.csv.js?v=2"
import "./js/jquery-ui-1.13.2/jquery-ui.css"
import "./js/jquery-ui-1.13.2/jquery-ui.js?v=1"
import {UpdateNodes} from "./nodes/CNode";
import {
    gui,
    guiTweaks, incrementMainLoopCount,
    infoDiv, mainLoopCount,
    setGlobalURLParams,
    setInfoDiv,
    setNodeMan,
    setSit,
    setSitchMan,
    setupGUIGlobals,
    Sit,
    SitchMan
} from "./Globals";
import {buildDate, disableScroll} from './utils.js'
import {ViewMan} from './nodes/CNodeView.js'
import {CSituation} from "./CSituation";
import {par} from "./par";

import * as LAYER from "./LayerMasks.js"
import {SetupFrameSlider, updateFrameSlider} from "./FrameSlider";
import {registerNodes} from "./RegisterNodes";
import {registerSitches} from "./RegisterSitches";
import {SetupMouseHandler} from "./mouseMoveView";
import {isKeyHeld, showHider} from "./KeyBoardHandler";
import {
    CommonJetStuff,
    Frame2Az,
    Frame2El,
    glareSprite,
    initJetStuff,
    initJetStuffOverlays,
    initJetVariables,
    targetSphere,
    UIChangedAz,
    UpdatePRFromEA,
    updateSize
} from "./JetStuff";
import {GlobalScene, LocalFrame, setupLocalFrame, setupScene} from "./LocalFrame";
import {CNodeFactory} from "./nodes/CNodeFactory";
import GUI from "./js/lil-gui.esm";
import {CSitchFactory} from "./CSitchFactory";
import {assert} from "./utils"
import {addNightSky} from "./nodes/CNodeDisplayNightSky";
import {GlobalDateTimeNode, MakeDateTimeNode} from "./nodes/CNodeDateTime";
import {addAlignedGlobe} from "./Globe";
import {CNodeDisplayCameraFrustum} from "./nodes/CNodeDisplayCameraFrustum";
import JSURL from "./js/jsurl";
import {checkLocal, isLocal, SITREC_ROOT, localSituation} from "../config";

import {FileManager} from "./CFileManager";
import {SituationSetup} from "./SituationSetup";

checkLocal()

console.log("setNodeMan")
setNodeMan(new CNodeFactory())
console.log("registerNodes")
registerNodes();

setSitchMan(new CSitchFactory())
registerSitches();

const selectableSitchesUnsorted = {}
SitchMan.iterate((key, sitch) =>{
    if (sitch.hidden !== true && sitch.menuName !== undefined )
        selectableSitchesUnsorted[sitch.menuName] = key;
})
// Extract sitch keys (the lower case version of the name) and sort them
const sortedKeys = Object.keys(selectableSitchesUnsorted).sort();
// Create a new sorted object
const selectableSitches = {};
sortedKeys.forEach(key => {
    console.log(selectableSitchesUnsorted[key]);
    selectableSitches[key] = selectableSitchesUnsorted[key];
});

// Add the "Test All" option
selectableSitches["* Test All *"] = "testall";
selectableSitches["* Test Here+ *"] = "testhere";

console.log("SITREC START")
console.log("Three.JS Revision = " + REVISION)

const queryString = window.location.search;
console.log(">"+queryString);
const urlParams = new URLSearchParams(queryString);
setGlobalURLParams(urlParams)

// We default to nightsky on the public version
// as it's now the most popular usage.
var situation = "nightsky";

///////////////////////////////////////////////////////////////////////
// LOCAL TEST  agua, linetest, rgb,  gimbal, gofast, flir1
if (isLocal) {
    situation = localSituation
    console.log("LOCAL TEST MODE: " + situation + "\n")
}
///////////////////////////////////////////////////////////////////////
// A smoke test of one or more situations.
var toTest
var testing = false;
if (urlParams.get("test")) {
    toTest = urlParams.get("test")
    testing = true;
}

// A smoke test of all situations
if (urlParams.get("testAll")) {
    toTest = ""
    for (var key in selectableSitches) {
        if (selectableSitches[key] !== "testall" && selectableSitches[key] !== "testhere")
            toTest += selectableSitches[key]+",";
    }
    toTest+="gimbal"  // just so we end up with something more interesting for more of a soak test
}




// toTest is a comma separated list of situations to test
// if it is set, we will test the first one, then the rest
// will be tested in order.
if (toTest !== undefined) {
    var testArray = toTest.split(',');
    situation = testArray.shift() // remove the first (gimbal)
    toTest = testArray.join(",")
    console.log("Testing "+situation+", will text next: "+toTest)

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

var _gui = new GUI()

if (lower == "testall") {
    const url = SITREC_ROOT + "?testAll=1"
    window.location.assign(url)
}

// Add the menu to select a situation
// The onChange function will change the url to the new situation
// which will cause the page to reload with the new situation
// selectableSitches is defined in situations.js

par.name = lower;
_gui.add(par, "name", selectableSitches).name("Sitch").onChange(sitch => {
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

var _guiShowHide = _gui.addFolder('Show/Hide').close();
var _guiTweaks = _gui.addFolder('Tweaks').close();
var _guiJetTweaks = _gui.addFolder('Jet Tweaks').close();
setupGUIGlobals(_gui,_guiShowHide,_guiTweaks,_guiJetTweaks)

guiTweaks.add(par,"effects")

const startSitch = SitchMan.findFirstData(s => {return lower === s.data.name;})
assert(startSitch !== null, "Can't find startup Sitch: "+lower)
setSit(new CSituation(startSitch))

///////////////////////////////////////////////////////////////////////////////////////
// At this point Sit is set up.

MakeDateTimeNode();

// check if Sit.name is all lower case
assert(Sit.name.slice().toLowerCase() === Sit.name, "Sit.name ("+Sit.name+") is not all lower case")

//gui.title("Sitrec "+Sit.name+" - [U]I")
gui.title("Sitrec build "+buildDate+" PT")

var newTitle = "Sitrec "+Sit.name

if (document.title != newTitle) {
    document.title = newTitle;
}

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

// housekeeping
var container, stats;

export var labelRenderer;

// These are shortcuts, we can use makeMatLine directly for static geometry
// I feel matLine might not be ideal for specifying colors
var matLine =  makeMatLine(0x40ff40);
var matLineRed = makeMatLine(0xff8080,1.0);
var matLineRed2 = makeMatLine(0xff8080,2.0);
var matLineRedThin = makeMatLine(0xff8080,0.75);
var matLineBlue = makeMatLine(0x8080ff,1.0);
var matLineHorizon = makeMatLine(0x0000ff,2.5);
var matLineWhite = makeMatLine(0xffffff);
var matLineGreen = makeMatLine(0x00ff00);
var matLineCyan = makeMatLine(0x00ffff,1.5);
var matLineGreenThin = makeMatLine(0x00c000,1.0);
var matLineWhiteThin = makeMatLine(0x808080, 0.75);
var matLineWhiteDashed = makeMatLine(0xffffff, 1, true); // dashed is not working

// Kilometers per mile, used for conversion
var KMM = 0.621371;

function init() {
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

 //   GlobalScene.matrixWorldAutoUpdate = false


}

function isVisible (ob) {
    if (ob.visible == false) return false; // if not visible, then that can't be overridden
    if (ob.parent != null) return isVisible(ob.parent) // visible, but parents can override
    return true; // visible all the way up to the root
}

// Method of setting frame rate, from:
// http://jsfiddle.net/chicagogrooves/nRpVD/2/
// uses the sub-ms resolution timer window.performance.now() (a double)
// and does nothing if the time has not elapsed

var fps, fpsInterval, startTime, now, then, elapsed;

function startAnimating(fps) {
    fpsInterval = 1000 / fps ;           // e.g. 1000/30 = 33.333333
    then = window.performance.now();    //
    startTime = then;
    console.log("Startup time = " + startTime/1000);

    animate();
}

function animate(newtime) {
    requestAnimationFrame( animate );

    now = newtime;
    elapsed = now - then;

//    console.log("Frame now = " + now);


    // if enough time has elapsed, draw the next frame
    if (elapsed > fpsInterval) {

        // Get ready for next frame by setting then=now, but...
        // Also, adjust for fpsInterval not being multiple of 16.67
        then = now - (elapsed % fpsInterval);
        // draw stuff here
//        console.log("Normal renderMain call")
        renderMain()

       // if (par.effects)
       //     GlobalComposer.render();

    } else {
        // we don't have enough time for a new frame
        // so just render - which will allow smooth 60 fps motion
        const oldPaused = par.paused
        par.paused = true;
//        console.log("PAUSED renderMain call")
        renderMain();
        par.paused = oldPaused;
    }
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
    ViewMan.iterate((key, view) => {
        if (view.visible) {
            view.setFromDiv(view.div)
            view.updateWH()
            view.render(par.frame)
        }
    })

}

function updateFrame() {
    const lastFrame = par.frame;

    const A = Sit.aFrame;
    const B = Sit.bFrame;

    if (isKeyHeld('arrowup')) {
        par.frame = Math.round(par.frame - 10);
        par.paused = true;
    } else if (isKeyHeld('arrowdown')) {
        par.frame = Math.round(par.frame + 10);
        par.paused = true;
    } else if (isKeyHeld('arrowleft')) {
        par.frame = Math.round(par.frame - 1);
        par.paused = true;
    } else if (isKeyHeld('arrowright')) {
        par.frame = Math.round(par.frame + 1);
        par.paused = true;
    } else if (!par.paused) {
        // Frame advance with no controls (i.e. just playing)
        // time is advanced based on frames in the video
        // Sit.simSpeed is how much the is speeded up from reality
        // so 1.0 is real time, 0.5 is half speed, 2.0 is double speed
        // par.frame is the frame number in the video
        // (par.frame * Sit.simSpeed) is the time (based on frame number) in reality
        par.frame = Math.round(par.frame + par.direction);

        // A-B wrapping
        if (par.frame > B) {
            if (par.pingPong) {
                par.frame = B;
                par.direction = -par.direction
            } else {
                par.frame = 0;  // wrap if auto playing
            }
        }
    }

    if (par.frame > B) {
        par.frame = B;
        if (par.pingPong) par.direction = -par.direction
    }
    if (par.frame < A) {
        par.frame = A;
        if (par.pingPong) par.direction = -par.direction
    }

    updateFrameSlider();


    //      if (par.frame != lastFrame) {
    par.time = par.frame / Sit.fps
    if (Sit.azSlider) {
        const oldAz = par.az;
        const oldEl = par.el;
        par.az = Frame2Az(par.frame)
        par.el = Frame2El(par.frame)
        if (par.az != oldAz || par.el != oldEl)
            UpdatePRFromEA()
    }
}

init();


// bit of a patch
// if we are going to load a starlink file (i.e. id = starLink - noe capitalization)
//  check the flag rhs, which is set to rhs: FileManager.rehostedStarlink,
var urlData
if (urlParams.get("data")) {
    urlData = urlParams.get("data")
    var urlObject = JSURL.parse(urlData)
    if (urlObject.rhs && (Sit.files.starLink !== undefined)) {
        delete Sit.files.starLink
        FileManager.rehostedStarlink = true;
        console.log("Deleted starLink from sit, as urlObject.rhs = "+urlObject.rhs)
    }
}

// Parse the URL parameters, if any
// setting up stuff like the local coordinate system
// this will override things like Sit.lat and Sit.lon
if (urlParams.get("data")) {
    urlData = urlParams.get("data")
    if (Sit.parseURLDataBeforeSetup) {
        Sit.parseURLDataBeforeSetup(urlData)
    }
}

// data drive loading and setup
// Start loading assets but don't await it yet

console.log("START Load Assets")
const assetsLoading = Sit.loadAssets();

console.log("START Location Request")

// get only get the local lat/lon if we don't have URL data.
// and if we are not testing
if (!testing && Sit.localLatLon && urlData === undefined) {
    await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition((position) => {
            let lat = position.coords.latitude;
            let long = position.coords.longitude;

            Sit.lat = parseFloat(lat.toFixed(2));
            Sit.lon = parseFloat(long.toFixed(2));
            Sit.fromLat = Sit.lat;
            Sit.fromLon = Sit.lon;

            console.log("RESOLVED Local Lat, Lon =", Sit.lat, Sit.lon);

            resolve(); // Resolve the promise when geolocation is obtained
        }, (error) => {
         //   reject(error); // Reject the promise if there's an error
            console.log("Location request failed")
            resolve(); // if nothing, then just continue with defaults
        });
    });
}

// Now that geolocation is obtained, await the asset loading
console.log("WAIT Load Assets")
await assetsLoading;
console.log("FINISHED Load Assets")

console.log("Setup()")

SituationSetup();

if (Sit.jetStuff) {
    initJetVariables();
    initJetStuff()
}


if (Sit.setup !== undefined) Sit.setup();
console.log("Setup2()")
if (Sit.setup2 !== undefined) Sit.setup2();

// minor patch, defer setting up the ATFLIR UI, as it references the altitude
if (Sit.jetStuff) initJetStuffOverlays()

console.log("Finalizing....")

GlobalDateTimeNode.populateFromUTCString(Sit.startTime)

if (Sit.azSlider) {
// I use 0.2 as a step instead of 0.1 as it ensures we can stop on whole number (0.0 not 0.1)
    var aZMin = Frame2Az(0)
    var aZMax = Frame2Az(Sit.frames - 1)
    if (aZMin > aZMax) {
        const t = aZMin;
        aZMin = aZMax;
        aZMax = t;
    }
    gui.add(par, 'az', aZMin, aZMax, 0.2).listen().onChange(UIChangedAz).name("azimuth")
}

if (Sit.jetStuff) {
    CommonJetStuff();
}


if (Sit.useGlobe) {
    Sit.globe = addAlignedGlobe(Sit.globeScale ?? 0.999);
    showHider(Sit.globe,"[G]lobe", true, "g")
}

if (Sit.nightSky) {
    addNightSky()
}

if (Sit.displayFrustum) {
     Sit.frustum = new CNodeDisplayCameraFrustum({
         radius: Sit.frustumRadius,
         camera: Sit.lookCamera,
         color: makeMatLine(Sit.frustumColor, Sit.frustumLineWeight),
     })

//    const helper = new CameraHelper(Sit.lookCamera)
//    GlobalScene.add(helper)

}

// Finally move the camera and reset the start time, if defined in the URL parameters
if (urlParams.get("data")) {
    urlData = urlParams.get("data")
    if (Sit.parseURLDataAfterSetup) {
        Sit.parseURLDataAfterSetup(urlData)
    }
}

disableScroll()
SetupMouseHandler();
window.addEventListener( 'resize', windowChanged, false );

console.log("animate")
animate(true); // Passing in true for ForceRender to render even if the windows does not have focus, like with live.js
windowChanged()

infoDiv.innerHTML = ""
startAnimating(30);

// if testing, then wait two seconds, and then load the next test URL

setTimeout( function() {
    if (toTest != undefined && toTest != "") {
        var url = SITREC_ROOT + "?test=" + toTest
        window.location.assign(url)
    } else {
        testing = false;
    }
}, 3500);
