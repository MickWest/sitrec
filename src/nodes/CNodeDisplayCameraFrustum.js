import {radians, tan, unitsToMeters} from "../utils";
import {LineGeometry} from "three/addons/lines/LineGeometry";
import {Line2} from "three/addons/lines/Line2";
import {CNode3DGroup} from "./CNode3DGroup";
import {assert} from "../utils"
import {DebugArrow, DebugArrowAB, dispose, intersectSphere2} from "../threeExt";
import {guiShowHide, NodeMan, Sit} from "../Globals";
import {makeMatLine} from "../MatLines";
import {LineSegmentsGeometry} from "three/addons/lines/LineSegmentsGeometry";
import {Ray, Raycaster, Sphere, Vector3} from "three";
import {getLocalUpVector, pointOnSphereBelow} from "../SphericalMath";
import {wgs84} from "../LLA-ECEF-ENU";
import {CNodeLabel3D, CNodeMeasureAB, CNodeMeasureAltitude} from "./CNodeLabels3D";
import * as LAYER from "../LayerMasks";
import {isNaN} from "mathjs";

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

        const cameraNode = NodeMan.get(v.camera ?? "lookCamera")
        if (v.id === undefined) {
            v.id = cameraNode.id+"_Frustum";
        }

        v.color ??= "white";
        v.layers ??= LAYER.MASK_HELPERS;
       // v.container = v.camera;
        super(v);
        this.radius = v.radius ?? 100
        this.input("targetTrack",true)
        this.cameraNode = cameraNode;
        this.camera = this.cameraNode.camera;

        this.color = v.color.v();
        this.lineWeigh = v.lineWeight ?? 1.5;
        this.matLine = makeMatLine(this.color, this.lineWeigh);

        this.units = v.units ?? "meters";
        this.step = v.step ?? 0;

        this.camera.visible = true;

        this.showQuad = v.showQuad ?? false;

        this.guiToggle("showQuad", "Show Frustum Quad")

        this.rebuild()
    }

    rebuild() {

        this.group.remove(this.line)
        dispose(this.FrustumGeometry)

        var h = this.radius * tan(radians(this.camera.fov/2))
        assert(!isNaN(h), "h is NaN, fov="+this.camera.fov+" radius="+this.radius+" aspect="+this.camera.aspect+" units="+this.units+" step="+this.step);
        // aspect is w/h so w = h * aspect
        var w = h * this.camera.aspect;
        var d = (this.radius - 2)
//        console.log("REBUILDING FRUSTUM h="+h+" w="+w+" d="+d);
        const line_points = [
            0, 0, 0, w, h, -d,
            0, 0, 0, w, -h, -d,
            0, 0, 0, -w, -h, -d,
            0, 0, 0, -w, h, -d,
            -w, -h, -d, w, -h, -d,
            w, -h, -d,  w, h, -d,
            w, h, -d, -w, h, -d,
            -w, h, -d, -w, -h, -d,
            // -w / 2, h, -d,
            // 0, h * 1.3, -d,
            // w / 2, h, -d,
        ]

        if (this.step > 0) {

            const step = unitsToMeters(this.units,this.step);

            for (let r = step; r < this.radius; r += step) {
                h = r * tan(radians(this.camera.fov / 2))
                w = h * this.camera.aspect;
                d = r;
                line_points.push(
                    -w, -h, -d, w, -h, -d,
                    w, -h, -d, w, h, -d,
                    w, h, -d, -w, h, -d,
                    -w, h, -d, -w, -h, -d,
                )
            }

        }


        function terrainCollideCameraRelative(terrain, camera, localPos) {
            const pos = camera.localToWorld(localPos);
            const rayCaster = new Raycaster(camera.position, pos.sub(camera.position).normalize());
            const ground = terrain.getClosestIntersect(rayCaster);
            if (ground !== null) {
                return ground.point;
            }
            return null;
        }

        function sphereCollideCameraRelative(sphere, camera, localPos) {
            const pos = camera.localToWorld(localPos);
            const ray = new Ray(camera.position, pos.sub(camera.position).normalize());
            const sphereCollision = new Vector3();
            if (intersectSphere2(ray, sphere, sphereCollision))
                return sphereCollision;
            return null;

        }


// WORK IN PROGRESS.  calculating the ground quadrilateral intersecting the frustum with the ground

        if (this.showQuad) {

            let corner = new Array(4)

            if (NodeMan.exists("TerrainModel")) {
                let terrainNode = NodeMan.get("TerrainModel")
                corner[0] = terrainCollideCameraRelative(terrainNode, this.camera, new Vector3(-w, -h, -d))
                corner[1] = terrainCollideCameraRelative(terrainNode, this.camera, new Vector3(w, -h, -d))
                corner[2] = terrainCollideCameraRelative(terrainNode, this.camera, new Vector3(w, h, -d))
                corner[3] = terrainCollideCameraRelative(terrainNode, this.camera, new Vector3(-w, h, -d))
            } else {
                corner[0] = null;
                corner[1] = null;
                corner[2] = null;
                corner[3] = null;
            }

            // if any corner is null, then we don't have a complete quadrilateral
            // so we try the collisions again, but this time against a globe, a sphere
            // if all corners are nell then radius of the globle is wgs84.radius
            // otherwise it's the average.
            // note the results are in world space
            const sphereCenter = new Vector3(0, -wgs84.RADIUS, 0);
            // first calculate the radius of the sphere
            let sphereRadius = wgs84.RADIUS;
            // let n = 0;
            // let rSum = 0;
            // for (let i = 0; i < 4; i++) {
            //     if (corner[i] !== null) {
            //         n++;
            //         rSum += corner[i].clone().sub(sphereCenter).length();
            //     }
            // }
            // if (n > 0) {
            //     sphereRadius = rSum / n;
            // }

            // now make a sphere with that radius
            const globe = new Sphere(sphereCenter, sphereRadius);

            // now we can try the sphere collisions for any that missed the terrain
            if (corner[0] === null) {
                corner[0] = sphereCollideCameraRelative(globe, this.camera, new Vector3(-w, -h, -d))
            }
            if (corner[1] === null) {
                corner[1] = sphereCollideCameraRelative(globe, this.camera, new Vector3(w, -h, -d))
            }
            if (corner[2] === null) {
                corner[2] = sphereCollideCameraRelative(globe, this.camera, new Vector3(w, h, -d))
            }
            if (corner[3] === null) {
                corner[3] = sphereCollideCameraRelative(globe, this.camera, new Vector3(-w, h, -d))
            }

            // if we have all 4 corners, then we can draw the quadrilateral
            // Construct the quadrilateral from the corners
            // converting them back to local space, as they are attached to the camera
            if (corner[0] !== null && corner[1] !== null && corner[2] !== null && corner[3] !== null) {
                const localUp = getLocalUpVector(corner[0])
                corner[0] = this.camera.worldToLocal(corner[0]).add(localUp);
                corner[1] = this.camera.worldToLocal(corner[1]).add(localUp);
                corner[2] = this.camera.worldToLocal(corner[2]).add(localUp);
                corner[3] = this.camera.worldToLocal(corner[3]).add(localUp);
                line_points.push(
                    corner[0].x, corner[0].y, corner[0].z,
                    corner[1].x, corner[1].y, corner[1].z,
                    corner[1].x, corner[1].y, corner[1].z,
                    corner[2].x, corner[2].y, corner[2].z,
                    corner[2].x, corner[2].y, corner[2].z,
                    corner[3].x, corner[3].y, corner[3].z,
                    corner[3].x, corner[3].y, corner[3].z,
                    corner[0].x, corner[0].y, corner[0].z,
                )
            }

        }

        this.FrustumGeometry = new LineSegmentsGeometry();
        this.FrustumGeometry.setPositions(line_points);
        this.line = new Line2(this.FrustumGeometry, this.matLine);
        this.line.computeLineDistances();
        this.line.scale.setScalar(1);
        this.group.add(this.line)
        this.propagateLayerMask();
        this.lastFOV = this.camera.fov;



    }

    update(f) {

        const fov = this.camera.fov

        assert(fov !== undefined,"FOV is undefined for camera controlled by "+this.id)
        assert(!isNaN(fov),"FOV is NaN for "+this.id)

        // if we have a target track, then we can use that to set the radius (distance to the end of the frustum)
        if (this.in.targetTrack !== undefined) {
            const targetPos = this.in.targetTrack.p(f)
            this.radius = targetPos.clone().sub(this.camera.position).length()
        }

      //  this.label.changePosition(this.camera.position)

        // const A = this.camera.position;
        // let B;
        // if (NodeMan.exists("TerrainModel")) {
        //     let terrainNode = NodeMan.get("TerrainModel")
        //     B = terrainNode.getPointBelow(A)
        // } else {
        //     B = pointOnSphereBelow(A);
        // }
     //   this.measureAltitude.changeAB(A,B)

        this.group.position.copy(this.camera.position)
        this.group.quaternion.copy(this.camera.quaternion)
        this.group.updateMatrix();
        this.group.updateMatrixWorld();
    //    if (this.lastFOV !== this.camera.fov || this.lastAspect !== this.camera.aspect || (this.in.targetTrack !== undefined)) {
            this.lastAspect = this.camera.aspect;
            this.lastFOV = this.camera.fov;
            this.rebuild();
    //    }
    }
}


