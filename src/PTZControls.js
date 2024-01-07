import {radians} from "./utils";
import {V3} from "./threeExt";
import {getLocalUpVector} from "./SphericalMath";
import {ECEF2EUS, wgs84} from "./LLA-ECEF-ENU";
import {Sit} from "./Globals";

export class PTZControls {
    constructor(v,gui) {
        this.az = v.az;
        this.el = v.el
        this.fov = v.fov
        this.roll = v.roll
        this.camera = v.camera;

        if (v.showGUI) {
            gui.add(this, "az", -180, 180, 0.1).listen().name("Pan (Az)").onChange(v => this.refresh(v))
            gui.add(this, "el", -89, 89, 0.1).listen().name("Tilt (El)").onChange(v => this.refresh(v))
            gui.add(this, "fov", 0.1, 120, 0.1).listen().name("Zoom (fov)").onChange(v => this.refresh(v))
            if (this.roll !== undefined ) {
                gui.add(this, "roll", -90, 90, 0.1).listen().name("Roll").onChange(v => this.refresh(v))
            }
        }
        this.refresh()
    }

    refresh() {

        // Since we are in EUS, and the origin is at some arbritary point
        // we need to get the LOCAL up

        var fwd =   V3(0,0,-1) // North, parallel to the local tangent
        var right = V3(1,0,0)  // East
        var up = V3(0,1,0)     // up


        up = getLocalUpVector(this.camera.position, wgs84.RADIUS)

        // to get a northish direction we get the vector from here to the north pole.
        // to get the north pole in EUS, we take the north pole's position in ECEF
        var northPoleECEF = V3(0,0,wgs84.RADIUS)
        var northPoleEUS = ECEF2EUS(northPoleECEF,radians(Sit.lat),radians(Sit.lon),wgs84.RADIUS)
        var toNorth = northPoleEUS.clone().sub(this.camera.position).normalize()
        // take only the component perpendicular
        let dot = toNorth.dot(up)
        let north = toNorth.clone().sub(up.clone().multiplyScalar(dot)).normalize()
        let south = north.clone().negate()
        let east = V3().crossVectors(up, south)

        length = 100000;
        // DebugArrow("local East",east,this.camera.position,length,"#FF8080")
        // DebugArrow("local Up",up,this.camera.position,length,"#80FF90")
        // DebugArrow("local South",south,this.camera.position,length,"#8080FF")

        right = east;
        fwd = north;

        fwd.applyAxisAngle(right,radians(this.el))
        fwd.applyAxisAngle(up,-radians(this.az))
        this.camera.fov = this.fov;
        fwd.add(this.camera.position);
        this.camera.up = up;
        this.camera.lookAt(fwd)
        if (this.roll !== undefined ) {
            this.camera.rotateZ(radians(this.roll))
        }
    }

}

