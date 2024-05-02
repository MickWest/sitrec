// The compass UI displays the compass rose and the heading
// base on an input camera node

import {CNodeViewUI} from "./CNodeViewUI";

export class   CNodeCompassUI extends CNodeViewUI {

    constructor(v) {
        super(v);
        this.input("camera");  // a camera node

        // addText(key, text, x, y, size, color, align, font) {
        this.text = this.addText("heading", "0°", 50, 20, 20, "white", "center", "Arial")

        this.cx = 50;
        this.cy = 60;
    }


    render(frame) {
        if (this.overlayView && !this.overlayView.visible) return;

        // get the three.js camera from the camera node
        const camera = this.in.camera.camera;

        // get the camera's forward vector, the negative z basis from its matrix
        const forward = camera.matrixWorld.elements.slice(8,11);
        const heading = -Math.atan2(forward[0], forward[2]);
        // convert to degrees
        const headingDeg = heading * 180 / Math.PI;
        // make sure it's positive
        const headingPos = (headingDeg + 360) % 360;
        // round to the nearest 0.1 degree
        const headingRound = Math.round(headingPos * 10) / 10;
        // set the text to the rounded heading
        this.text.text = headingRound + "°";

        // after updating the text, render the text
        super.render(frame)

        // now draw a centered arrow rotated by the heading

        // make a 2D point at 50,0 (north)
        // rotate it around 50,50 by the heading
        // draw a line from 50,50 to the rotated point


        const c = this.ctx;
        c.strokeStyle = '#FFFFFF';
        c.lineWidth = 2.5;
        c.beginPath();
        const length = 30
        // rLine draws lines rotated about cx,cy
        this.rLine(this.cx,this.cy+length,this.cx,this.cy-length,heading);
        this.rLine(this.cx,this.cy-length,this.cx-3,this.cy-length*0.5,heading);
        this.rLine(this.cx,this.cy-length,this.cx+3,this.cy-length*0.5,heading);
        c.stroke();

    }


}