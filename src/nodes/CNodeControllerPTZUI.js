import {radians} from "../utils";
import {getLocalUpVector} from "../SphericalMath";
import {ECEF2EUS, wgs84} from "../LLA-ECEF-ENU";
import {gui, guiMenus, Sit} from "../Globals";

import {CNodeController} from "./CNodeController";
import {V3} from "../threeUtils";

const pszUIColor = "#C0C0FF";

export class CNodeControllerPTZUI extends CNodeController {
    constructor(v) {
        super(v);
        this.az = v.az;
        this.el = v.el
        this.fov = v.fov
        this.roll = v.roll

        if (v.showGUI) {
            const guiPTZ = v.gui ?? guiMenus.camera;

            guiPTZ.add(this, "az", -180, 180, 0.1).listen().name("Pan (Az)").onChange(v => this.refresh(v)).setLabelColor(pszUIColor)
            guiPTZ.add(this, "el", -89, 89, 0.1).listen().name("Tilt (El)").onChange(v => this.refresh(v)).setLabelColor(pszUIColor)
            if (this.fov !== undefined) {
                guiPTZ.add(this, "fov", 0.1, 120, 0.1).listen().name("Zoom (fov)").onChange(v => this.refresh(v)).setLabelColor(pszUIColor)
            }
            if (this.roll !== undefined ) {
                guiPTZ.add(this, "roll", -90, 90, 0.1).listen().name("Roll").onChange(v => this.refresh(v)).setLabelColor(pszUIColor)
            }
        }
       // this.refresh()
    }

    modSerialize() {
        return {
            ...super.modSerialize(),
            az: this.az,
            el: this.el,
            fov: this.fov,
            roll: this.roll,
        }
    }

    modDeserialize(v) {
        super.modDeserialize(v);
        this.az = v.az;
        this.el = v.el;
        this.fov = v.fov;
        this.roll = v.roll;
    }

    refresh(v) {
        // don't think this is needed
    }

    apply(f, objectNode ) {

        // would be good, but arrow keys are already used for frame advance, etc. 4565421
        // let rotationKeySpeed = 1;
        // if (isKeyHeld('Shift')) {
        //     rotationKeySpeed = 10;
        // }
        //
        // // rotate the camera with left and right arrow keys
        // if (isKeyHeld('ArrowLeft')) {
        //     this.az -= rotationKeySpeed;
        // }
        // if (isKeyHeld('ArrowRight')) {
        //     this.az += rotationKeySpeed;
        // }
        //
        // // rotate the camera with up and down arrow keys
        // // note we are using inverted Y, as it's like WASD game controllers
        // if (isKeyHeld('ArrowUp')) {
        //     this.el -= rotationKeySpeed;
        // }
        // if (isKeyHeld('ArrowDown')) {
        //     this.el += rotationKeySpeed;
        // }

        // Since we are in EUS, and the origin is at some arbritary point
        // we need to get the LOCAL up

        const camera = objectNode.camera
        
        var fwd =   V3(0,0,-1) // North, parallel to the local tangent
        var right = V3(1,0,0)  // East
        var up = V3(0,1,0)     // up


        up = getLocalUpVector(camera.position, wgs84.RADIUS)


        // to get a northish direction we get the vector from here to the north pole.
        // to get the north pole in EUS, we take the north pole's position in ECEF
        var northPoleECEF = V3(0,0,wgs84.RADIUS)
        var northPoleEUS = ECEF2EUS(northPoleECEF,radians(Sit.lat),radians(Sit.lon),wgs84.RADIUS)
        var toNorth = northPoleEUS.clone().sub(camera.position).normalize()
        // take only the component perpendicular
        let dot = toNorth.dot(up)
        let north = toNorth.clone().sub(up.clone().multiplyScalar(dot)).normalize()
        let south = north.clone().negate()
        let east = V3().crossVectors(up, south)

        length = 100000;
        // DebugArrow("local East",east,camera.position,length,"#FF8080")
        // DebugArrow("local Up",up,camera.position,length,"#80FF90")
        // DebugArrow("local South",south,camera.position,length,"#8080FF")

        right = east;
        fwd = north;

        fwd.applyAxisAngle(right,radians(this.el))
        fwd.applyAxisAngle(up,-radians(this.az))
        camera.fov = this.fov;
        fwd.add(camera.position);
        camera.up = up;
        camera.lookAt(fwd)
        if (this.roll !== undefined ) {
            camera.rotateZ(radians(this.roll))
        }

    }

}

