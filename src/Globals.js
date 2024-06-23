export let mainLoopCount = 0;
export function incrementMainLoopCount() {
  mainLoopCount++;
  //    console.log("Incrementing mainLoopCount to " + mainLoopCount);
}

export const Globals = {};

export let Sit;
export function setSit(s) {
  Sit = s;
}

export let NodeMan;
export function setNodeMan(n) {
  NodeMan = n;
}

export let NodeFactory;
export function setNodeFactory(n) {
  NodeFactory = n;
}

export let NullNode;
export function setNullNode(n) {
  NullNode = n;
}

export let SitchMan;
export function setSitchMan(n) {
  SitchMan = n;
}

export let gui;
export let guiTweaks;
export let guiShowHide;
export let guiJetTweaks;
export let guiShowHideViews;
export let guiPhysics;

export let infoDiv;
export function setInfoDiv(i) {
  infoDiv = i;
}

export let GlobalComposer;
export function setComposer(i) {
  GlobalComposer = i;
}

export let GlobalURLParams;
export function setGlobalURLParams(i) {
  GlobalURLParams = i;
}

export let GlobalDateTimeNode;
export function setGlobalDateTimeNode(i) {
  GlobalDateTimeNode = i;
}

export function setNewSitchText(text) {
  Globals.newSitchText = text;
}

export function setupGUIGlobals(_gui, _show, _tweaks, _showViews, _physics) {
  gui = _gui;
  guiShowHide = _show;
  guiTweaks = _tweaks;
  guiShowHideViews = _showViews;
  guiPhysics = _physics;
}

export function setupGUIjetTweaks(_jetTweaks) {
  guiJetTweaks = _jetTweaks;
}

// the curvature of the earth WAS adjusted for refraction using the standard 7/6R
// This is because the pressure gradient bends light down (towards lower, denser air)
// and so curves the light path around the horizon slightly, making the Earth
// seem bigger, and hence with a shallower curve
//export const EarthRadiusMiles = 3963 * 7 / 6
export const EarthRadiusMiles = 3963.190592; // exact wgs84.RADIUS
export let Units;
export function setUnits(u) {
  Units = u;
}

export let FileManager;
export function setFileManager(f) {
  FileManager = f;
}

export const keyHeld = {};
export const keyCodeHeld = {};
