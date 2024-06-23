import { CNodeConstant } from './nodes/CNode';
import { assert } from './assert.js';

// A CManager is a simple class that manages a list of objects
class CManager {
  constructor() {
    this.list = {};
  }

  size() {
    return Object.keys(this.list).length;
  }

  add(id, data, original = null) {
    assert(
      this.list[id] === undefined,
      `seem to be adding <${id}> twice to a CManager `
    );
    this.list[id] = {
      data: data,
      original: original,
    };
    return data; // for chaining
  }

  exists(id) {
    return this.list[id] !== undefined;
  }

  remove(id) {
    if (typeof id === 'object') {
      id = id.id;
    }
    if (this.exists(id)) {
      delete this.list[id];
    }
  }

  disposeRemove(id) {
    if (typeof id === 'object') {
      id = id.id;
    }
    if (this.exists(id)) {
      if (this.list[id].data.dispose !== undefined) {
        this.list[id].data.dispose();
      }
      this.remove(id);
    }
  }

  pruneUnusedConstants() {
    for (const key in this.list) {
      if (this.list.hasOwnProperty(key)) {
        const node = this.list[key].data;
        // is it CNodeConstant class object?
        if (node instanceof CNodeConstant) {
          // is it not connected to anything?
          if (node.outputs.length === 0) {
            // remove it
            console.log(`Removing unused constant ${key}`);
            this.disposeRemove(key);
          }
        }
      }
    }
  }

  // returns just the data member object (a parsed arraybuffer, type varies)
  get(id, assertIfMissing = true) {
    if (assertIfMissing) {
      if (this.list[id] === undefined) {
        console.log(
          `Missing Managed object ${id}, use exists() if you are just checking`
        );
        console.log('Available keys are: ');
        // for (let key in this.list) {
        //     console.log("key", key)
        // }
      }
      assert(
        this.list[id] !== undefined,
        `Missing Managed object ${id}, use exists() if you are just checking`
      );
    }
    if (this.list[id] === undefined) return undefined;
    return this.list[id].data;
  }

  // returns the full object, so you can check filename, etc.
  getInfo(id) {
    assert(
      this.list[id] !== undefined,
      `Missing Managed object ${id}, use exists() if you are just checking`
    );
    return this.list[id];
  }

  iterate(callback) {
    Object.keys(this.list).forEach((key) => callback(key, this.list[key].data));
  }

  // bit crufty
  // test is called with the FileManager entry, but the callback uses the data
  iterateTest(test, callback) {
    Object.keys(this.list).forEach((key) => {
      if (test(this.list[key])) {
        callback(key, this.list[key].data);
      }
    });
  }

  iterateVisible(callback) {
    Object.keys(this.list).forEach((key) => {
      const view = this.list[key].data;
      if (view.visible && !view.overlayView) callback(key, view);
    });
  }

  deleteIf(test) {
    Object.keys(this.list).forEach((key) => {
      if (test(this.list[key])) {
        console.log(`removing ${this.list[key].filename}`);
        delete this.list[key];
      }
    });
  }

  findFirstData(test) {
    for (const key in this.list) {
      if (this.list.hasOwnProperty(key) && test(this.list[key])) {
        return this.list[key].data;
      }
    }
    return null;
  }

  disposeAll() {
    // delete all entries in this.rawFiles and this.list
    Object.keys(this.list).forEach((key) => {
      this.disposeRemove(key);
    });
  }
}

export { CManager };
