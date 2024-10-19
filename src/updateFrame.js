import {par} from "./par";
import {Sit} from "./Globals";
import {isKeyHeld} from "./KeyBoardHandler";
import {updateFrameSlider} from "./nodes/CNodeFrameSlider";
import {Frame2Az, Frame2El, UpdatePRFromEA} from "./JetStuff";
import {mebug} from "./utils";

var lastTime = 0;

export function updateFrame(elapsed) {
    const lastFrame = par.frame;

    // calculate the timestep since this was last called
    // using the high precision timer
    // const now = performance.now();
    //const dt = now - lastTime;
    // lastTime = now;

    const dt = elapsed;

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
       //par.frame = Math.round(par.frame + par.direction);

        // dt is in milliseconds, so divide by 1000 to get seconds
        // then multiply by the frames per second to get the number of frames
        // to advance
        const advance = dt / 1000 * par.direction;
        par.time = par.time + advance;
        par.frame = Math.floor(par.time * Sit.fps);
        //mebug("par.frame = "+par.frame+" par.time = "+par.time+" advance = "+advance+" dt = "+dt+" Sit.fps = "+Sit.fps+" par.direction = "+par.direction);

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
        if (par.az !== oldAz || par.el !== oldEl || par.needsGimbalBallPatch) {
            UpdatePRFromEA()
        }

    }
}