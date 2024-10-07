///////////////////////////////////////////////////////////////////////////////
// CNodeView is the base class of all the views (2D, text, 3D, and maybe more)
// it has a div, which can be externally resized with jQuery.ui
// canvas elements are in CNodeView3D
// take their size from the div.
//
import {CameraMapControls} from "../js/CameraControls";
import {CNode} from './CNode.js'
import {CManager} from "../CManager";
import {Globals, guiShowHideViews, NodeMan, Sit} from "../Globals";
import {assert} from "../assert.js";
import {isConsole} from "../../config";


class CViewManager extends CManager {
    constructor(v) {
        super(v);
        if (!isConsole) { // will not be used in console mode, so just an empty singleton

            this.topPx = 24;
            this.leftPx = 0;
            this.updateSize();


            // make a div the size of the window, but missing the topPx
            // so we can have a menu bar at the top
            // this.div = document.createElement('div')
            // this.div.style.position = 'absolute';
            // this.div.style.top = this.topPx + 'px';
            // this.div.style.left = '0px';
            // this.div.style.width = '100%'
            // this.div.style.height = 'calc(100% - ' + this.topPx + 'px)'
            // this.div.style.backgroundColor = '#000000'
            // this.div.style.zIndex = 0;
            //
            // // make transparent to mouse events
            // this.div.style.pointerEvents = 'none';
            //
            // document.body.appendChild(this.div);
            // this.container = this.div;

            // old (working) way
            this.container = window;
        }
    }

    updateSize() {

        if (!isConsole) {
            this.widthPx = window.innerWidth - this.leftPx;
            this.heightPx = window.innerHeight - this.topPx;
        }
    }

}


export var ViewMan = new CViewManager()


const defaultCViewParams = {
    visible: true,
    left: 0,
    top: 0,
    width: 1,
    height: 1,
    background:null,
    up: [0,1,0],
    fov: 45,
    draggable: false,
    resizable: false,
    doubleClickResizes: false,
    doubleClickFullScreen: true,

}

// a view node is renderable node, usually a window
class CNodeView extends CNode {
    constructor (v) {
        assert(v.id !== undefined,"View Node Requires ID")
        super(v)

        // optionally make the view relative to anohther view
        this.input("relativeTo", true);

        
        // if (isLocal) {
        //     // local debugging, make a (ref) copy of v for later checks
        //     this.v_for_debug = v;
        // }

        // merge defaults with the passed parameters
        // into this. We used to merge in all of v, but that's not a good idea
        // as it leads to unexpected behaviour.
        // Object.assign(this,defaultCViewParams,v)
        Object.assign(this,defaultCViewParams)

        // // Instead of merging, we just copy the parameters we want
        this.top = v.top;
        this.left = v.left;
        this.width = v.width;
        this.height = v.height;

        // in initial setup, move windows to not go outside screen
        // only on MetaQuest?
        if (Globals.onMetaQuest) {
            let w = this.width;
            let h = this.height;
            if (w < 0) w = -w * h;
            if (h < 0) h = -h * w;

            if (this.left + w > 0.99) {
                this.left = 0.99 - w;
            }

            if (this.top + h > 0.99) {
                this.top = 0.99 - h;
            }
        }


  //      if (v.visible !== undefined)
        this.visible = v.visible ?? true;

        this.background = v.background;
        this.up = v.up;
        this.fov = v.fov;
        this.draggable = v.draggable;
        this.resizable = v.resizable;
        this.doubleClickResizes = v.doubleClickResizes;
        if (v.doubleClickFullScreen !== undefined) this.doubleClickFullScreen = v.doubleClickFullScreen;
        this.shiftDrag = v.shiftDrag;
        this.freeAspect = v.freeAspect;
        //
        //


        // container defaults to the window, but could be something else
        // (not yet tested with anything else)
        if (this.container === undefined)
            this.container = ViewMan.container;   // was window

        this.updateWH(); //need to get the pixel dimension to set the div

        if (v.overlayView) {
            this.overlayView = NodeMan.get(v.overlayView); // might be an id, so get the object
            this.div = this.overlayView.div
            assert(this.div, "Overlay view does not have a div")
        } else {

            this.div = document.createElement('div')
            this.div.style.position = 'absolute';

            // was recommended to fix Occulus overflow resizing.
            // does not work
            // this.div.style.contain = "layout size";

            this.div.style.top = this.topPx + 'px';
            this.div.style.left = this.leftPx + 'px';
            this.div.style.width = this.widthPx + 'px'
            this.div.style.height = this.heightPx + 'px'
            this.div.style.zIndex = 1;

            this.div.style.pointerEvents = 'auto';

//            console.log("For node "+this.id+" INITIAL setting widthPx,heightPx and div.style to "+this.widthPx+","+this.heightPx)

            // setting border style of divs also needs a color setting
            //this.div.style.borderStyle = 'solid'
            //this.div.style.color = '#404040';



            if (this.container === window) {
                this.divParent = document.body;
            } else {
                this.divParent = this.container;
            }

            this.divParent.appendChild(this.div);

            if (this.draggable) {

                $(this.div).draggable({
                    drag: function(event, ui) {
                        var view = $(this).data('CView')
                        if (!view.draggable)
                            return false;
                        if (view.shiftDrag)
                            return event.shiftKey;
                        else
                            return true;
                        //  view.dumpPosition()
                    }
                }).data("CView",this)
            }
            if (this.resizable) {
                $(this.div).resizable({
                    handles: 'all',
                    aspectRatio: !this.freeAspect,
                    resize: function(event, ui) {
                        var view = $(this).data('CView')
                        //view.dumpPosition()
                        return true;
                    }
                }).data("CView",this);
            }

            const visibleToSet = this.visible;
            this.visible = undefined; // force update
            this.setVisible(visibleToSet)

        }

        assert(!ViewMan.exists(v.id),"Adding "+v.id+" to ViewMan twice")
        ViewMan.add(v.id,this)

        if (!this.overlayView) {
            const name = v.menuName ?? this.id;
            // menu entry to show/hide this view
            guiShowHideViews.add(this, 'visible').listen().name(name).onChange(value => {
                this.visible = undefined; // force update
                this.setVisible(value);
            })
        }

    }

    // debug_v() {
    //     if (!this.done_debug_v) {
    //         this.done_debug_v = true;
    //         // list the elements that are in v but not in this
    //         for (const key in this.v_for_debug) {
    //             // check if it's unchanged, and not an input
    //             if (this[key] !== this.v_for_debug[key] && this.inputs[key] !== undefined) {
    //                 console.warn(this.constructor.name + ": v." + key + " differs in this " + this.id + " values are: " + this.v_for_debug[key] + " and " + this[key])
    //             }
    //         }
    //     }
    // }

    toSerialCNodeView = ["left","top","width","height","visible","preFullScreenVisible","doubled","preDoubledLeft","preDoubledTop","preDoubledWidth","preDoubledHeight"];



    modSerialize() {
        return {
            ...super.modSerialize(),
            ...this.simpleSerialize(this.toSerialCNodeView)
        };
    }

    // need to also handle full screen state....
    modDeserialize(v) {
        super.modDeserialize(v);
        this.simpleDeserialize(v,this.toSerialCNodeView)
        this.updateWH();
        this.setVisible(v.visible)
    }

    dispose() {
        console.log("Disposing CNodeView: "+this.id)

        // if (this.id === "mainView")
        //     debugger;

        // if it's an overlay view, then we don't want to remove the div
        if (this.overlayView === undefined && this.div) {

            this.divParent.removeChild(this.div);
 //           this.div = null
        }
        super.dispose()

        // views are stored in two managers, the node manager and the view manager
        // so we need to remove from both
        ViewMan.remove(this.id);
    }


    containerWidth() {
        if (this.in.relativeTo)
            return this.in.relativeTo.widthPx
        return ViewMan.widthPx;
    }
    containerHeight() {
        if (this.in.relativeTo)
            return this.in.relativeTo.heightPx
        return ViewMan.heightPx;
    }

    containerTop() {
        if (this.in.relativeTo)
            return this.in.relativeTo.topPx
        return ViewMan.topPx;
    }

    containerLeft() {
        if (this.in.relativeTo)
            return this.in.relativeTo.leftPx
        return ViewMan.leftPx;
    }

    dumpPosition() {
        console.log("left:"+this.left.toPrecision(5)+
            ", top:"+this.top.toPrecision(5)+
            ", width:"+this.width.toPrecision(5)+
            ",height:"+this.height.toPrecision(5)+",")
    }

    addOrbitControls() {
        this.controls = new CameraMapControls( this.camera, this.div, this) ; // Mick's custom controls
        this.controls.zoomSpeed = 5.0 // default 1.0 is a bit slow
        this.controls.useGlobe = Sit.useGlobe
        this.controls.update();
    }

    inheritSize() {
        if (this.overlayView) {
            this.width = this.overlayView.width
            this.height = this.overlayView.height
            this.widthPx = this.overlayView.widthPx
            this.heightPx = this.overlayView.heightPx
            // this.top = 0
            // this.left = 0
            // this.topPx = 0
            // this.leftPx = 0
            // and inherit the position, as we need that for UI mouse calculations
            this.top = this.overlayView.top
            this.left = this.overlayView.left
            this.topPx = this.overlayView.topPx
            this.leftPx = this.overlayView.leftPx

        }
    }

    preRenderCameraUpdate() {
        this.camera.aspect = this.widthPx / this.heightPx;
        this.camera.updateProjectionMatrix();

        // do any custom projection modifications

        // Sync the zoom on this camera to the video zoom
        // check if it's flagged, and we actually have a videoZoom UI control
        if (NodeMan.exists("videoZoom")) {
            if (this.effectsEnabled && this.syncPixelZoomWithVideo && NodeMan.get("pixelZoomNode").enabled) {
                this.camera.zoom = 1; // i.e. render it noramally, and then zoom up the pixels
                // these are CNodeGUI objects
                // that we need to sync
                var videoZoom = NodeMan.get("videoZoom")
                var pixelZoom = NodeMan.get("pixelZoom");

                pixelZoom.value = videoZoom.v0;
            }
            else if (this.syncVideoZoom) {
                var videoZoom = NodeMan.get("videoZoom")
                this.camera.zoom = videoZoom.v0 / 100;
            }
        }
    }

    renderCanvas(frame) {
        assert(frame !== undefined, "Undefined frame in "+this.id)

        // if an overlay view, then inherit the parent's size
        this.inheritSize()

    }

    // given a div, modify the CView's pixel pos/size and the fractional pos/size
    // so they match the div (accounting for this.containerWidth()/windowSize)
    setFromDiv(div) {

        if (this.widthPx !== div.clientWidth ||
            this.heightPx !== div.clientHeight ||
            this.leftPx !== div.offsetLeft ||
            this.topPx !== div.offsetTop
        ) {
            this.widthPx = div.clientWidth
            this.heightPx = div.clientHeight

            this.leftPx = div.offsetLeft;
            this.topPx = div.offsetTop;

            if (this.freeAspect) {
                if (this.width < 0 ) this.width = this.widthPx / this.heightPx;
                if (this.height < 0) this.height = this.heightPx / this.widthPx;
            }


            if (this.width>0) this.width = this.widthPx / this.containerWidth()
            if (this.height>0) this.height = this.heightPx / this.containerHeight()


            this.left = (this.leftPx-this.containerLeft()) / this.containerWidth()
            this.top = (this.topPx-this.containerTop()) / this.containerHeight()
        }

        this.widthDiv = div.clientWidth
        this.heightDiv = div.clientHeight

    }

    // Updates the Pixel and Div values from the fractional and window values
    updateWH() {
        this.leftPx = Math.floor(this.containerLeft() + this.containerWidth()  * this.left);
        this.topPx  = Math.floor(this.containerTop()  + this.containerHeight() * this.top);

        let oldWidth = this.widthPx;
        let oldHeight = this.heightPx;

        var widthFraction = this.width
        var heightFraction = this.height

        if (heightFraction < 0)
        {
            // height is a multiple of width pixels
            // keeping constant aspect ratio
            this.widthPx = Math.floor(this.containerWidth() * widthFraction);
            this.heightPx = Math.floor(this.containerWidth() * widthFraction * -heightFraction);
        } else if (widthFraction < 0) {
            this.heightPx = Math.floor(this.containerHeight() * heightFraction);
            this.widthPx = Math.floor(this.containerHeight() * heightFraction * -widthFraction);
        }
        else {
            this.widthPx = Math.floor(this.containerWidth() * widthFraction);
            this.heightPx = Math.floor(this.containerHeight() * heightFraction);
        }

        if (this.div && !this.overlayView) {
            // and finally set the div
            this.div.style.top = this.topPx + 'px';
            this.div.style.left = this.leftPx + 'px';
            this.div.style.width = this.widthPx + 'px'
            this.div.style.height = this.heightPx + 'px'
        }

       // if (oldHeight !== this.heightPx || oldWidth !== this.widthPx) {
            this.changedSize();
       // }


    }

    changedSize() {
        if (this.renderer) {
            if (this.in.canvasWidth) {
                // if it's a fixed size canvas, ensure it's the right size
                // and the renderer knows about it
                let width = this.in.canvasWidth.v0;
                let height = this.in.canvasHeight.v0;
                if (this.canvas.width !== width
                    || this.canvas.height !== height) {
                    this.renderer.setSize(width, height, false);
                 //   this.canvas.style.imageRendering ="pixelated"
                }
            } else if (this.canvas.width !== this.widthPx * window.devicePixelRatio
                || this.canvas.height !== this.heightPx * window.devicePixelRatio) {
                this.renderer.setSize(this.widthPx, this.heightPx);
            }
        } else {
            if (this.canvas) {
                if (this.canvas.width !== this.widthPx
                    || this.canvas.height !== this.heightPx) {
                    // this.canvas.width = this.widthPx * window.devicePixelRatio;
                    // this.canvas.height = this.heightPx * window.devicePixelRatio;
                    this.canvas.width = this.widthPx;
                    this.canvas.height = this.heightPx;
                    if (this.recalculateOnCanvasChange)
                        this.recalculate();
                }
            }
        }
    }



    snapInsidePx(l,t,w,h) {
        //  debugger
        if (this.leftPx < l)
            this.leftPx = l;
        if (this.topPx < t)
            this.leftPx = t;
        if (this.topPx+this.heightPx > t+h)
            this.topPx = t+h-this.heightPx
        if (this.leftPx+this.heightPx > l+w)
            this.leftPx = l+w-this.widthPx
        this.left = this.leftPx/this.containerWidth()
        this.top = this.topPx/this.containerHeight()
        this.updateWH()
    }

    doubleClick() {
        if (this.visible && (this.doubleClickResizes || this.doubleClickFullScreen)) {
            console.log("")
            console.log("DOUBLE CLICK on id = "+this.id);
            if (!this.doubled) {
                this.doubled = true;
                this.preDoubledLeft = this.left;
                this.preDoubledTop = this.top;
                this.preDoubledWidth = this.width;
                this.preDoubledHeight = this.height;

                if (this.doubleClickResizes) {
                    if (this.width > 0) {
                        this.width *= 2;

                    }
                    if (this.height > 0) {
                        this.height *= 2;
                    }
                    console.log("Doubling: "+this.id+" to "+this.width+","+this.height)
                } else {

                    // let aspect;
                    // if (this.width>0 && this.height>0) {
                    //     aspect = this.width/this.height;
                    // } else {
                    //     if (this.width<0) {
                    //         aspect = -this.width;
                    //     } else {
                    //         aspect = -1/this.height;
                    //     }
                    // }
                    // if (aspect > 1) {
                    //     this.width = 1;
                    //     this.height = 1/aspect;
                    // }

                    this.width = 1;
                    this.height = 1;

                    // if (this.width > 0) {
                    //     this.width = 1;
                    // }
                    // if (this.height > 0) {
                    //     this.height = 1;
                    // }
                    // problem if we have height = -1, meaning a fucntion of width

                    this.left = 0;
                    this.top = 0;
                    // this.width = 1;
                    // this.height = 1;
                    console.log("Full Screen: "+this.id+" to "+this.width+","+this.height)
                }


                if (this.width > 1) this.width=1;
                if (this.height > 1) this.height=1;


                this.updateWH()
                this.snapInsidePx(0,0,this.containerWidth(),this.containerHeight())

                if (this.doubleClickFullScreen) {
                    ViewMan.iterate((id,v) => {
                        if (v !== this && v.overlayView !== this && v.in.relativeTo !== this) {
                            v.preFullScreenVisible = v.visible;
//                            console.log("Hiding: "+v.id+" for full screen")
                            v.setVisible(false);
                        }
                    })
                }


            } else {
                this.doubled = false;
                this.left = this.preDoubledLeft
                this.top = this.preDoubledTop
                if (this.width > 0) this.width = this.preDoubledWidth;
                if (this.height > 0) this.height = this.preDoubledHeight;
                console.log("Restoring: "+this.id+" to "+this.width+","+this.height);
                this.updateWH()
                if (this.doubleClickFullScreen) {
                    ViewMan.iterate((id, v) => {
                        if (v !== this && v.overlayView !== this  && v.in.relativeTo !== this) {
    //                        console.log("Restoring visible: "+v.id+" to "+v.preFullScreenVisible)
                            v.setVisible(v.preFullScreenVisible);
                        }
                    })
                }
            }
        }
    }

    setVisible(visible) {

         if (this.visible === visible)
              return;

        // if (this.id === "trackingOverlay" && visible !== this.visible) {
        //         console.log("Setting "+this.id+" to "+visible + " from "+this.visible)
        // }

        this.visible = visible

        // if this is NOT an overlay view, then we can set the div visibility directly
        if (!this.overlayView) {
            if (this.div) {
                if (this.visible)
                    this.div.style.display = 'block'
                else
                    this.div.style.display = 'none'
            }
        }
        else {
           // console.warn("Overlaying view "+this.id+" set visible propagating to the overlaid view" + this.overlayView.id)
            if (!this.seperateVisibilty) {
                this.overlayView.setVisible(visible);
            } else {
               console.log("Overlaying view " + this.id + " set visible using canvas")
                this.canvas.style.visibility = this.visible ? 'visible' : 'hidden';

            }
        }
    }

    show() {
        this.setVisible(true)
        //    this.div.style.display = 'block'
    }

    hide() {
        this.setVisible(false)
        //   this.div.style.display = 'none'
    }

    //  clone() {
    //      return Object.assign(Object.create(Object.getPrototypeOf(this)), this)
    //  }

}

// example CUIText being added to a CUIView
//         this.addText("az", "35° L", 47, 7).listen(par, "az", function (value) {
//             this.text = (floor(0.499999+abs(value))) + "° " + (value > 0 ? "R" : "L");
//         })
// Note the callback to .listen is options

// position and size are specified as percentages
// and stored as fractions (ie. /100)
class CUIText {
    constructor (text,x,y,size,color,align, font) {
        this.text = text;
        this.x = x/100;
        this.y = y/100;
        this.size = size/100;
        this.color = color
        this.font = font;
        this.align = align;
        this.boxed = false;
        this.boxGap = 2;  // gap between text BBox and display BBox
        this.alwaysUpdate = false;

    }

    getValue() {
        return this.object[ this.property ];
    }

    setPosition(x,y) {
        this.x = x/100
        this.y = y/100
    }

    listen (object, property, callback) {
        this.object = object;
        this.property = property
        this.callback = callback;
        this.initialValue = this.getValue()
        return this;
    }

    update (callback) {
        this.callback = callback;
        this.alwaysUpdate = true;
        return this;
    }

    checkListener() {
        if (this.object != undefined) {
            const v = this.getValue()
            if (v != this.initialValue) {
                if (this.callback === undefined) {
                    this.text = String(v)
                } else {
                    this.callback.call(this, v)
                }
                this.initialValue = v;
            }
        }

        if (this.alwaysUpdate) {
            this.callback.call(this)
        }
    }
}

export {CNodeView, CUIText}


export function VG(id){
    return ViewMan.get(id)
}

// mouse and views both have 0,0 in the upper left.
export function mouseToView(view, x, y) {
    var xv = x - view.leftPx;
    var yv = y - view.topPx;
    return [xv,yv]
}

export function mouseToViewNormalized(view, x, y) {
    var xv = x - view.leftPx;
    var yv = y - view.topPx;
    return [(xv/view.widthPx)*2-1,-(yv/view.heightPx)*2+1]
}


// as does the canvas 0,0 in upper left
export function mouseToCanvas(view, x, y) {
    x -= view.leftPx;
//    y = window.innerHeight - y - view.topPx;
    y = y - view.topPx;
    return [x,y]
}

export function mouseInView(view, x, y, debug = false) {
    assert(view !== undefined)
    assert(x !== undefined)
    assert(y !== undefined)
    // localize to the view window
    const [vx,vy] = mouseToView(view,x,y)

    if (view.ignoreMouse) {
        if (debug) console.log(`Mouse (${x},${y}) Ignored in view(${view.id})`)
        return false;
    }
    if (!view.visible) {
        if (debug) console.log(`Mouse (${x},${y}) NOT visible in view(${view.id})`)
        return false;
    }

    const inside =  (vx >= 0 && vy >= 0 && vx < view.widthPx && vy < view.heightPx);
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