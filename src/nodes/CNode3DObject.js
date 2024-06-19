// CNode3DObject.js - CNode3DObject
// a 3D object node - a sphere, cube, etc, with gnerated geometry and material from the input parameters
// encapsulates a THREE.Object3D object, like:
// - THREE.Mesh (default)
// - THREE.LineSegments (if wireframe or edges)

import {CNode3DGroup} from "./CNode3DGroup";
import * as LAYER from "../LayerMasks";
import {
    BoxGeometry,
    CapsuleGeometry, CircleGeometry,
    Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry,
    EdgesGeometry, IcosahedronGeometry,
    LineSegments,
    Mesh, OctahedronGeometry, RingGeometry,
    SphereGeometry, TetrahedronGeometry, TorusGeometry, TorusKnotGeometry,
    WireframeGeometry
} from "three";
import {gui} from "../Globals";
import {par} from "../par";
import {assert} from "../assert";

// Describe the parameters of each geometry type
// any numeric entry is [default, min, max, step]
// as described here: https://threejs.org/docs/#api/en/geometries/BoxGeometry
const gTypes = {
    sphere: {
        g: SphereGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.1],
            widthSegments: [10, 4, 40, 1],
            heightSegments: [10, 3, 40, 1],
        }
    },
    box: {
        g: BoxGeometry,
        params: {
            width: [1, 0.1, 100, 0.1],
            height: [1, 0.1, 100, 0.1],
            depth: [1, 0.1, 100, 0.1],
        }
    },
    capsule: {
        g: CapsuleGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.1],
            length: [1, 0.1, 100, 0.1],
            capSegments: [10, 4, 40, 1],
            radialSegments: [10, 4, 40, 1],
        }
    },

    circle: {
        g: CircleGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.1],
            segments: [10, 3, 100, 1],
        }
    },

    cone: {
        g: ConeGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.1],
            height: [1, 0, 100, 0.1],
            radialSegments: [10, 4, 40, 1],
            heightSegments: [10, 3, 40, 1],
        }
    },

    cylinder: {
        g: CylinderGeometry,
        params: {
            radiusTop: [0.5, 0.1, 100, 0.1],
            radiusBottom: [0.5, 0.1, 100, 0.1],
            height: [1, 0, 100, 0.1],
            radialSegments: [10, 4, 40, 1],
            heightSegments: [10, 3, 40, 1],
            openEnded: false,
            thetaStart: [0, 0, 2 * Math.PI, 0.01],
            thetaLength: [2 * Math.PI, 0, 2 * Math.PI, 0.1],
        }
    },

    dodecahedron: {
        g: DodecahedronGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.1],
            detail: [0, 0, 5, 1],
        }
    },

    icosahedron: {
        g: IcosahedronGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.1],
            detail: [0, 0, 5, 1],
        }
    },

    octahedron: {
        g: OctahedronGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.1],
            detail: [0, 0, 5, 1],
        }
    },

    ring: {
        g: RingGeometry,
        params: {
            innerRadius: [0.25, 0.0, 100, 0.01],
            outerRadius: [0.5, 0.01, 100, 0.01],
            thetaSegments: [10, 3, 100, 1],
            phiSegments: [10, 3, 100, 1],
            thetaStart: [0, 0, 2 * Math.PI, 0.01],
            thetaLength: [2 * Math.PI, 0, 2 * Math.PI, 0.1],

        }

    },

    tetrahedron: {
        g: TetrahedronGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.1],
            detail: [0, 0, 5, 1],
        }
    },

    torus: {
        g: TorusGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.1],
            tube: [0.15, 0.01, 100, 0.01],
            radialSegments: [10, 3, 100, 1],
            tubularSegments: [20, 3, 100, 1],
            arc: [Math.PI * 2, 0, Math.PI * 2, 0.1],
        }
    },

    torusknot: {
        g: TorusKnotGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.1],
            tube: [0.15, 0.01, 100, 0.01],
            tubularSegments: [64, 3, 100, 1],
            radialSegments: [8, 3, 100, 1],
            p: [2, 1, 10, 1],
            q: [3, 1, 10, 1],
        }
    },
}

const commonParams = {
    geometry: ["sphere", "box", "capsule", "circle", "cone", "cylinder", "dodecahedron", "icosahedron", "octahedron", "ring", "tetrahedron", "torus", "torusknot"],
    rotateX: [0, -180, 180, 1],
    rotateY: [0, -180, 180, 1],
    rotateZ: [0, -180, 180, 1],
    wireframe: false,
    edges: false,
    depthTest: true,
    opacity: [1,0,1,0.01],
    transparent: false,
 //   color: "white",
}

export class CNode3DObject extends CNode3DGroup {
    constructor(v) {
        v.layers ??= LAYER.MASK_HELPERS;
        v.color ??= "white"

        super(v);

        this.input("size", true); // size input is optional

        this.color = v.color;

        this.gui = gui.addFolder("3DObject: " + this.id)
        this.common = {}

        // add the common parameters to the GUI
        // note we set isCommon to true to flag them as common
        // so they don't get deleted when we rebuild the GUI after object type change
        this.addParams(commonParams, this.common, true); // add the common parameters to the GUI

//        this.lastGeometry = this.common.geometry.splice(); // copy the geometry type to compare later


        this.rebuild();

    }

    addParams(geometryParams, tooHere, isCommon=false) {
        const v = this.props;
        for (const key in geometryParams) {
            if (v[key] === undefined) {
                // if no value is given, then use the first value in the array
                // (the default value)
                // or the value itself if it's not an array
                if (Array.isArray(geometryParams[key])) {
                    v[key] = geometryParams[key][0];
                } else {
                    v[key] = geometryParams[key];
                }
            }
            tooHere[key] = v[key];

            let controller;
            if (Array.isArray(geometryParams[key])) {

                // is the firsts value in the array a number?
                if (typeof geometryParams[key][0] === "number") {
                    // and make a gui slider for the parameter
                    controller = this.gui.add(tooHere, key, geometryParams[key][1], geometryParams[key][2], geometryParams[key][3]).name(key).listen()
                        .onChange((v) => {
                            this.rebuild();
                            par.renderOne = true
                        })
                } else {
                    // assume it's a string, so a drop-down
                    // make a drop-down for the parameter
                    controller = this.gui.add(tooHere, key, geometryParams[key]).name(key).listen()
                        .onChange((v) => {
                            this.rebuild();
                            par.renderOne = true
                        })
                }

            } else {
                // if it's not an array, then it's a boolean
                // so make a checkbox
                controller = this.gui.add(tooHere, key).name(key).listen()
                    .onChange((v) => {
                        this.rebuild();
                        par.renderOne = true
                    })
            }

            controller.isCommon = isCommon;

        }
    }


    rebuild() {
        const v = this.props;
        this.destroyObject();

        const common = this.common;

        // set up inputs based on the geometry type
        // add the defaults if a parameter is missing
        // and add UI controls for the parameters
        const geometryType = common.geometry.toLowerCase();
        const geometryDef = gTypes[geometryType];
        assert(geometryDef !== undefined, "Unknown geometry type: " + geometryType)
        const geometryParams = geometryDef.params;
        // for all the parameters in the geometry type
        // add them to the geometryParams object
        // (either the passed value, or a default)

        // if the geometry type has changed, then delete all the geometry-specific parameters
        // and re-create them
        // delete the non-common children of this.gui
        if (this.lastGeometry !== common.geometry) {

            // iterate backwards so we can delete as we go
            for (let i = this.gui.controllers.length - 1; i >= 0; i--) {
                let c = this.gui.controllers[i];
                if (!c.isCommon) {
                    c.destroy();
                }
            }

            // and re-create them
            this.geometryParams = {}
            this.addParams(geometryParams, this.geometryParams);

            this.lastGeometry = common.geometry;
        }


        // // map them to the variables in this.geometryParams
        const params = Object.keys(this.geometryParams)
            .map(key => this.geometryParams[key]);

        this.geometry = new geometryDef.g(...params);

        if (common.rotateX) {
            this.geometry.rotateX(common.rotateX * Math.PI / 180);
        }
        if (common.rotateY) {
            this.geometry.rotateY(common.rotateY * Math.PI / 180);
        }
        if (common.rotateZ) {
            this.geometry.rotateZ(common.rotateZ * Math.PI / 180);
        }


        if (common.wireframe) {
            this.wireframe = new WireframeGeometry(this.geometry);
            this.object = new LineSegments(this.wireframe);
        } else if (common.edges) {
            this.wireframe = new EdgesGeometry(this.geometry);
            this.object = new LineSegments(this.wireframe);
        } else {
            this.object = new Mesh(this.geometry);
        }

        const matColor = new Color(this.color.v())
        this.object.material.color = matColor;

        this.object.material.depthTest = common.depthTest ?? true;
        this.object.material.opacity = common.opacity ?? 1;
        this.object.material.transparent = common.transparent ?? (v.opacity < 1.0);

        this.group.add(this.object);
        this.propagateLayerMask()
        this.recalculate()



    }

    destroyObject() {
        if (this.object) {
            this.object.geometry.dispose();
            this.object.material.dispose();
            this.group.remove(this.object);
            this.object = undefined;
        }
    }

    dispose() {
        this.gui.destroy();
        this.destroyObject();
        super.dispose();
    }

    recalculate() {
        const scale = this.in.size.v0
        this.group.scale.setScalar(scale);
    }
}