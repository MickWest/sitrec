// mouse and views both have 0,0 in the upper left.
import {assert} from "./assert";
import {ViewMan} from "./CViewManager";

export function mouseToView(view, x, y) {
    var xv = x - view.leftPx;
    var yv = y - view.topPx;
    return [xv, yv]
} // as does the canvas 0,0 in upper left
export function mouseToViewNormalized(view, x, y) {
    var xv = x - view.leftPx;
    var yv = y - view.topPx;
    return [(xv / view.widthPx) * 2 - 1, -(yv / view.heightPx) * 2 + 1]
}

export function mouseToCanvas(view, x, y) {
    x -= view.leftPx;
//    y = window.innerHeight - y - view.topPx;
    y = y - view.topPx;
    return [x, y]
}

export function mouseInView(view, x, y, debug = false) {
    assert(view !== undefined)
    assert(x !== undefined)
    assert(y !== undefined)
    // localize to the view window
    const [vx, vy] = mouseToView(view, x, y)

    if (view.ignoreMouse) {
        if (debug) console.log(`Mouse (${x},${y}) Ignored in view(${view.id})`)
        return false;
    }
    if (!view.visible) {
        if (debug) console.log(`Mouse (${x},${y}) NOT visible in view(${view.id})`)
        return false;
    }

    const inside = (vx >= 0 && vy >= 0 && vx < view.widthPx && vy < view.heightPx);
    if (debug) {
        if (inside)
            console.log(`Mouse (${x},${y}) In view(${view.id})`)
        else
            console.log(`Mouse (${x},${y}) NOT in view(${view.id})`)
    }
    return inside;
}

export function mouseInViewOnly(view, x, y, debug = false) {
    // if NOT in the view, then immediately return false, no need to check.
    if (!mouseInView(view, x, y, debug)) {
        if (debug) console.log(`Mouse (${x},${y}) NOT in view(${view.id})`)
        return false;
    }

    var past = false;
    var inView = true;
    ViewMan.iterateVisibleIncludingOverlays((key, otherView) => {

        // we only check for views that are AFTER this view in the view manager
        // so wait until we find it, and then set he "past" flag
        if (otherView === view) {
            past = true;
        } else {
            if (past && mouseInView(otherView, x, y)) {


                if (debug) {
                    console.log(`Mouse (${x},${y}) In OTHER view(${otherView.id})`)
                }

                // only clear it if otherView has an onMouseDown
                if (otherView.onMouseDown !== undefined) {
                    inView = false;
                }

            }
        }
    })

    // none of the subsequent views had the mouse in, so we are good
    return inView;
}