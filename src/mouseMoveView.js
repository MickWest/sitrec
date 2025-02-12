// Handles mouse events, and passes them to the view that is under the mouse
// Also handled 3D raycasting calculation based on mouse position and view
//

import {par} from "./par";

import {V2} from "./threeUtils";
import {ViewMan} from "./CViewManager";
import {mouseInViewOnly} from "./ViewUtils";

var mouseDragView
var mouseDown = false
export const DRAG = {
    NONE: 0,
    PAN: 1,
    ROTATE: 2,
    ZOOM: 3,
    MOVEHANDLE: 4,
}
var dragMode = DRAG.NONE;
var mouseLastX = 0;
var mouseLastY = 0;
// Current mouse position, REALLY needs encapsulating....
var mouseX = 0;
var mouseY = 0;



export function SetupMouseHandler() {
    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'mousedown', onDocumentMouseDown, false );
    document.addEventListener( 'mouseup', onDocumentMouseUp, false );
    document.addEventListener( 'dblclick', onDocumentDoubleClick, false );
}

//
export function onDocumentMouseDown(event) {

    if (!mouseDown) {
        mouseX = (event.clientX);
        mouseY = (event.clientY);

        var vm = ViewMan

//        console.log("Mouse Down, checking exclusive")

        vm.iterateVisibleIncludingOverlays((name, view) => {
//            console.log("onDocumentMouseDown checking" + view.id)

            if (mouseInViewOnly(view, mouseX, mouseY, false)) {
  //              console.log("onDocumentMouseDown has mouseInViewOnly true for" + view.id)
                if (view.onMouseDown != undefined) {
                  //  console.log("Calling onMouseDown for" + view.id)
                    view.onMouseDown(event, mouseX, mouseY)
                    mouseDragView = view;
                } else {
                   // console.log("No callback onMouseDown for" + view.id)
                }


            }
        })
    }

    // click forces update
    par.renderOne = true;

    mouseDown = true;
}

export function onDocumentMouseMove(event) {


    mouseX = (event.clientX);
    mouseY = (event.clientY);

    // console.log("onDocumentMouseMove " + mouseX + "," + mouseY)


    // if we started dragging in a view, then send moves only to that
    if (mouseDragView) {
//         console.log("Mouse Dragging " + mouseDragView.id)
        if (mouseDragView.onMouseDrag) {
            // console.log("Mouse Dragging " + mouseDragView.id)
            mouseDragView.onMouseDrag(event, mouseX, mouseY, mouseX - mouseLastX, mouseY - mouseLastY)
        } else {
//            console.log("Mouse Unhandled Dragging " + mouseDragView.id)
            mouseDragView.onMouseMove(event, mouseX, mouseY, mouseX - mouseLastX, mouseY - mouseLastY)
        }
    } else {
        // otherwise, send to the view we are inside
        ViewMan.iterateVisibleIncludingOverlays((name, view) => {

            if (mouseInViewOnly(view, mouseX, mouseY) && view.onMouseMove != undefined) {
                // console.log("Mouse Move (no drag) in view "+view.id)
                view.onMouseMove(event, mouseX, mouseY, mouseX-mouseLastX, mouseY-mouseLastY)
            }
        })

    }

    // Mouse dragging is likely to need rendering update
    if (mouseDown)
        par.renderOne = true;

    mouseLastX = mouseX;
    mouseLastY = mouseY;

}

export function onDocumentMouseUp(event) {
    if (mouseDragView && mouseDragView.onMouseUp != undefined ) {
        mouseDragView.onMouseUp(event, mouseX, mouseY)
        dragMode = DRAG.NONE;
    }
    mouseDragView = null;
    mouseDown = false;
}

export function onDocumentDoubleClick(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;

    let done=false;
    ViewMan.iterate((key, view) => {
        if (!done && view.visible) {
            if (mouseInViewOnly(view, mouseX, mouseY)) {
                //  console.log("Dbl " + key)
                view.doubleClick();
                done = true;
            } else {
                //  console.log("NOT " + key)
            }
        }
    })
    par.renderOne = true;
}

export function makeMouseRay(view, mouseX, mouseY) {
    // get position in that view in pixels
    // views are defined from the TOP left of the window
    // so need to adjust (same as in mouseInView)
    // var viewX = mouseX - view.leftPx
    // var viewY = mouseY - (window.innerHeight-(view.topPx + view.heightPx));
    var viewX = mouseX;
    var viewY = mouseY;

    // convert to proportion
    var viewXp = viewX / view.widthPx
    var viewYp = viewY / view.heightPx

    //      console.log(`MouseX,Y = ${mouseX},${mouseY}`)
    //      console.log(`ViewXp, Yp = ${viewXp},${viewYp}`)

    // convert to Three.js camera relative, -1 to +1,
    // where -1,-1 is bottom left, 0,0 is center, 1,1 is top right
    //
    return V2(viewXp * 2 - 1, viewYp * 2 - 1)
}