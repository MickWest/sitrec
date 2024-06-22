// GUI controls for the Jet sitches like Gimbal and GoFast

import {gui, guiJetTweaks, guiShowHide, guiTweaks, infoDiv, NodeMan, Sit} from "./Globals";
import {par} from "./par";
import {curveChanged, UIChangedFrame, UIChangedPR, UIChangedTime} from "./JetStuff";
import {calculateGlareStartAngle} from "./JetHorizon";
import {toggler, togglerNodes} from "./KeyBoardHandler";
import {FA18, PODBack} from "./nodes/CNodeDisplayATFLIR";
import {ViewMan} from "./nodes/CNodeView";
import {f2m} from "./utils";
import {DebugArrows} from "./threeExt";


function guiRemove(gui, obj, property) {
    for (const c of gui.controllers) {
        if (c.object == obj && c.property === property ) {
            c.destroy()
            break;
        }
    }
}

// GUI basic Controls (sliders) for time, frame number, and pause on/off
export function SetupGUIFrames() {
    updateGUIFrames();
}

export function updateGUIFrames() {
    guiRemove(gui, par, 'time')
    guiRemove(gui, par, 'frame')
    guiRemove(gui, par, 'paused')

    gui.add(par, 'time', 0, Sit.frames / Sit.fps, 1 / Sit.fps).onChange(UIChangedTime).listen().name("Time (sec)")
    gui.add(par, 'frame', 0, Sit.frames - 1, 1).onChange(UIChangedFrame).listen().name("Frame in Video")
    gui.add(par, 'paused').listen()

}


export function SetupJetGUI() {

    guiTweaks.add(Sit, 'aFrame', 0, Sit.frames - 1, 1).listen().onChange(function () {
        if (Sit.bFrame < Sit.aFrame) Sit.bFrame = paSitr.aFrame
        par.frame = Sit.aFrame;
        UIChangedFrame()
    })
    guiTweaks.add(Sit, 'bFrame', 0, Sit.frames - 1, 1).listen().onChange(function () {
        if (Sit.aFrame > Sit.bFrame) Sit.aFrame = Sit.bFrame
        par.frame = Sit.bFrame;
        UIChangedFrame()
    })
    guiTweaks.add(par, 'pingPong').listen().name("A-B Ping-Pong")

    guiJetTweaks.add(par, 'podPitchPhysical', -20, 150, 1).onChange(UIChangedPR).listen().name("Pod (Ball) Pitch")
    guiJetTweaks.add(par, 'podRollPhysical', -180, 180, 1).onChange(UIChangedPR).listen().name("Pod Head Roll")
    guiJetTweaks.add(par, 'deroFromGlare').listen().name("Derotation = Glare Angle").onChange(curveChanged);


    guiJetTweaks.add(par, 'jetPitch', -8, 8, 0.01).onChange(function () {
        curveChanged();
        calculateGlareStartAngle();

    }).listen().name('Jet Pitch')

    guiTweaks.add(Sit, 'lookFOV', 0.1, 10, 0.01).onChange(value => {
        const lookCamera = NodeMan.get("lookCamera").camera;
        lookCamera.fov = value
        lookCamera.updateProjectionMatrix()
    }).listen().name("Narrow FOV")

    guiTweaks.add(par, 'el', -8, 8, 0.01).onChange(curveChanged).name('elevation')

    guiTweaks.add(par, 'glareStartAngle', 40, 80, 0.1).listen().name("Glare Start Angle").onChange(curveChanged);
    guiTweaks.add(par, 'initialGlareRotation', 0, 20, 0.1).listen().name("Glare Initial Rotation").onChange(
        function () {
            calculateGlareStartAngle();
            curveChanged()

        });



    guiPhysics.add(par, 'scaleJetPitch').listen().onChange(function () {
        curveChanged();
        calculateGlareStartAngle();

    }).name('Scale Jet Pitch with Roll')

    guiTweaks.add(par, 'speed', 1, 10, 0.1).listen().name("Video Speed")
    toggler('b', guiTweaks.add(par, 'podWireframe').listen().name("[B]ack Pod Wireframe").onChange(value => {
        PODBack.traverse(child => {
            if (child.isMesh) {
                child.material.wireframe = value;
            }

        })
    }))
    // guiTweaks.add(par, 'lockCameraToJet').listen().name("Lock Camera to Jet");
    //

    toggler('v', guiShowHide.add(par, 'showVideo').listen().name("[V]ideo").onChange(value => {
        ViewMan.get("video").setVisible(value);
    }))
    toggler('g', guiShowHide.add(par, 'showChart').listen().name("[G]raph").onChange(value => {
        ViewMan.get("chart").setVisible(value);
    }))
    toggler('k', guiShowHide.add(par, 'showKeyboardShortcuts').listen().name("[K]eyboard Shortcuts").onChange(value => {
        if (value) {
            infoDiv.style.display = 'block';
        } else
            infoDiv.style.display = 'none';

    }))


    toggler('p', guiShowHide.add(par, 'showPodHead').listen().name("[P]od Head Roll")
        .onChange(value => {
            ViewMan.get("podBackView").setVisible(value)
        })
    );

    toggler('e', guiShowHide.add(par, 'showPodsEye').listen().name("Pod's [E]ye views w' dero")
        .onChange(value => {
            //       viewMan.get("podsEyeView").setVisible(value);
            ViewMan.get("podsEyeViewDero").setVisible(value);
            ViewMan.get("dero").setVisible(value);
            ViewMan.get("podseye").setVisible(value);
            //    ShellHorizonGroup.visible = value;
        })
    );

    toggler('n', guiShowHide.add(par, 'showLookCam').listen().name("[N]AR view w' dero")
        .onChange(value => {
            ViewMan.get("lookView").setVisible(value);
            ViewMan.get("ATFLIRUIOverlay").setVisible(value);
        })
    );


    toggler('c', guiShowHide.add(par, 'showCueData').listen().name("[C]ue Data").onChange(value => {
        DebugArrows["Projected Cue"].visible = value;
        DebugArrows["Cue Az"].visible = value;
        DebugArrows["Projected Az"].visible = value;
        DebugArrows["Az"].visible = value;
        curveChanged() // to toggle the graph lines
    }))

    toggler('x', guiShowHide.add(par, 'showGlareGraph').listen().name("Sh[o]w Glare Graph")
        .onChange(curveChanged));

    togglerNodes('z', ['azEditorView'], guiShowHide, "Show A[Z] Graph", curveChanged);

    togglerNodes('d', ['azEditorView', 'speedGraphView', 'cloudSpeedEditorView', 'tailAngleGraphView',
            'speedGraphFleetView', 'altitudeGraphView', 'sizePercentGraphView'],
        guiShowHide, "[D]eclutter]", curveChanged);

    guiTweaks.add(par, 'jetOffset', f2m(-30), f2m(10), 0.01).listen().name("Jet Y offset").onChange(value => FA18.position.y = value)
    guiTweaks.add(par, 'TAS', 340, 360, 0.01).listen().name("TAS True Airspeed").onChange(curveChanged)
    guiTweaks.add(par, 'integrate', 1, 100, 1).listen().name("Integration Steps").onChange(curveChanged)


}