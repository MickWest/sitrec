import {abs, f2m, metersFromMiles, radians} from "../utils";
import {dispose} from "../threeExt";
import {BufferGeometry, Float32BufferAttribute, Mesh} from "three";
import seedrandom from "seedrandom";
import {drop} from "../SphericalMath";
import {CNode3DGroup} from "./CNode3DGroup";
import {NodeMan} from "../Globals";
import {CNodeCloudData} from "./CNodeCloudData";
import {par} from "../par";
import {assert} from "../assert.js";
import {V3} from "../threeUtils";

var rng;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
//    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
    return Math.floor(rng() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

class MultiCloudGeometry extends BufferGeometry {
    constructor(w, h, alt, radius) {
        super();
        this.type = 'CloudGeometry';
        //   this.type = 'PlaneGeometry';
        const indices = [];
        const vertices = [];
        const normals = [];
        const uvs = [];
        const xz = w / Math.sqrt(2)

        // using a fixed see for this RNG so clouds are in same place
        rng = seedrandom("x")

        var index = 0
        for (var x = -250; x < -50; x += 2) {
            for (var y = 50; y < 250; y += 2) {
                if (abs(x / y) > 0.5 && abs(x / y) < 3) {
                    var pos = V3(metersFromMiles(x) + getRandomInt(f2m(-5000), f2m(5000)),
                        alt - f2m(1500) - drop(metersFromMiles(x), metersFromMiles(y), metersFromMiles(radius)) + getRandomInt(f2m(-100), f2m(100)),
                        -metersFromMiles(y) + getRandomInt(f2m(-5000), f2m(5000)))

                    vertices.push(pos.x - xz / 2, pos.y + h / 2, pos.z + xz)
                    vertices.push(pos.x + xz / 2, pos.y + h / 2, pos.z - xz)
                    vertices.push(pos.x - xz / 2, pos.y - h / 2, pos.z + xz)
                    vertices.push(pos.x + xz / 2, pos.y - h / 2, pos.z - xz)

                    // normal is just the positive Z direction, i.e. back twards the camera
                    normals.push(0, 0, 1)
                    normals.push(0, 0, 1)
                    normals.push(0, 0, 1)
                    normals.push(0, 0, 1)

                    uvs.push(0, 1)
                    uvs.push(1, 1)
                    uvs.push(0, 0)
                    uvs.push(1, 0)

                    // default winding order for visibility is counter clockwise.
                    indices.push(index, index + 2, index + 1)
                    indices.push(index + 2, index + 3, index + 1)

                    index += 4;

                    //   cloudGroup.add(sphere)
                }
            }
        }
        this.setIndex(indices);
        this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    }

    toJSON() {
        assert(false, "CloudGeometry toJSON unimplemented")
    }
}




export class CNodeDisplayClouds extends CNode3DGroup {
    constructor(v) {
        super(v);
        this.checkInputs(["cloudData", "material"])

        this.input("wind")
        this.input("heading")

        this.w = f2m(6000)
        this.h = f2m(3000)

        this.cloudSprites = []

        this.cloudMesh = null;

        this.recalculate()

    }

    rebuild() {

        this.group.remove(this.cloudMesh)
        dispose(this.cloudGeometry)

        // now batch the geometry in a single mesh
        const cloudData = this.in.cloudData.v0
        const radius = this.in.radius.v0
        this.altitude = cloudData.altitude;
        this.cloudGeometry = new MultiCloudGeometry(this.w, this.h, this.altitude, radius)
        this.cloudMesh = new Mesh(this.cloudGeometry, this.in.material.v(0));

        this.cloudMesh.rotateY(-radians(this.in.heading.getHeading()))

        this.group.add(this.cloudMesh)

        this.propagateLayerMask()

    }

    dispose() {

        this.group.remove(this.cloudMesh)
        dispose(this.cloudGeometry)
        super.dispose()
    }

    recalculate() {
        this.rebuild()
        return
    }

    update(f) {
        // real simple shift the mesh byt the per-frame wind speed times the frame number
        var wind = this.in.wind.p(0).multiplyScalar(f)
        this.cloudMesh.position.copy(wind)

    }


}

