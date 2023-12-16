import {gui, guiShowHide, NodeMan, Sit} from "./Globals";
import {par} from "./par";
import {UIChangedFrame} from "./JetStuff";
import {closeFullscreen, openFullscreen} from "./utils";
import {opts} from "./JetChart";
import {DumpPreset} from "./Presets";
import {Vector3} from "../three.js/build/three.module";
import {MV3} from "./threeExt";
import {mainCamera} from "./Globals";
import {isLocal} from "../config";

export var keyHeld = {}
export var keyCodeHeld = {}
export var keyInfo = {}
// keyInfo hold a structure of per-key info
// {
//    held:       if held
//    heldTime:   how long it has been held
//    triggered:  if it has been triggered, and is still held. Can be cleared by handling code
//    released:   if it has been released
//

class CKeyInfo {
    constructor(props) {

        this.held = false
        this.triggered = false;
        this.downStartTime = this.timer()
        this.pressDuration = 0;
        this.allowRepeats = props.allowRepeats ?? false;
        this.callbackDown = null;

    }

    onDown(c) {
        this.callbackDown = c
    }

    // have a member function for the ms timer, so can override it later if needed, probably not.
    timer() {
        return Date.now()
    }

    down(e) {
        if (!this.held) {
            this.held = true;
            this.triggered = true;
            // this is so if we instantiate the key while it is being held, then we will still get a sensible time
            // if we want to calculate the last keystroke duration, for whatever reason
            this.downStartTime = this.timer()
        }

    }

    up(e) {
        this.held = false;
        this.pressDuration = this.timer() - this.downStartTime

    }

    get heldTime() {
        return this.timer() - this.downStartTime
    }


}


class CKeyBoardManager {
    constructor(props) {
        this.keys = {}
    }

    key(keyCode) {
        if (this.keys[keyCode] === undefined) {
            this.keys[keyCode] = new CKeyInfo()
        }
        return this.keys[keyCode]
    }
}

const KeyMan = new CKeyBoardManager()

// So, e.g.
// if (KeyMan.key("space").heldTime > 10)

export function isKeyHeld(key) {
    var lowercaseKey = key.toLowerCase();
    if (keyHeld[lowercaseKey] != undefined)
        return keyHeld[lowercaseKey]
    else
        return false;
}

export function isKeyCodeHeld(code) {
   return keyCodeHeld[code]
}


// a quickToggle is a more immediate mode UI toggle you can just use
export var toggles = {}
export const toggler = function (key, controller) {
    toggles[key] = controller;
}
// generic toggler that has a callback and some data that's passed to that callback
// along with the
export var genericToggles = {}
// a generic toggler just sets up a key/gui pair
// and calls the callback when there's a change
function togglerGeneric(key, data, gui, name, callback) {
    genericToggles[key] = {
        data: data,
        gui: gui,
        callback: callback,
        value: false,
        name: name,
    }
    var controller = gui.add(genericToggles[key], "value").name(name).listen().onChange(
        (newValue) => {
            genericToggles[key].callback(genericToggles[key], newValue)
        })
    genericToggles[key].guiController = controller;
}

export function togglerNodes(key, nodes, gui, name, callback) {
    togglerGeneric(key, nodes, gui, name, (toggle, value) => {
//        console.log(nodes)
        nodes.forEach(nodeName => {
//            ViewMan.get(n).setVisible(value);
            if (NodeMan.exists(nodeName)) {
                console.log("Toggling " + nodeName)

                const node = NodeMan.get(nodeName)
                console.log("Node:  " + node)

                node.setVisible(value);
            } else {
                console.warn("togglerNodes called with non-existant node "+nodeName)
            }
        })
        callback()
    })
}

// and it will be created if needed
export var quickToggles = {}

export function quickToggle(key, start = false, toggleGui = gui) {
    if (quickToggles[key] === undefined) {
        quickToggles[key] = {gui: null, value: start};
        quickToggles[key].gui = toggleGui.add(quickToggles[key], "value").name(key).onChange(()=>{
            par.renderOne = true;
        })
    }
    return quickToggles[key].value
}

export function showHider(_ob, id, visible, key) {
    const ob = _ob;
    if (visible == undefined) visible = false;
    if (par[id] == undefined) {
        par[id] = visible
        ob.visible = visible
    }
    const con = toggles[key] ?? guiShowHide.add(par, id).listen();

    con.onChange(value => {
        if (value)
            ob.visible = true
        else
            ob.visible = false

        // if it's got a Three.js group then also set that.
        if (ob.group !== undefined) {
            ob.group.visible = ob.visible;
        }

    })

    if (key != undefined) {
        toggles[key] = con
    }
    return con;
}

var isFullScreen = false;

export function initKeyboard() {
    document.onkeydown = function (e) {

        if (e.repeat && e.code !== 'Comma' && e.code !=='Period') return; // ignore repeating keys, except for frame advance

        // since there's a variety of things the keys might do, have them all render a frame
        // so that changes are reflected in the display (e.g. 'J' = toggle jet
        par.renderOne = true;

//        console.log ("Key Down: ")

        var keyCode = e.code
        var key = e.key.toLowerCase()
        keyHeld[key] = true
        keyCodeHeld[keyCode] = true
        console.log("Key: "+key+ " keyCode: "+keyCode)
        var c = mainCamera; // mostly to avoid search results.
        switch (keyCode) {
            case 'NumpadDecimal':
                c.position.copy(MV3(Sit.startCameraPosition));  //
                c.lookAt(MV3(Sit.startCameraTarget));
                c.up.set(0, 1, 0);
                break

            case 'Numpad1':
                c.position.x = 0;
                c.position.y = 0;
                c.position.z = Sit.defaultCameraDist;  // 1300 works for 10°
                c.up.set(0, 1, 0);

                c.lookAt(new Vector3(0, 0, 0));
                break;

            case 'Numpad7':
                c.position.x = 0;
                c.position.y = Sit.defaultCameraDist;
                c.position.z = 0;
                c.up.set(0, 1, 0);
          //      c.up.x = 0;
          //      c.up.y = 0;
          //      c.up.z = -1;

                c.lookAt(new Vector3(0, 0, 0));
                break;

            case 'Numpad3':
                c.position.x = Sit.defaultCameraDist;
                c.position.y = 0;
                c.position.z = 0;
                c.up.set(0, 1, 0);

                c.lookAt(new Vector3(0, 0, 0));
                break;

            case 'Numpad9':
                c.position.x = -c.position.x;
                c.position.y = -c.position.y;
                c.position.z = -c.position.z;

                c.lookAt(new Vector3(0, 0, 0));
                break;


            case 'Space' :
                par.paused = !par.paused;
                break;

            case 'KeyU' :
                if (gui._hidden) gui.show(); else gui.hide();
                break;
            case 'KeyF':
                if (!isFullScreen) {
                    isFullScreen = !isFullScreen
                    openFullscreen()
                } else {
                    isFullScreen = !isFullScreen
                    closeFullscreen()
                }
                break;
            case 'KeyL':
                opts.legend.live = !opts.legend.live;
                break;
            case 'Backquote':
                if (isLocal) {
                    DumpPreset()
                }

            // single step
            case 'Comma':
                par.frame--;
                if (par.frame < 0) par.frame = 0;
                UIChangedFrame();
                break;

            case 'Period':
                par.frame++;
                if (par.frame > Sit.frames - 1) par.frame = Sit.frames - 1;
                UIChangedFrame();
                break;


        }

        // now see if keycode is in the gui togglers array
        var guiController = toggles[key]
        console.log("toggles[key] = "+guiController)
        if (guiController !== undefined) {
            guiController.setValue(!guiController.getValue())
        }

        guiController = quickToggles[key]
        if (guiController !== undefined) {
            guiController.setValue(!guiController.getValue())
        }

        var toggleData = genericToggles[key]
        if (toggleData !== undefined) {
            toggleData.guiController.setValue(!toggleData.guiController.getValue())
        }


    }

    document.onkeyup = function (e) {
//        console.log ("Key Up: ")
//        console.log(e)

        keyCodeHeld[e.code] = false

        var key = e.key.toLowerCase()
        keyHeld[key] = false

    }
}