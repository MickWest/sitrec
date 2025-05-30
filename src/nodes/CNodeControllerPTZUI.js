import {degrees, ExpandKeyframes, radians, RollingAverage} from "../utils";
import {getLocalUpVector} from "../SphericalMath";
import {ECEF2EUS, wgs84} from "../LLA-ECEF-ENU";
import {NodeMan, Sit} from "../Globals";

import {CNodeController} from "./CNodeController";
import {V3} from "../threeUtils";
import {assert} from "../assert";
import {Vector3} from "three";
import {DebugArrow} from "../threeExt";

const pszUIColor = "#C0C0FF";

// Generic controller that has azimuth, elevation, and zoom
export class CNodeControllerAzElZoom extends CNodeController {
    constructor(v) {
        super(v);
    }


    apply(f, objectNode ) {

        // Since we are in EUS, and the origin is at some arbritary point
        // we need to get the LOCAL up

        const camera = objectNode.camera

        //  since the user controls roll here, we don't want to use north for up
        var up = getLocalUpVector(camera.position, wgs84.RADIUS)


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

        var right = east;
        var fwd = north;

        let el = this.el
        let az = this.az
        if (this.relative) {
            // if we are in relative mode, then we just rotate the camera's fwd vector

            const xAxis = new Vector3()
            const yAxis = new Vector3()
            const zAxis = new Vector3()
            camera.updateMatrix();
            camera.updateMatrixWorld()
            camera.matrix.extractBasis(xAxis,yAxis,zAxis)
            fwd = zAxis.clone().negate()

            // project fwd onto the horizontal plane define by up
            // it's only relative to the heading, not the tilt
            let dot = fwd.dot(up)
            fwd = fwd.sub(up.clone().multiplyScalar(dot)).normalize()

            right = fwd.clone().cross(up)



        }


        fwd.applyAxisAngle(right,radians(el))
        fwd.applyAxisAngle(up,-radians(az))
        camera.fov = this.fov;
        assert(!Number.isNaN(camera.fov), "CNodeControllerPTZUI: camera.fov is NaN");
        assert(camera.fov !== undefined && camera.fov>0 && camera.fov <= 180, `bad fov ${camera.fov}` )
        fwd.add(camera.position);
        camera.up = up;
        camera.lookAt(fwd)
        if (this.roll !== undefined ) {
            camera.rotateZ(radians(this.roll))
        }

    }


}


// UI based version of this, PTZ = Az, El, Zoom, and have constants defined by the gui
export class CNodeControllerPTZUI extends CNodeControllerAzElZoom {
    constructor(v) {
        super(v);
        this.az = v.az;
        this.el = v.el
        this.fov = v.fov
        this.roll = v.roll
        this.relative = false;

        assert(v.fov !== undefined, "CNodeControllerPTZUI: initial fov is undefined")

        if (v.showGUI) {

            this.setGUI(v,"camera");
            const guiPTZ = this.gui;

            guiPTZ.add(this, "az", -180, 180, 0.1).listen().name("Pan (Az)").onChange(v => this.refresh()).setLabelColor(pszUIColor).wrap()
            guiPTZ.add(this, "el", -89, 89, 0.1).listen().name("Tilt (El)").onChange(v => this.refresh()).setLabelColor(pszUIColor)
            if (this.fov !== undefined) {
                guiPTZ.add(this, "fov", 0.01, 170, 0.1).listen().name("Zoom (fov)").onChange(v => this.refresh()).setLabelColor(pszUIColor).elastic(1, 170)
            }
            if (this.roll !== undefined ) {
                guiPTZ.add(this, "roll", -180, 180, 0.1).listen().name("Roll").onChange(v => this.refresh()).setLabelColor(pszUIColor)
            }
            guiPTZ.add(this, "relative").listen().name("Relative").onChange(v => this.refresh())
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
            relative: this.relative
        }
    }

    modDeserialize(v) {
        super.modDeserialize(v);
        this.az = v.az;
        this.el = v.el;
        this.fov = v.fov;
        this.roll = v.roll;
        this.relative = v.relative ?? false;
    }

    refresh(v) {
        // legacy check
        assert(v === undefined, "CNodeControllerPTZUI: refresh called with v, should be undefined");

        // the FOV UI node is also updated, It's a hidden UI element that remains for backwards compatibility.
        const fovUINode = NodeMan.get("fovUI", false)
        if (fovUINode) {
            fovUINode.setValue(this.fov);
        }

        // don't think this is needed
        this.recalculateCascade();
    }

}

export class CNodeControllerCustomAzEl extends CNodeControllerAzElZoom {
    constructor(v) {
        super(v);
        this.fallback = NodeMan.get(v.fallback);
        this.frames = Sit.frames;
        this.useSitFrames = true;

        this.relative = this.fallback.relative

    }

    // patch that if the relative mode is different from the fallback, we need to recalculate
    update(f) {
        if (this.relative !== this.fallback.relative) {
            this.relative = this.fallback.relative;
            this.recalculateCascade();
        }
        super.update(f);
    }

    setAzFile(azFile, azCol) {
        this.azFile = azFile;
        this.azCol = azCol;
        this.recalculate();
    }

    setElFile(elFile) {
        this.elFile = elFile;
    }

    recalculate() {

        if (this.azFile !== undefined) {
            assert(this.frames = Sit.frames, "CNodeControllerCustomAzEl: frames not set right");
            this.azArrayRaw = ExpandKeyframes(this.azFile, this.frames, 0, this.azCol);
            this.azArray = RollingAverage(this.azArrayRaw, 200);
        }
    }

    apply(f, objectNode ) {
        // default to the fallback at first, in case we don't have a file for az/el/zoom
        if (this.fallback) {
            this.az = this.fallback.az;
            this.el = this.fallback.el;
            this.fov = this.fallback.fov;
        }

        if (this.azArray) {
            this.az = this.azArray[f];
        }

        super.apply(f, objectNode);

    }




}

