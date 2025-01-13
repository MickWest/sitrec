import {CManager} from "./CManager";
import {isConsole} from "../config";
import {setupPageStructure} from "./PageStructure";

class CViewManager extends CManager {
    constructor(v) {
        super(v);
        if (!isConsole) { // will not be used in console mode, so just an empty singleton
            setupPageStructure();
            this.topPx = 24;
            this.leftPx = 0;
            this.container = document.getElementById("Content")
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
            //this.container = window;

        }
    }

    updateSize() {

        if (!isConsole) {
            this.widthPx = window.innerWidth - this.leftPx;
//            this.heightPx = window.innerHeight - this.topPx; // Old
            this.heightPx = this.container.offsetHeight - this.topPx; // New
            console.log("Setting ViewMan size to " + this.widthPx + "," + this.heightPx)
        }
    }

    setVisibleByName(name, visible) {
        this.iterate((id, v) => {
            if (v.showHideName === name || v.id === name) {
                v.setVisible(visible);
            }
        })
    }

}

export var ViewMan = new CViewManager()