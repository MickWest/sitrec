import {
  Globals,
  gui,
  guiShowHide,
  keyCodeHeld,
  keyHeld,
  NodeMan,
  Sit,
} from './Globals';
import { par } from './par';
import { closeFullscreen, openFullscreen } from './utils';
import { Vector3 } from 'three';

class CKeyInfo {
  constructor(props) {
    this.held = false;
    this.triggered = false;
    this.downStartTime = this.timer();
    this.pressDuration = 0;
    this.allowRepeats = props.allowRepeats ?? false;
    this.callbackDown = null;
  }

  onDown(c) {
    this.callbackDown = c;
  }

  // have a member function for the ms timer, so can override it later if needed, probably not.
  timer() {
    return Date.now();
  }

  down(e) {
    if (!this.held) {
      this.held = true;
      this.triggered = true;
      // this is so if we instantiate the key while it is being held, then we will still get a sensible time
      // if we want to calculate the last keystroke duration, for whatever reason
      this.downStartTime = this.timer();
    }
  }

  up(e) {
    this.held = false;
    this.pressDuration = this.timer() - this.downStartTime;
  }

  get heldTime() {
    return this.timer() - this.downStartTime;
  }
}

class CKeyBoardManager {
  constructor(props) {
    this.keys = {};
  }

  key(keyCode) {
    if (this.keys[keyCode] === undefined) {
      this.keys[keyCode] = new CKeyInfo();
    }
    return this.keys[keyCode];
  }
}

const KeyMan = new CKeyBoardManager();

// So, e.g.
// if (KeyMan.key("space").heldTime > 10)

export function isKeyHeld(key) {
  const lowercaseKey = key.toLowerCase();
  if (keyHeld[lowercaseKey] !== undefined) return keyHeld[lowercaseKey];

  return false;
}

export function isKeyCodeHeld(code) {
  return keyCodeHeld[code];
}

// a quickToggle is a more immediate mode UI toggle you can just use
export const toggles = {};
export const toggler = (key, controller) => {
  toggles[key] = controller;
};
// generic toggler that has a callback and some data that's passed to that callback
// along with the
export const genericToggles = {};
// a generic toggler just sets up a key/gui pair
// and calls the callback when there's a change
function togglerGeneric(key, data, gui, name, callback) {
  genericToggles[key] = {
    data: data,
    gui: gui,
    callback: callback,
    value: false,
    name: name,
  };
  const controller = gui
    .add(genericToggles[key], 'value')
    .name(name)
    .listen()
    .onChange((newValue) => {
      genericToggles[key].callback(genericToggles[key], newValue);
    });
  genericToggles[key].guiController = controller;
}

export function togglerNodes(key, nodes, gui, name, callback) {
  togglerGeneric(key, nodes, gui, name, (toggle, value) => {
    //        console.log(nodes)
    nodes.forEach((nodeName) => {
      //            ViewMan.get(n).setVisible(value);
      if (NodeMan.exists(nodeName)) {
        console.log(`Toggling ${nodeName}`);

        const node = NodeMan.get(nodeName);
        console.log(`Node:  ${node}`);

        node.setVisible(value);
      } else {
        console.warn(`togglerNodes called with non-existant node ${nodeName}`);
      }
    });
    callback();
  });
}

// and it will be created if needed
export const quickToggles = {};

export function quickToggle(key, start = false, toggleGui = gui) {
  if (quickToggles[key] === undefined) {
    quickToggles[key] = { gui: null, value: start };
    quickToggles[key].gui = toggleGui
      .add(quickToggles[key], 'value')
      .name(key)
      .onChange(() => {
        par.renderOne = true;
      });
  }
  return quickToggles[key].value;
}

export function showHider(_ob, id, visible, key) {
  const ob = _ob;
  if (visible === undefined) visible = false;
  if (par[id] !== undefined && toggles[key] === undefined) {
    // the flag already exists, but no gui controller set up yet
    // so we use what is set up in there (e.g. it was serialized)
    visible = par[id];
  } else {
    par[id] = visible;
  }
  ob.visible = visible;
  ob.showHiderID = id;
  const con = toggles[key] ?? guiShowHide.add(par, id).listen();

  con.onChange((value) => {
    if (value) ob.visible = true;
    else ob.visible = false;

    // if it's got a Three.js group then also set that.
    if (ob.group !== undefined) {
      ob.group.visible = ob.visible;
    }
  });

  if (key !== undefined) {
    toggles[key] = con;
  }
  return con;
}

let isFullScreen = false;

export function initKeyboard() {
  document.onkeydown = (e) => {
    if (e.repeat && e.code !== 'Comma' && e.code !== 'Period') return; // ignore repeating keys, except for frame advance

    // since there's a variety of things the keys might do, have them all render a frame
    // so that changes are reflected in the display (e.g. 'J' = toggle jet
    par.renderOne = true;

    //        console.log ("Key Down: ")

    const keyCode = e.code;
    const key = e.key.toLowerCase();
    keyHeld[key] = true;
    keyCodeHeld[keyCode] = true;
    console.log(`Key: ${key} keyCode: ${keyCode}`);

    if (NodeMan.exists('mainCamera')) {
      const cameraNode = NodeMan.get('mainCamera');
      const c = cameraNode.camera;

      switch (keyCode) {
        case 'NumpadDecimal':
          c.up.set(0, 1, 0);
          cameraNode.resetCamera();
          break;

        // these numpad keys (intened to reset camera postiona) are largely useless right now
        // especially on Globes

        // case 'NumPad0':
        //     c.up.set(0, 1, 0);
        //     break;

        case 'Numpad1':
          c.position.x = 0;
          c.position.y = 0;
          c.position.z = Sit.defaultCameraDist; // 1300 works for 10°
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
      }
    }

    // and things that don't rely on the camera
    switch (keyCode) {
      case 'Space':
        par.paused = !par.paused;
        break;

      case 'KeyU':
        //                if (gui._hidden) gui.show(); else gui.hide();
        Globals.menuBar.toggleVisiblity();
        break;
      case 'KeyF':
        if (!isFullScreen) {
          isFullScreen = !isFullScreen;
          openFullscreen();
        } else {
          isFullScreen = !isFullScreen;
          closeFullscreen();
        }
        break;
      // case 'KeyL':
      //     opts.legend.live = !opts.legend.live;
      //     break;
      // case 'Backquote':            // gimbal legacy preset editing, not used in this version
      //     if (isLocal) {
      //         DumpPreset()
      //     }

      // single step
      case 'Comma':
        par.frame--;
        if (par.frame < 0) par.frame = 0;
        //   UIChangedFrame();
        break;

      case 'Period':
        par.frame++;
        if (par.frame > Sit.frames - 1) par.frame = Sit.frames - 1;
        //  UIChangedFrame();
        break;
    }

    // now see if keycode is in the gui togglers array
    let guiController = toggles[key];
    console.log(`toggles[key] = ${guiController}`);
    if (guiController !== undefined) {
      guiController.setValue(!guiController.getValue());
    }

    guiController = quickToggles[key];
    if (guiController !== undefined) {
      guiController.setValue(!guiController.getValue());
    }

    const toggleData = genericToggles[key];
    if (toggleData !== undefined) {
      toggleData.guiController.setValue(!toggleData.guiController.getValue());
    }
  };

  document.onkeyup = (e) => {
    keyCodeHeld[e.code] = false;

    const key = e.key.toLowerCase();
    keyHeld[key] = false;
  };

  window.onfocus = () => {
    //keyHeld = {}
    //keyCodeHeld = {}

    // clear them without making a new object
    for (const k in keyHeld) delete keyHeld[k];
    for (const k in keyCodeHeld) delete keyCodeHeld[k];
  };
}
