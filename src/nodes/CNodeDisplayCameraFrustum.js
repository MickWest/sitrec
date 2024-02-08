import {radians, tan} from "../utils";
import {LineGeometry} from "../../three.js/examples/jsm/lines/LineGeometry";
import {Line2} from "../../three.js/examples/jsm/lines/Line2";
import {CNode3DGroup} from "./CNode3DGroup";
import {assert} from "../utils"
import {dispose} from "../threeExt";
import {NodeMan, Sit} from "../Globals";
import {makeMatLine} from "../MatLines";

export class CNodeDisplayCameraFrustumATFLIR extends CNode3DGroup {
    constructor(v) {
        super(v);
        this.radius = v.radius ?? 100
        this.fov = v.fov

        this.color = v.color
        this.lineWeigh = v.lineWeight ?? 1;
        this.matLine = makeMatLine(this.color, this.lineWeigh)


        var s = this.radius * tan(radians(this.fov))
        var d = -(this.radius - 2)
        const line_points = [
            0, 0, 0, s, s, -d,
            0, 0, 0, s, -s, -d,
            0, 0, 0, -s, -s, -d,
            0, 0, 0, -s, s, -d,
            -s, -s, -d,
            s, -s, -d,
            s, s, -d,
            -s, s, -d,
            -s / 2, s, -d,
            0, s * 1.3, -d,
            s / 2, s, -d,
        ]
        this.FrustumGeometry = new LineGeometry();
        this.FrustumGeometry.setPositions(line_points);
        var line = new Line2(this.FrustumGeometry, this.matLine);
        line.computeLineDistances();
        line.scale.setScalar(1);
        this.group.add(line)
    }
}

export class CNodeDisplayCameraFrustum extends CNode3DGroup {
    constructor(v) {
       // v.container = v.camera;
        super(v);
        this.radius = v.radius ?? 100
        this.camera = NodeMan.get(v.camera).camera;

        this.color = v.color.v();
        this.lineWeigh = v.lineWeight ?? 1;
        this.matLine = makeMatLine(this.color, this.lineWeigh);

        this.camera.visible = true;

        this.rebuild()
    }

    rebuild() {

        this.group.remove(this.line)
        dispose(this.FrustumGeometry)

        var h = this.radius * tan(radians(this.camera.fov/2))
        // aspect is w/h so w = h * aspect
        var w = h * this.camera.aspect;
        var d = (this.radius - 2)
//        console.log("REBUILDING FRUSTUM h="+h+" w="+w+" d="+d);
        const line_points = [
            0, 0, 0, w, h, -d,
            0, 0, 0, w, -h, -d,
            0, 0, 0, -w, -h, -d,
            0, 0, 0, -w, h, -d,
            -w, -h, -d,
            w, -h, -d,
            w, h, -d,
            -w, h, -d,
            -w / 2, h, -d,
            0, h * 1.3, -d,
            w / 2, h, -d,
        ]
        this.FrustumGeometry = new LineGeometry();
        this.FrustumGeometry.setPositions(line_points);
        this.line = new Line2(this.FrustumGeometry, this.matLine);
        this.line.computeLineDistances();
        this.line.scale.setScalar(1);
        this.group.add(this.line)
        this.propagateLayerMask();
        this.lastFOV = this.camera.fov;
    }

    update() {
        this.group.position.copy(this.camera.position)
        this.group.quaternion.copy(this.camera.quaternion)
        this.group.updateMatrix();
        if (this.lastFOV !== this.camera.fov || this.lastAspect !== this.camera.aspect) {
            this.lastAspect = this.camera.aspect;
            this.lastFOV = this.camera.fov;
            this.rebuild();
        }
    }
}


