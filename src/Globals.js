export let mainLoopCount = 0;
export function incrementMainLoopCount() {
    mainLoopCount++
//    console.log("Incrementing mainLoopCount to " + mainLoopCount);
};

export var Globals = {}

export var Sit;
export function setSit(s) {Sit = s;}

export var NodeMan;
export function setNodeMan(n) {NodeMan = n;}

export var SitchMan;
export function setSitchMan(n) {SitchMan = n;}




export var gui;
export var guiTweaks;
export var guiShowHide;
export var guiJetTweaks;

export var infoDiv;
export function setInfoDiv(i) {infoDiv=i;}

export var GlobalComposer;
export function setComposer(i) {GlobalComposer=i;}

export var GlobalURLParams;
export function setGlobalURLParams(i) {GlobalURLParams=i;}

export var GlobalDateTimeNode;
export function setGlobalDateTimeNode(i) {GlobalDateTimeNode=i;}

export function setNewSitchText(text){
    Globals.newSitchText = text;
}

export function setupGUIGlobals(_gui, _show, _tweaks) {
    gui = _gui
    guiShowHide = _show;
    guiTweaks = _tweaks;
}

export function setupGUIjetTweaks(_jetTweaks) {
    guiJetTweaks = _jetTweaks
}



// the curvature of the earth WAS adjusted for refraction using the standard 7/6R
// This is because the pressure gradient bends light down (towards lower, denser air)
// and so curves the light path around the horizon slightly, making the Earth
// seem bigger, and hence with a shallower curve
//export const EarthRadiusMiles = 3963 * 7 / 6
export const EarthRadiusMiles = 3963.190592  // exact wgs84.RADIUS
export var Units;
export function setUnits(u) {Units = u;}

export var FileManager;
export function setFileManager(f) {FileManager = f;}
