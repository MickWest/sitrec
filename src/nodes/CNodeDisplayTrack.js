//
import {guiMenus, guiShowHide, NodeMan, Sit} from "../Globals";
import {dispose} from "../threeExt";
import {LineGeometry} from "three/addons/lines/LineGeometry.js";
import {LineMaterial} from "three/addons/lines/LineMaterial.js";

import {Line2} from "three/addons/lines/Line2.js";
import {CNode3DGroup} from "./CNode3DGroup";
import {wgs84} from "../LLA-ECEF-ENU";
import {drop, getLocalSouthVector, getLocalUpVector, pointOnSphereBelow} from "../SphericalMath";
import {AlwaysDepth, Color, LessDepth} from "three";
import {CNodeDisplayTargetSphere} from "./CNodeDisplayTargetSphere";
import * as LAYER from "../LayerMasks";
import {assert} from "../assert.js";
import {convertColorInput} from "../ConvertColorInputs";
import {par} from "../par";
import {hexColor} from "../threeUtils";
import {CNodeGUIValue} from "./CNodeGUIValue";

// just import THREE from three
import * as THREE from "three";

export class CNodeDisplayTrack extends CNode3DGroup {
    constructor(v) {
        v.layers ??= LAYER.MASK_HELPERS;
        super(v);

        // convert any color inputs to Color objects
        convertColorInput(v,"color",this.id)
        convertColorInput(v,"badColor",this.id)
        convertColorInput(v,"secondColor",this.id)
        convertColorInput(v,"dropColor",this.id)

        // newer method - allow input nodes to be declared outside the inputs object
        // and automatically convert constant inputs to CConstantNodes
        this.input("track") // track contains position, and optionally color
        this.input("dataTrackDisplay", true); // optional data track for reference
        this.optionalInputs(["dataTrack"]) // trackData contains altitudeOffset. It's th

        this.input("color") // or color can be supplied in a seperate node
        this.optionalInputs(["badColor", "secondColor"]) // to be used if a segment is flagged as "bad"
        this.input("width") // Width currently only working as a constant (v0 is used)

        this.optionalInputs(["dropColor"])

        this.ignoreAB = v.ignoreAB ?? false;

    //    assert(this.in.track.p(0) !== undefined, "CNodeDisplayTrackPosition needs input with position")

        this.frames = v.frames ?? this.in.track.frames;
        this.useSitFrames = this.in.track.useSitFrames;

        this.lineOpacity = v.lineOpacity ?? 0.5;
        this.polyOpacity = v.polyOpacity ?? 0.1;

        this.trackGeometry = null
        this.trackLine = null

        this.showTrackWalls = v.showTrackWalls ?? false;
        this.showCap = v.showCap ?? false;

        this.depthFunc = v.depthFunc ?? LessDepth;
        this.depthWrite = v.depthWrite ?? false;

        // functions are strings in new sitches
        if (this.depthFunc === "AlwaysDepth") this.depthFunc = AlwaysDepth;
        if (this.depthFunc === "LessDepth") this.depthFunc = LessDepth;

        if (v.autoSphere) {
            new CNodeDisplayTargetSphere({
                id: this.id+"_autoSphere",
                inputs: {
                    track: this.in.track,
//                    size: new CNodeScale(this.id+"_sizeScaledAuto", scaleF2M,
//                        new CNodeGUIValue({value:Sit.targetSize,start:1,end:2000, step:0.1, desc:"Target size ft"},gui)
//                    )
                },
                size: v.autoSphere,
                color: this.in.color.v0,
                layers: LAYER.MASK_HELPERS,
            })
        }


        this.displayColor = this.in.color.v0
        this.visible = true

        if (!v.skipGUI) {
            this.gui = v.gui ?? "contents";
            this.guiFolder = guiMenus[this.gui].addFolder(this.id).close();

            this.minGUIColor = 0.6;

            // set the color of the folder (and its content) to the track color
            // but we have a minimum value to ensure it's visible
            this.guiFolder.setLabelColor(this.in.color.v0, this.minGUIColor);


            // toggle for visibility with optional linked data track
            this.guiFolder.add(this, "visible").listen().onChange(() => {
                this.show(this.visible);
                if (this.in.dataTrackDisplay !== undefined) {
                    this.in.dataTrackDisplay.visible = this.visible
                    this.in.dataTrackDisplay.show(this.visible)
                }
            })

            // // toggle for visibility of the mesh (vertical semi-transparent polygons
            this.guiFolder.add(this, "showTrackWalls").name("Track Walls").listen().onChange(() => {
                // just rebuild it, which will remove the mest based on the flag
                console.log("showTrackWalls changed to "+this.showTrackWalls)
                if (this.in.dataTrackDisplay !== undefined) {
                    this.in.dataTrackDisplay.showTrackWalls = this.showTrackWalls
                    this.in.dataTrackDisplay.recalculate()
                } else {

                    // any track can have walls.
                    this.recalculate()
                }
            })

            // color picker for the track color, with optional linked data track

            this.guiColor = this.guiFolder.addColor(this, "displayColor").onChange(() => {

                this.guiFolder.setLabelColor(this.in.color.v0, this.minGUIColor);

                this.in.color.value = this.displayColor
                this.recalculate()
                if (this.in.dataTrackDisplay !== undefined) {
                    this.in.dataTrackDisplay.displayColor = this.displayColor
                    this.in.dataTrackDisplay.in.color.value = this.displayColor
                    this.in.dataTrackDisplay.recalculate()
                }
            })


            const track = this.in.dataTrack;
            if (track !== undefined) {
                track.altitudeOffset = 0;

                new CNodeGUIValue({
                    id: this.id + "altitudeOffset",
                    value: 0,
                    start: -1000,
                    end: 1000,
                    step: 1,
                    desc: "Alt offset",
                    unitType: "small",
                    onChange: (v) => {
                        track.altitudeOffset = v;
                        track.recalculateCascade()
                    },
                }, this.guiFolder)

                track.altitudeOffset = 0;

                new CNodeGUIValue({
                    id: this.id + "altitudeLock",
                    value: 0,
                    start: -1,
                    end: 1000,
                    step: 1,
                    desc: "Alt Lock (-1 = off)",
                    unitType: "small",
                    onChange: (v) => {
                        track.altitudeLock = v;
                        track.recalculateCascade()
                    },
                    elastic: true,
                    elasticMin: 1000,
                    elasticMax: 100000,
                }, this.guiFolder)


            }

            this.guiFolder.add(this, "gotoTrack").name("Go to track");

        }

        this.simpleSerials.push("showTrackWalls")

        this.recalculate()
    }

    gotoTrack() {

        console.log("Going to track "+this.id)

        // get current location from the track
        const trackPoint = this.in.track.v(par.frame).position;

        // get the local up vector at the track point
        const up = getLocalUpVector(trackPoint);
        // and south vector
        const south = getLocalSouthVector(trackPoint);
        // make a point 20m above, and 200m south
        const target = trackPoint.clone().add(up.clone().multiplyScalar(20)).add(south.clone().multiplyScalar(200));
        // get the mainCamera
        const mainCamera = NodeMan.get("mainCamera").camera;
        // set the position to the target
        mainCamera.position.copy(target);
        // Set up to local up
        mainCamera.up.copy(up);
        // and look at the track point
        mainCamera.lookAt(trackPoint);



    }


    update() {
        // recalculate, so we
      //  this.recalculate()
    }

    dispose() {
        this.group.remove(this.trackLine)
        dispose(this.trackGeometry)
        this.removeTrackWall();
        super.dispose();
    }

    modSerialize() {

        return {
            ...super.modSerialize(),
            displayColor: hexColor(this.displayColor),
            visible: this.visible,

        }
    }

    modDeserialize(v) {
        super.modDeserialize(v);
        this.displayColor = new Color(v.displayColor);
        this.in.color.value = this.displayColor;
        if (this.guiFolder !== undefined) {
            this.guiFolder.setLabelColor(this.in.color.v0, this.minGUIColor);
        }

        if (this.guiColor !== undefined) {
            // also set the color in the GUI Picker by updateing the display from the value
            this.guiColor.updateDisplay();
        }

        this.visible = v.visible;
        this.show(this.visible);
    }


    recalculate() {
        this.group.remove(this.trackLine)
        const line_points = [];
        const line_colors = [];
        assert(this.inputs.track !== undefined, "CNodeDisplayTrack: track input is undefined, id="+this.id)
        for (var f = 0; f < this.frames; f++) {
            let trackPoint = this.in.track.v(f)
            assert(trackPoint !== undefined, "CNodeDisplayTrack: trackPoint is undefined, id="+this.id+" frame="+f)

            // if it's a vector3 (e.g. from a fixed position), then fake the trackPoint structure
            if (trackPoint.x !== undefined) {
                trackPoint = {position: trackPoint}
            }

            // we skip over undefined points, so we can display tracks that
            // don't fully have all the data
            // like if we got a track from ADSBX, but stopped it in the middle of the video segments
            // instead of playing it past the end.
            // also skips over invalid points, which will return trackPoint = {},
            // so we use .? to check both trackPoint being valid, and trackPoint.position being valid
            if (trackPoint?.position !== undefined) {

                var A = trackPoint.position
                assert(!isNaN(A.x) && !isNaN(A.y) && !isNaN(A.z), "CNodeDisplayTrack: trackPoint has NaNs in position, id=" + this.id + " frame=" + f);

                line_points.push(A.x, A.y, A.z);
                var color = trackPoint.color // the track itself can override the color defaults
                if (color === undefined) {
          //         if (f <= par.frame || this.in.secondColor === undefined)
                        color = this.in.color.v(f)
          //          else
          //              color = this.in.secondColor.v(f)

                    if (trackPoint.bad)
                        if (this.in.badColor !== undefined)
                            color = this.in.badColor.v(f) // display can specify a "bad" color
                        else
                            color = {r: 1, g: 0, b: 0};  // "bad" default color is red
                }

                if (!this.ignoreAB && (f < Sit.aFrame || f > Sit.bFrame)) {
                    if (this.in.secondColor !== undefined)
                        color = this.in.secondColor.v(f)
                    else
                        color = {r: 0.25, g: 0.25, b: 0.25}
                }

                color = new Color(color)

                line_colors.push(color.r, color.g, color.b)
                var dropColor;
                if (this.in.dropColor === undefined) {
                    // if no color give, then use the main color * 0.75
                    dropColor = {r: color.r * 0.75, g: color.g * 0.75, b: color.b * 0.75}
                } else {
                    dropColor = this.in.dropColor.v(f)
                }
            }
        }
        dispose(this.trackGeometry)
        this.trackGeometry = new LineGeometry();



        assert(line_points.length > 0, "CNodeDisplayTrack: no points in track "+this.id)

        // find the mid point of line_points, and make the track relative to that
        var mid = {x: 0, y: 0, z: 0}
        for (var i = 0; i < line_points.length; i += 3) {
            mid.x += line_points[i]
            mid.y += line_points[i + 1]
            mid.z += line_points[i + 2]
        }
        mid.x /= line_points.length / 3
        mid.y /= line_points.length / 3
        mid.z /= line_points.length / 3

        for (var i = 0; i < line_points.length; i += 3) {
            line_points[i] -= mid.x
            line_points[i + 1] -= mid.y
            line_points[i + 2] -= mid.z
        }


        this.trackGeometry.setPositions(line_points);
        this.trackGeometry.setColors(line_colors);

//        var material1 = this.in.color.v(0)

        var width = 1
        if (this.in.width != undefined)
            width = this.in.width.v0

        var matLineTrack = new LineMaterial({

            color: 0xffffff,
         //   color: 0xff0000,
            linewidth: width, // in world units with size attenuation, pixels otherwise
            vertexColors: true,

            //resolution:  // to be set by this.renderer, eventually
            dashed: false,
            alphaToCoverage: false, // haivng this as true gives little end-of-segment artifacts

   //         depthTest: true,
   //         depthWrite: true,
            depthFunc: this.depthFunc,

        });

        matLineTrack.resolution.set(window.innerWidth, window.innerHeight)

        this.trackLine = new Line2(this.trackGeometry, matLineTrack);

        this.trackLine.computeLineDistances();
        this.trackLine.scale.set(1, 1, 1);

        // position this object at the mid point of the track, the track vertices are relative to this point
        // for precision
        this.trackLine.position.set(mid.x, mid.y, mid.z)

        this.group.add(this.trackLine);

        this.propagateLayerMask()

        // check if this.in.track is a CNodeMISBDataTrack
        // if so, then we need to update the track mesh


        // OLD CHECK REMOVED, as we now have showTrackWalls as a parameter
   //     if (this.in.track.constructor.name === "CNodeMISBDataTrack") {
             this.makeTrackWall(color, dropColor, this.lineOpacity, this.polyOpacity)
   //     }
    }


    removeTrackWall() {
        if (this.trackWall) {
            // note the track wall includes the cap on KML polygons
            this.group.remove(this.trackWall);
            dispose(this.trackWall.geometry);
            this.trackWall.geometry = null;
            this.trackWall = null;
        }

        // If we also had lines from a prior call, remove/dispose of them
        if (this.trackLines) {
            this.group.remove(this.trackLines);
            dispose(this.trackLines.geometry);
            this.trackLines.geometry = null;
            this.trackLines = null;
        }
    }

    makeTrackWall(lineColor, polyColor, lineOpacity = 1, polyOpacity = 1) {
        // Remove any previous mesh
        this.removeTrackWall();

        if (this.showTrackWalls === false) {
            return;
        }

        // Gather the track points just as in recalculate(), but also gather their corresponding
        // bottom points on the sphere. We'll build a mesh that spans each top segment down.
        const linePoints = [];
        const groundPoints = [];
        assert(this.inputs.track !== undefined, "CNodeDisplayTrack: track input is undefined, id=" + this.id);

        // get the number of frames
        const frames = this.in.track.frames;

        for (let f = 0; f < frames; f++) {
            let trackPoint = this.in.track.v(f);
            if (trackPoint && trackPoint.x !== undefined) {
                // If it's a Vector3, wrap it
                trackPoint = { position: trackPoint };
            }
            if (trackPoint?.position !== undefined) {
                const A = trackPoint.position;
                assert(!isNaN(A.x) && !isNaN(A.y) && !isNaN(A.z), "CNodeDisplayTrack: trackPoint has NaNs, id=" + this.id + " frame=" + f);

                // The top point
                linePoints.push(A);
                // The corresponding bottom point on the sphere (assume this function is given)
                const bottom = pointOnSphereBelow(A);
                groundPoints.push(bottom);
            }
        }

        assert(linePoints.length > 1, "CNodeDisplayTrack: not enough points for mesh in track " + this.id);

        // Find the midpoint as in recalculate()
        const mid = { x: 0, y: 0, z: 0 };
        for (let i = 0; i < linePoints.length; i++) {
            mid.x += linePoints[i].x;
            mid.y += linePoints[i].y;
            mid.z += linePoints[i].z;
        }
        mid.x /= linePoints.length;
        mid.y /= linePoints.length;
        mid.z /= linePoints.length;

        // Build a single BufferGeometry that forms a strip of quads from top to bottom.
        // Each consecutive pair of top points (p1, p2) plus bottom points (g1, g2)
        // forms a pair of triangles.
        const vertices = [];
        const normals = [];
        const uvs = [];

        function addTriangle(p1, p2, p3) {
            // Vector edges for cross product
            const v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
            const v2 = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z };
            // Cross
            const nx = v1.y * v2.z - v1.z * v2.y;
            const ny = v1.z * v2.x - v1.x * v2.z;
            const nz = v1.x * v2.y - v1.y * v2.x;
            // Normalize
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            const invLen = 1.0 / len;
            const Nx = nx * invLen;
            const Ny = ny * invLen;
            const Nz = nz * invLen;

            // Push positions
            [p1, p2, p3].forEach((pt) => {
                const rx = pt.x - mid.x;
                const ry = pt.y - mid.y;
                const rz = pt.z - mid.z;
                vertices.push(rx, ry, rz);
                normals.push(Nx, Ny, Nz);
                // Simple placeholder for UV
                uvs.push(0, 0);
            });
        }

        for (let i = 0; i < linePoints.length - 1; i++) {
            const p1 = linePoints[i];
            const p2 = linePoints[i + 1];
            const g1 = groundPoints[i];
            const g2 = groundPoints[i + 1];

            // Two triangles form one quad
            addTriangle(p1, p2, g2);
            addTriangle(p1, g2, g1);
        }

        if (this.showCap) {
            // create a fan for the top using linePoints[0] as the center
            for (let i = 1; i < linePoints.length - 1; i++) {
                addTriangle(linePoints[0], linePoints[i], linePoints[i + 1]);
            }
        }


        // Build the side mesh geometry
        const geometry = new THREE.BufferGeometry();
        const vFloat = new Float32Array(vertices);
        const nFloat = new Float32Array(normals);
        const uvFloat = new Float32Array(uvs);
        geometry.setAttribute("position", new THREE.BufferAttribute(vFloat, 3));
        geometry.setAttribute("normal", new THREE.BufferAttribute(nFloat, 3));
        geometry.setAttribute("uv", new THREE.BufferAttribute(uvFloat, 2));

        geometry.computeBoundingSphere();

        // Make a material for the semi-transparent fill
        const mat = new THREE.MeshPhongMaterial({
            color: polyColor,
            transparent: true,
            opacity: polyOpacity,  // TODO - make this a parameter
            side: THREE.DoubleSide,
            depthFunc: this.depthFunc,
            // don't write to depth buffer
            depthWrite: this.depthWrite,
        });

        this.trackWall = new THREE.Mesh(geometry, mat);
        // Shift by midpoint
        this.trackWall.position.set(mid.x, mid.y, mid.z);
        this.group.add(this.trackWall);

        //
        // Now create the vertical edges (the non-opaque vertical lines).
        // Each quad has "sides" from p1->g1 and p2->g2. We gather all those in one geometry.
        //
        const sideLineVertices = [];

        // For each pair (p1,g1), (p2,g2) forming the quad sides
        // We'll cover i to linePoints.length-1 to draw the full vertical lines at each top-bottom pair.
        for (let i = 0; i < linePoints.length; i++) {
            const top = linePoints[i];
            const bottom = groundPoints[i];
            // Shift them by the midpoint, just as we do for the mesh
            const rx1 = top.x - mid.x;
            const ry1 = top.y - mid.y;
            const rz1 = top.z - mid.z;

            const rx2 = bottom.x - mid.x;
            const ry2 = bottom.y - mid.y;
            const rz2 = bottom.z - mid.z;

            // Push two consecutive points per line segment
            sideLineVertices.push(rx1, ry1, rz1, rx2, ry2, rz2);
        }

        const sideLineGeom = new THREE.BufferGeometry();
        sideLineGeom.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(sideLineVertices), 3)
        );

        // Use a simple line material, more opaque than the fill
        const lineMat = new THREE.LineBasicMaterial({
            color: lineColor,
            transparent: true,
            opacity: lineOpacity,
            depthFunc: this.depthFunc,

        });

        this.trackLines = new THREE.LineSegments(sideLineGeom, lineMat);
        // Same shift by midpoint
        this.trackLines.position.set(mid.x, mid.y, mid.z);
        this.group.add(this.trackLines);

        this.propagateLayerMask();
    }
}

