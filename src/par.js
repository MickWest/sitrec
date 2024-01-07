// The par structure holds global variables that need to be modified by the GUI
// It's a bit of a mess, but it's a convenient way to get the GUI variables into the code
// I consider it deprecated

export var par = {

    el: -2,
    az: -54,
    jetPitch: 3.6,
    jetRoll: 0,

    time: 0,
    frame: 0,
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
    lockCameraToJet: false,
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
}

export function renderOne() {
    par.renderOne = true;
}