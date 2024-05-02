import {CNodeViewUI} from "./CNodeViewUI";
import {Vector2} from "../../three.js/build/three.module";
import {mouseToCanvas, mouseToView} from "./CNodeView";
import {par} from "../par";

// A DDI is a screen in a fighter jet, F/A-18 or similar
// it's square and has five buttons on each edge (10 horizontal, 10 vertical)
// These are physical buttons, but here are toggled by clicking on
// the on-screen text next to a button
// Some buttons can be "boxed"
//
// Buttons are numbered clockwise from bottom left
/*


               6      7        8       9       10
         +----------------------------------------------+
     5   |                                              |  11
         |                                              |
         |          v                   ^               |
    4    |                                              |
         |                                              |  12
         |                                              |
         |                      |                       |
    3    |                      |                       |  13
         |                     -|-                      |
         |                                              |
         |                                              |
    2    |                                              |  14
         |                                              |
         |                                              |
    1    |                               0              |  15
         |                                              |
         +----------------------------------------------+
              20      19      18       17       16

 */

function spreadButtons(centerRelativeNumber, spacing) {
    return 50 + centerRelativeNumber * spacing;
}

const sideOffset = 5;
const topOffset = 5;
const spacing = 15

export class CDDIButton {
    constructor(number, text, toggle, callback) {
        this.number = number
        this.text = text
        this.toggle = toggle
        this.callback = callback

        // the position is the CENTER of the text/button
        this.position = new Vector2(0,0)
        if (this.number <= 5) {
            // left side
            this.position.x = sideOffset
            this.position.y = spreadButtons( -(this.number-3),spacing)
        } else if (this.number <= 10 ) {
            // top
            this.position.x = spreadButtons(this.number-8,spacing)
            this.position.y = topOffset
        } else if (this.number <= 15 ) {
            // right side
            this.position.x = 100-sideOffset
            this.position.y = spreadButtons(this.number-13,spacing)
        }
        else {
            // bottom
            this.position.x = spreadButtons(-(this.number-18),spacing)
            this.position.y = 100-topOffset

        }


    }
}

function inside(x,y,left,top,right,bot) {
  //  console.log ("inside check: ("+x+","+y+") vs ("+left+","+top+" -> "+right+","+bot)
    return x>=left && x<=right && y>=top && y<=bot
}

export class CNodeDDI extends CNodeViewUI {
    constructor(v) {
        super(v);
        this.buttons = new Array(20)

        this.autoFill = true;
        this.autoFillColor = v.autoFillColor ?? "#000000";  // "#304030";

       // test to set all buttons to their number
       // for (var i=1;i<=20;i++) this.setButton(i,"BTN"+i)

    }

    // placeholder for hovering
    onMouseMove(e,mouseX,mouseY) {
    }


    onMouseDown(e,mouseX,mouseY) {
//        console.log("CNodeDDI Mouse Down "+e)
        const [x,y] = mouseToCanvas(this, mouseX, mouseY)
        this.buttons.forEach(b => {
            const bb = b.textObject.bbox
            if (bb !== undefined) {
                const cx = this.px(b.position.x)
                const cy = this.py(b.position.y)
                if (inside(x, y, cx + bb.left, cy + bb.top, cx + bb.right, cy + bb.bottom)) {
                    console.log("Hit")
                    if (b.toggle) {
                        b.textObject.boxed = !b.textObject.boxed;
                    }
                    if (b.callback) {
                        b.callback(b)
                    }
                    par.renderOne = true;
                }
            }
        })
    }

    onMouseUp(e,mouseX,mouseY) {
    }

    onMouseDrag(e,mouseX,mouseY) {
    }

    setButton(number, text="BTN", toggle=false, callback=null) {
        this.buttons[number] = new CDDIButton(number,text, toggle, callback)
        this.buttons[number].textObject = this.addText(number,text,this.buttons[number].position.x, this.buttons[number].position.y, 3.5)
  //      this.buttons[number].textObject.boxed = true;

    }

    setButtonText(n, text) {
        this.buttons[number].textObject.text = text
    }

    update() {
    }
}
