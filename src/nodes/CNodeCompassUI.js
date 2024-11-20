// The compass UI displays the compass rose and the heading
// base on an input camera node

import {CNodeViewUI} from "./CNodeViewUI";
import {getLocalNorthVector, getLocalUpVector} from "../SphericalMath";
import {Vector3} from "three";
import {MV3} from "../threeUtils";
import {ViewMan} from "./CNodeView";

export class   CNodeCompassUI extends CNodeViewUI {

    constructor(v) {
        super(v);
        this.input("camera");  // a camera node

        // addText(key, text, x, y, size, color, align, font) {
        this.text = this.addText("heading", "0°", 50, 20, 20, "white", "center", "Arial")

        this.cx = 50;
        this.cy = 60;
        this.doubleClickFullScreen = false;
    }


    onMouseDown(e, mouseX, mouseY) {
        // clicking on the compass in the main view should rotate the view to north
        // There's a plane defined by the camera's position and the local up vector and the north pole
        // the camera shoudl end up with it up and forward vectors in that plane
        // and the right vector pointing east
        // so the camera's rotation matrix should be set to that

        const mainView = ViewMan.get("mainView");
        mainView.controls.fixUp(true);
        mainView.controls.fixHeading(0)


    }


    renderCanvas(frame) {
        if (this.overlayView && !this.overlayView.visible) return;


        // get the three.js camera from the camera node
        const camera = this.in.camera.camera;

        // get local up vector, the headings are the angle about this axis.
        const up = getLocalUpVector(camera.position);

        // get the camera's forward vector, the negative z basis from its matrix
        const forward = MV3(camera.matrixWorld.elements.slice(8,11));

        // get the north vector
        const north = getLocalNorthVector(camera.position);

        // project the forward vector onto the horizontal plane defined by up
        const forwardH = forward.clone().sub(up.clone().multiplyScalar(forward.dot(up)));

        // same with the north vector
        const northH = north.clone().sub(up.clone().multiplyScalar(north.dot(up)));

        // get the angle between the forward vector and the north vector
        // using the three.js angleTo function
        let heading = Math.PI - forwardH.angleTo(northH);


        // get the east vector
        const east = north.clone().cross(up);

        // is it east (positive) or west (negative)
        if (forwardH.dot(east) > 0) {
            heading = -heading;
        }





        // convert to degrees
        const headingDeg = heading * 180 / Math.PI;
        // make sure it's positive
        const headingPos = (headingDeg + 360) % 360;
        // round to the nearest 0.1 degree
        const headingRound = Math.round(headingPos * 10) / 10;
        // set the text to the rounded heading
        this.text.text = headingRound + "°";

        // after updating the text, render the text
        super.renderCanvas(frame)

        // now draw a centered arrow rotated by the heading

        // make a 2D point at 50,0 (north)
        // rotate it around 50,50 by the heading
        // draw a line from 50,50 to the rotated point


        const c = this.ctx;
        c.strokeStyle = '#FFFFFF';
        c.lineWidth = 2.5;
        c.beginPath();
        const length = 30;
        const gap = 10;
        const segment = (length ) / 2
        // rLine draws lines rotated about cx,cy
        //this.rLine(this.cx,this.cy+length,this.cx,this.cy-length,heading);

        this.rLine(this.cx,this.cy+length,this.cx,this.cy+gap,heading);
        this.rLine(this.cx,this.cy-length,this.cx,this.cy-gap,heading);


        this.rLine(this.cx,this.cy-length,this.cx-3,this.cy-length*0.5,heading);
        this.rLine(this.cx,this.cy-length,this.cx+3,this.cy-length*0.5,heading);
        c.stroke();

        // draw the letter N in the center
        c.fillStyle = '#FFFFFF';
        c.font = this.px(17)+'px Arial';
        c.textAlign = 'center';
        c.fillText('N', this.px(this.cx), this.py(this.cy+7));


    }


}