// simple UI intermediate class that just has a canvas.
// we use this for the CNodeViewUI and the (upcoming) CNodeVideoView
// passing in an "overlayView" parameter will attache
import { CNodeView } from './CNodeView';
import { gui } from '../Globals';
import { CNodeGUIValue } from './CNodeGUIValue';

export class CNodeViewCanvas extends CNodeView {
  constructor(v) {
    super(v);

    this.autoFill = v.autoFill;

    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = `${0}px`;
    this.canvas.style.left = `${0}px`;

    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    // this.canvasWidth = v.canvasWidth;
    // this.canvasHeight = v.canvasHeight;

    this.optionalInputs(['canvasWidth', 'canvasHeight']);

    if (v.transparency !== undefined) {
      this.transparency = v.transparency;
      this.canvas.style.opacity = this.transparency;
      new CNodeGUIValue(
        {
          id: `${this.id}_transparency`,
          value: this.transparency,
          start: 0,
          end: 1,
          step: 0.01,
          desc: 'Transparency %',
          onChange: (value) => {
            this.transparency = value;
            this.canvas.style.opacity = this.transparency;
          },
        },
        gui
      );
    }

    // this.adjustSize()

    this.div.appendChild(this.canvas);
  }

  dispose() {
    super.dispose();
    this.div.removeChild(this.canvas);
    this.canvas = null;
  }

  ignoreMouseEvents() {
    this.canvas.style.pointerEvents = 'none';
  }

  adjustSize() {
    let changed = false;

    const oldWidth = this.widthPx;
    const oldHeight = this.heightPx;

    let width;
    let height;
    if (this.in.canvasWidth) {
      width = this.in.canvasWidth.v0;
    } else {
      width = this.div.clientWidth;
    }

    if (width !== oldWidth) {
      this.widthPx = width;
      changed = true;
    }

    if (this.in.canvasHeight) {
      height = this.in.canvasHeight.v0;
    } else {
      height = this.div.clientHeight;
    }

    if (height !== oldHeight) {
      this.heightPx = height;
      changed = true;
    }

    // just keep the canvas the same size as its div
    // unless we specify canvas with and height
    // if (this.canvas.width !== this.div.clientWidth || this.canvas.height !== this.div.clientHeight || this.autoClear) {
    //     this.canvas.width = this.div.clientWidth
    //     this.canvas.height = this.div.clientHeight

    if (changed) {
      if (this.renderer) {
        this.renderer.setSize(this.heightPx, this.widthPx, false);
      }

      // shoudl not be neede
      //this.canvas.style.width = "100%";
      //this.canvas.style.height = "100%";

      // this.canvas.style.width =  ((this.div.clientWidth/width)*100)+'%'; // Stretch to fill the parent div
      // this.canvas.style.height =  ((this.div.clientHeight/height)*100)+'%'; // Stretch to fill the parent div

      // console.log("this.div.clientWidth,Height", this.div.clientWidth +","+this.div.clientHeight)
      // console.log("Canvas resized to ", width, height, this.canvas.style.width, this.canvas.style.height + "from " + oldWidth + "," + oldHeight);

      // bit of a patch to redraw the editor/graph, as resizing clears
      if (this.editor) {
        // this is just resizing, so don't need to recalculate, just redraw.
        this.editor.dirty = true;
      }
    } else {
      if (this.autoClear) {
        // not clearing it by changing the size, so clear it here
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }
}

class CNodeViewCanvas2D extends CNodeViewCanvas {
  constructor(v) {
    super(v);

    this.ctx = this.canvas.getContext('2d');
    this.ctx.font = '36px serif';
    this.ctx.fillStyle = '#FF00FF';
    this.ctx.strokeStyle = '#FF00FF';

    // this.canvas.style.backgroundColor = 'transparent';
    // this.ctx.globalAlpha = 0.5;

    this.autoClear = v.autoClear;
    this.autoFill = v.autoFill;
    this.autoFillColor = v.autoFillColor;
  }

  dispose() {
    // release the WebGL context
    this.ctx = null;

    super.dispose();
  }

  renderCanvas(frame) {
    super.renderCanvas(frame);

    if (this.visible) {
      this.adjustSize();

      // the autoClear will clear it to transparent, so need to
      // fill it with a solid color if we've got an autoFill

      if (this.autoFill) {
        this.ctx.fillStyle = this.autoFillColor ?? 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }
}

export { CNodeViewCanvas2D };
