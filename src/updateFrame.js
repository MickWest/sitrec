import {par} from "./par";
import {Sit} from "./Globals";
import {isKeyHeld} from "./KeyBoardHandler";
import {updateFrameSlider} from "./FrameSlider";
import {Frame2Az, Frame2El, UpdatePRFromEA} from "./JetStuff";

export function updateFrame() {
    const lastFrame = par.frame;

    const A = Sit.aFrame;
    let B = Sit.bFrame ?? Sit.frames-1;


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
    } else if (!par.paused && !par.noLogic) {
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