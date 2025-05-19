// The compass UI displays the compass rose and the heading
// base on an input camera node

import {CNodeViewUI} from "./CNodeViewUI";
import {getCompassHeading, getLocalNorthVector, getLocalUpVector} from "../SphericalMath";
import {Vector3} from "three";
import {MV3} from "../threeUtils";
import {NodeMan} from "../Globals";

export class   CNodeMQ9UI extends CNodeViewUI {

    constructor(v) {
        super(v);
        this.input("camera");  // a camera node

        // addText(key, text, x, y, size, color, align, font) {
        //this.text = this.addText("heading", "0°", 50, 20, 20, "white", "center", "Arial")

        this.cx = 50;
        this.cy = 50;
        this.doubleClickFullScreen = false;
    }


    renderCanvas(frame) {
        if (this.overlayView && !this.overlayView.visible) return;


        // get the three.js camera from the camera node
        const camera = this.in.camera.camera;
        // get the camera's forward vector, the negative z basis from its matrix
        const forward = MV3(camera.matrixWorld.elements.slice(8,11));


        // get the heading of the camera, in radians
        // also used by CNodeCompassUI
        const heading = getCompassHeading(camera.position, forward, camera);

        // after updating any text (none yet), render the text
        super.renderCanvas(frame)


        const c = this.ctx;


        // draw the letter N in the center
        c.fillStyle = '#FF00FF';
        c.font = this.px(1.5)+'px Arial';
        c.textAlign = 'center';
        c.textBaseline = 'middle';

        const x = this.rx_square(this.cx,this.cy-27,heading);
        const y = this.ry(this.cx,this.cy-27,heading);

        c.fillText('N', x, y);


        const crosshairWidth = 1
        const crosshairColor = '#FF00FF'
        const crosshairGap = 2
        const crosshairLength = 6

        // draw four lines to make a crosshair with a gap in the    middle
        c.strokeStyle = crosshairColor;
        c.lineWidth = crosshairWidth;
        c.beginPath();
        c.moveTo(this.px_square(this.cx), this.py(this.cy - crosshairLength));
        c.lineTo(this.px_square(this.cx), this.py(this.cy - crosshairGap));
        c.moveTo(this.px_square(this.cx), this.py(this.cy + crosshairGap));
        c.lineTo(this.px_square(this.cx), this.py(this.cy + crosshairLength));
        c.moveTo(this.px_square(this.cx - crosshairLength), this.py(this.cy));
        c.lineTo(this.px_square(this.cx - crosshairGap), this.py(this.cy));
        c.moveTo(this.px_square(this.cx + crosshairGap), this.py(this.cy));
        c.lineTo(this.px_square(this.cx + crosshairLength), this.py(this.cy));
        c.stroke();


    }


}