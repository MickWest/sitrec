// The par structure holds global variables that need to be modified by the GUI
// It's a bit of a mess, but it's a convenient way to get the GUI variables into the code
// I consider it deprecated

export const par = {}
globalThis.par = par;


const parDefaults = {
    el: -2,
    az: -54,
    jetPitch: 3.6,
    jetRoll: 0,

    time: 0,

    _frame: 0,

    // settor and gettor for frame
    get frame() {
        return this._frame;
    },
    set frame(value) {
        this._frame = value;
        this.renderOne = true;
    },


    glareStartAngle: 90 - 32.3,  // 26.6, (32.3 for keyframes, 26.6 for auto)
    initialGlareRotation: 6,
    paused: false,
    useRecordedBank: true,
    showVideo: true,
    showGraphs: true,
    showJet: true,
    podPitchPhysical: 0,
    podPitchIdeal: 0, // ideal roll to point at target
    globalRoll: 0, // total roll needed
    podRollIdeal: 0, // ideal roll from the pod = globalRoll-jetRoll
    podRollPhysical: 0, // physical roll of the pod head = ideal roll or angle from glare
    deroFromGlare: false,
    showPodHead: false,
    showPodsEye: false,
    graphSize: 100,
    videoZoom: 100,
    glareAngleType: 4,
    azType: 0,
//    aFrame:0,
//    bFrame:Frames-1,
    pingPong: false,
    scaleJetPitch: true,
    direction: 1,  // 1 or -1
    speed: 1,
    podWireframe: false,
    showPointer: false,
    showSphericalGrid: true,
    showAzElGrid: true,
    jetOffset: 1.5,
    showCueData: false,
    showGlareGraph: false,
    showChart: false,
    showKeyboardShortcuts: false,
    TAS: 351,
    integrate: 1,
    showLookCam: true,
    //  lookFOV:0.35,
    mainFOV: 30,
    jetHeading: 0,
    effects: true,
    negateEl: false,
}


// somewhat messy, but needed to support legacy code for now
// par needs to be a PERMANENT object, so we can't just replace it with a new object
// so we need to reset it to its default values
export function resetPar() {

    // remove all properties from par
    for (const prop in par) {
        delete par[prop];
    }
    // copy all properties from parDefaults to par
    for (const prop in parDefaults) {
        par[prop] = parDefaults[prop];
    }

}


export function renderOne() {
    par.renderOne = true;
}