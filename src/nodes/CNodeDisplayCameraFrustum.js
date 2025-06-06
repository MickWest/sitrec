import {radians, tan, unitsToMeters} from "../utils";
import {LineGeometry} from "three/addons/lines/LineGeometry.js";
import {Line2} from "three/addons/lines/Line2.js";
import {CNode3DGroup} from "./CNode3DGroup";
import {DebugArrow, DebugArrowAB, dispose, removeDebugArrow} from "../threeExt";
import {NodeMan} from "../Globals";
import {disposeMatLine, makeMatLine} from "../MatLines";
import {LineSegmentsGeometry} from "three/addons/lines/LineSegmentsGeometry.js";
import {Color, Ray, Raycaster, Sphere, Vector3} from "three";
import {getLocalUpVector} from "../SphericalMath";
import {wgs84} from "../LLA-ECEF-ENU";
import * as LAYER from "../LayerMasks";
import {isNaN} from "mathjs";
import {assert} from "../assert.js";
import {intersectSphere2} from "../threeUtils";

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

        //this.color = v.color.v();

        this.input("color")
        this.lastColor = {}
        this.lineWeigh = v.lineWeight ?? 1.5;

        this.units = v.units ?? "meters";
        this.step = v.step ?? 0;

        this.camera.visible = true;

        this.showQuad = v.showQuad ?? false;

        this.showFrustum = v.showFrustum ?? true;
        this.showHider("Camera View Frustum");
        this.guiToggle("showQuad", "Frustum Ground Quad")

        this.rebuild()
    }

    rebuild() {

        // TODO: This is rather messy in the way it handles colors and line materials
        // a CNodeGUIColor is returning a hex string, as that's what lil-gui uses
        // but would a CNodeConstant do the same?
        // generally color handling is a bit of a mess, and needs to be cleaned up
        // specifically the converting between various format. Can we settle on just one type for colors?
        // what about HDR later?

        // rebuild the matLine if the color or lineWeight has changed
        // (only color for now, but if lightWeight becomes a node, add that here)
        const color = this.in.color.v0;
        // we assume that the color is a THREE.Color
        // but we need a hex string for lil-gui
        // so we convert it to a hex string
        const hexColor = "#"+color.getHexString();

        if (this.matLine === undefined || hexColor !== this.lastColor) {
            disposeMatLine(this.matLine);
            this.matLine = makeMatLine(hexColor, this.lineWeigh);
            this.lastColor = hexColor;
        }


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

        if (this.showFrustum) {
            this.FrustumGeometry = new LineSegmentsGeometry();
            this.FrustumGeometry.setPositions(line_points);
            this.line = new Line2(this.FrustumGeometry, this.matLine);
            this.line.computeLineDistances();
            this.line.scale.setScalar(1);
            this.group.add(this.line)
        }
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


export class CNodeDisplayGroundMovement extends CNode3DGroup {
    constructor(v) {
        const cameraNode = NodeMan.get(v.camera ?? "lookCamera")
        if (v.id === undefined) {
            v.id = cameraNode.id+"_Frustum";
        }

        v.color ??= "white";
        v.layers ??= LAYER.MASK_LOOKRENDER;

        super(v);
        this.cameraNode = cameraNode;
        this.camera = this.cameraNode.camera;

        this.p1 = new Vector3(0, 0, 0);
        this.p2 = new Vector3(0, 0, 0);

        this.rebuild();



    }

    update(f) {
        this.rebuild();

    }


    rebuild() {

        this.p1.copy(this.p2);
        let center = null
        if (NodeMan.exists("TerrainModel")) {
            let terrainNode = NodeMan.get("TerrainModel")
            center = terrainCollideCameraRelative(terrainNode, this.camera, new Vector3(0, 0, -1000));
        }
        if (center === null) {
            // if we don't have a terrain model, then we can use the globe
            center = sphereCollideCameraRelative(new Sphere(new Vector3(0, -wgs84.RADIUS, 0), wgs84.RADIUS), this.camera, new Vector3(0, 0, -1000));
        }
        if (center === null) {
//            console.warn("CNodeDisplayGroundMovement: No ground found for camera at "+this.camera.position);
            removeDebugArrow(this.id+"_Arrow");
            return;
        }
        const localUp = getLocalUpVector(center);
        center.add(localUp); // add a little bit to the center to avoid z-fighting with the ground


        this.p2.copy(center);

        let dir = this.p2.clone().sub(this.p1);
        const length = this.p1.distanceTo(this.p2) * 30;

        if (length >0.1) {
            // export function DebugArrow(name, direction, origin, _length = 100, color="#FFFFFF", visible=true, parent, _headLength=20, layerMask=LAYER.MASK_HELPERS) {
            DebugArrow(this.id + "_Arrow", dir, this.p2, length, '#FFFF00', true, this.container, 10, LAYER.MASK_LOOKRENDER);
        }

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


