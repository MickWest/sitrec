// CNode3DObject.js - CNode3DObject
// a 3D object node - a sphere, cube, etc, with gnerated geometry and material from the input parameters
// encapsulates a THREE.Object3D object, like:
// - THREE.Mesh (default)
// - THREE.LineSegments (if wireframe or edges)

import {CNode3DGroup} from "./CNode3DGroup";
import * as LAYER from "../LayerMasks";
import {
    Box3,
    BoxGeometry, BoxHelper,
    CapsuleGeometry,
    CircleGeometry,
    Color,
    ConeGeometry, CurvePath,
    CylinderGeometry,
    DodecahedronGeometry,
    EdgesGeometry,
    IcosahedronGeometry, LatheGeometry, LineCurve3,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    MeshPhongMaterial,
    MeshPhysicalMaterial, NoColorSpace,
    OctahedronGeometry, QuadraticBezierCurve3,
    RingGeometry,
    SphereGeometry, SRGBColorSpace,
    TetrahedronGeometry,
    TorusGeometry,
    TorusKnotGeometry, TubeGeometry, Vector2, Vector3,
    WireframeGeometry
} from "three";
import {FileManager, Globals, guiMenus, NodeMan} from "../Globals";
import {par} from "../par";
import {assert} from "../assert";
import {disposeObject, disposeScene, propagateLayerMaskObject, setLayerMaskRecursive} from "../threeExt";
import {loadGLTFModel} from "./CNode3DModel";
import {V3} from "../threeUtils";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import {CNodeMeasureAB} from "./CNodeLabels3D";
import {CManager} from "../CManager";
//
// class CModelManager extends CManager {
//     constructor(initialModels) {
//         super();
//         for (const key in initialModels) {
//             this.add(key, initialModels[key]);
//         }
//     }
//
//
// }



// Note these files are CASE SENSIVE. Mac OS is case insensitive, so be careful. (e.g. F-15.glb will not work on my deployed server)
export const ModelFiles = {

    "F/A-18F" :             { file: 'data/models/FA-18F.glb',},
    "F-15":                 { file: 'data/models/f-15.glb',},
    "737 MAX 8 BA":       { file: 'data/models/737 MAX 8 BA.glb',},
    "737 MAX 8 (White)":    { file: 'data/models/737_MAX_8_White.glb',},
 //   "777-200ER (Malyasia)": { file: 'data/models/777-200ER-Malaysia.glb',},
    "A340-600":             { file: 'data/models/A340-600.glb',},
//    "DC-10":                { file: 'data/models/DC-10.glb',},
    "WhiteCube":            { file: 'data/models/white-cube.glb',},
   // "PinkCube":             { file: 'data/models/pink-cube.glb',},
    "ATFLIR":               { file: 'data/models/ATFLIR.glb',},

    "Saucer":               { file: 'data/models/saucer01a.glb',},

}




// Custom geometries

// SuperEggGeometry
// https://en.wikipedia.org/wiki/Superellipsoid

class SuperEggGeometry extends LatheGeometry {
    constructor(radius = 1, length = 1, sharpness = 5.5, widthSegments = 20, heightSegments = 20) {
        // Generate points for the profile curve of the superegg
        const points = [];
        for (let i = 0; i <= heightSegments; i++) {
            const t = (i / heightSegments) * Math.PI - Math.PI / 2; // Range from -π/2 to π/2
            const y = Math.sin(t) * length; // Y-coordinate, scaled by length
            const x = Math.sign(Math.cos(t)) * Math.abs(Math.cos(t)) ** (2 / sharpness) * radius; // X-coordinate scaled by radius
            points.push(new Vector2(x, y));
        }

        // Create LatheGeometry by revolving the profile curve around the y-axis
        super(points, widthSegments);

        this.type = 'SuperEggGeometry';
        this.parameters = {
            radius: radius,
            length: length,
            sharpness: sharpness,
            widthSegments: widthSegments,
            heightSegments: heightSegments
        };
    }
}

// wrapper to use the CapsuleGeometry with a total length instead of cylinder length
class CapsuleGeometryTL {
    constructor(radius=0.5, totalLength = 5, capSegments = 20, radialSegments = 20) {
        return new CapsuleGeometry(radius, totalLength-radius*2, capSegments, radialSegments);
    }
}

// Procedural TicTac model from a capsule and two legs
class TicTacGeometry {
    constructor(radius = 1, totalLength = 1, capSegments = 20, radialSegments = 20, legRadius = 0.1, legLength1 = 0.1, legLength2 = 0.1, legCurveRadius = 0.1, legOffset = 0.1, legSpacing = 0.1) {

        const capsule = new CapsuleGeometry(radius, totalLength-radius*2, capSegments, radialSegments);

        // get the offset of the legs, radius*0.95 so it overlaps the capsule to avoid gaps
        const leg1Start = V3(0, legOffset + legSpacing/2, radius*0.95);
        const leg2Start = V3(0, legOffset - legSpacing/2, radius*0.95);

        // get realtive positions of the leg mid and end
        const legMid = V3(0, 0,          legLength1);
        const legEnd = V3(0, legLength2, legLength1);

        // calculate the two sets of mid and end
        const leg1Mid = leg1Start.clone().add(legMid);
        const leg1End = leg1Start.clone().add(legEnd);
        const leg2Mid = leg2Start.clone().add(legMid);
        const leg2End = leg2Start.clone().add(legEnd);

        legCurveRadius = Math.min(legCurveRadius, legLength1);
        legCurveRadius = Math.min(legCurveRadius, Math.abs(legLength2));

        const tube1 = createTube(leg1Start, leg1Mid, leg1End, legRadius, legCurveRadius);
        const tube2 = createTube(leg2Start, leg2Mid, leg2End, legRadius, legCurveRadius);

        const geometries = [capsule,tube1, tube2];
        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);

        return mergedGeometry;
    }

}

// Function to compute a point on a line segment at a given distance from an endpoint
function computePointAtDistance(p1, p2, distance) {
    const direction = new Vector3().subVectors(p1, p2).normalize();
    return new Vector3().addVectors(p2, direction.multiplyScalar(distance));
}

// Function to create a cap geometry at a given position with a specified radius
function createCapGeometry(position, radius, direction) {
    const geometry = new CircleGeometry(radius, 32);
    geometry.lookAt(direction);
    geometry.translate(position.x, position.y, position.z);
    return geometry;
}

// Function to create a bent tube geometry with the given parameters
function createTube(A, B, C, R, K) {

    // Compute points A1 and C1
    const A1 = computePointAtDistance(A, B, K);
    const C1 = computePointAtDistance(C, B, K);

    // Create straight line segments A-A1 and C1-C
    const straightSegment1 = new LineCurve3(A, A1);
    const straightSegment2 = new LineCurve3(C1, C);

    // Create quadratic Bézier curve segment A1-B-C1
    const bezierCurve = new QuadraticBezierCurve3(A1, B, C1);

    // Combine the segments into a single curve
    const curvePath = new CurvePath();
    curvePath.add(straightSegment1);
    curvePath.add(bezierCurve);
    curvePath.add(straightSegment2);

    // Create tube geometry
    const tubeGeometry = new TubeGeometry(curvePath, 64, R, 8, false);

    // Create cap geometries
    const capGeometryStart = createCapGeometry(A, R, A.clone().sub(B));
    const capGeometryEnd = createCapGeometry(C, R, C.clone().sub(B));

    const geometries = [tubeGeometry, capGeometryStart, capGeometryEnd];
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);

    return mergedGeometry;

}





// Describe the parameters of each geometry type
// any numeric entry is [default, min, max, step]
// as described here: https://threejs.org/docs/#api/en/geometries/BoxGeometry
const gTypes = {
    sphere: {
        g: SphereGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.01],
            widthSegments: [10, 4, 40, 1],
            heightSegments: [10, 3, 40, 1],
        }
    },
    box: {
        g: BoxGeometry,
        params: {
            width: [1, 0.1, 100, 0.01],
            height: [1, 0.1, 100, 0.01],
            depth: [1, 0.1, 100, 0.01],
        }
    },
    capsule: {
        g: CapsuleGeometryTL,
        params: {
            radius: [0.5, 0.1, 20, 0.01],
            totalLength: [5, 0.1, 30, 0.01],
            capSegments: [20, 4, 40, 1],
            radialSegments: [20, 4, 40, 1],
        }
    },

    circle: {
        g: CircleGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.01],
            segments: [10, 3, 100, 1],
        }
    },

    cone: {
        g: ConeGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.01],
            height: [1, 0, 100, 0.01],
            radialSegments: [10, 4, 40, 1],
            heightSegments: [10, 3, 40, 1],
        }
    },

    cylinder: {
        g: CylinderGeometry,
        params: {
            radiusTop: [0.5, 0.1, 100, 0.01],
            radiusBottom: [0.5, 0.1, 100, 0.01],
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
            radius: [0.5, 0.1, 100, 0.01],
            detail: [0, 0, 5, 1],
        }
    },

    icosahedron: {
        g: IcosahedronGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.01],
            detail: [0, 0, 5, 1],
        }
    },

    octahedron: {
        g: OctahedronGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.01],
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
            radius: [0.5, 0.1, 100, 0.01],
            detail: [0, 0, 5, 1],
        }
    },

    torus: {
        g: TorusGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.01],
            tube: [0.15, 0.01, 100, 0.01],
            radialSegments: [10, 3, 100, 1],
            tubularSegments: [20, 3, 100, 1],
            arc: [Math.PI * 2, 0, Math.PI * 2, 0.1],
        }
    },

    torusknot: {
        g: TorusKnotGeometry,
        params: {
            radius: [0.5, 0.1, 100, 0.01],
            tube: [0.15, 0.01, 100, 0.01],
            tubularSegments: [64, 3, 100, 1],
            radialSegments: [8, 3, 100, 1],
            p: [2, 1, 10, 1],
            q: [3, 1, 10, 1],
        }
    },

    superegg: {
        g: SuperEggGeometry,
        params: {
            radius: [0.5, 0.1, 30, 0.01],
            length: [4, 0.1, 20, 0.01],
            sharpness: [5.5, 0.1, 10, 0.1],
            widthSegments: [20, 4, 40, 1],
            heightSegments: [20, 3, 40, 1],
        }

    },

    tictac: {
        g: TicTacGeometry,
        params: {
            radius: [2.6, 0.1, 30, 0.01],
            totalLength: [12.2, 0.1, 50, 0.01],
            capSegments: [20, 4, 40, 1],
            radialSegments: [30, 4, 40, 1],
            legRadius: [0.28, 0.01, 5, 0.001],
            legLength1: [1.4, 0.1, 10, 0.001],
            legLength2: [1.4, -5, 5, 0.001],
            legCurveRadius: [0.88, 0.0, 5, 0.001],
            legOffset: [-0.45, -10, 10, 0.001],
            legSpacing: [6.2, 0.0, 20, 0.001],
        }


    }

}

// material types for meshes
const materialTypes = {
    basic: {
        m: MeshBasicMaterial,
        params: {
            color: "white",
            fog: true,
        }
    },

    // lambert, with no maps, essentially just combines the color and emissive
    lambert: {
        m: MeshLambertMaterial,
        params: {
            color: "white",
            emissive: "black",
            emissiveIntensity: [1,0,1,0.01],
            flatShading: false,
            fog: true,

        }
    },

    phong: {
        m: MeshPhongMaterial,
        params: {
            color: "white",
            emissive: "black",
            emissiveIntensity: [1,0,1,0.01],
            specularColor: "white",
            shininess: [30,0,100,0.1],
            flatShading: false,
            fog: true,
        }
    },

    physical: {
        m: MeshPhysicalMaterial,
        params: {
            color: "white",
            clearcoat: [1, 0, 1, 0.01],
            clearcoatRoughness: [0, 0, 1, 0.01],
            emissive: "black",
            emissiveIntensity: [1, 0, 1, 0.01],
            specularColor: "white",
            specularIntensity: [1,0,1,0.01],
            sheen: [0, 0, 1, 0.01],
            sheenRoughness: [0.5, 0, 1, 0.01],
            sheenColor: "black",
            flatShading: false,
            fog: true,
            reflectivity: [1, 0, 1, 0.01],
            transmission: [0, 0, 1, 0.01],
            ior: [1.5, 1, 2.33, 0.01],
            roughness: [0.5, 0, 1, 0.01],
            metalness: [0.5, 0, 1, 0.01],
        }
    }

}

const commonMaterialParams = {
    material: ["basic", "lambert", "phong", "physical"],
}

const commonParams = {
    geometry: ["sphere", "box", "capsule", "circle", "cone", "cylinder", "dodecahedron", "icosahedron", "octahedron", "ring", "tictac", "tetrahedron", "torus", "torusknot", "superegg"],
    applyMaterial: false,
    rotateX: [0, -180, 180, 1],
    rotateY: [0, -180, 180, 1],
    rotateZ: [0, -180, 180, 1],

    wireframe: false,
    edges: false,
    depthTest: true,
    opacity: [1,0,1,0.01],
    transparent: false,
   // color: "white",
}

export class CNode3DObject extends CNode3DGroup {
    constructor(v) {
        v.layers ??= LAYER.MASK_LOOKRENDER;
        v.color ??= "white"
        v.size ??= 1;

        // patch DON'T convert the color to a constant node
        const oldColor = v.color;
        super(v);
        v.color = oldColor;

        this.input("size", true); // size input is optional

        this.color = v.color;
        this.layers = v.layers; // usually undefined, as the camera handles layers

        let menuName = this.props.name ?? this.id;
        this.gui = guiMenus.objects.addFolder("3D Ob: " + menuName).close()
        this.common = {}
        this.geometryParams = {};
        this.materialParams = {};

        this.common.material = v.material ?? "lambert";
        this.materialFolder = this.gui.addFolder("Material").open();
        this.materialFolder.isCommon = true; //temp patch - not needed?  not a controller???
        this.addParams(commonMaterialParams, this.common, this.materialFolder, true);

        this.rebuildMaterial();

        this.modelOrGeometry = v.modelOrGeometry;
        // if we don't have one, infer it from the presence of either "model" or geometry" in the parameters
        if (this.modelOrGeometry === undefined) {
            if (v.model !== undefined) {
                this.modelOrGeometry = "model";
            } else {
                this.modelOrGeometry = "geometry";
            }
        }

        this.modelOrGeometryMenu = this.gui.add(this, "modelOrGeometry", ["geometry", "model"]).listen().name("Model or Geometry").onChange((v) => {
            this.rebuild();
            par.renderOne = true
        });

        this.modelOrGeometryMenu.isCommon = true;

        this.selectModel = v.model ?? "F/A-18F";
        this.modelMenu = this.gui.add(this, "selectModel", Object.keys(ModelFiles)).name("Model").onChange((v) => {
            this.modelOrGeometry = "model"
            this.rebuild();
            par.renderOne = true
        });

        this.modelMenu.isCommon = true;

        // add the common parameters to the GUI
        // note we set isCommon to true to flag them as common
        // so they don't get deleted when we rebuild the GUI after object type change
        this.addParams(commonParams, this.common, this.gui, true); // add the common parameters to the GUI

        this.displayBoundingBox = false;

        this.gui.add(this, "displayBoundingBox").name("Display Bounding Box").listen().onChange((v) => {
            this.rebuild();
            par.renderOne = true
        }).isCommon = true;

        this.rebuild();

    }

    modSerialize() {
        return {
            ...super.modSerialize(),
            color: this.color,
            modelOrGeometry: this.modelOrGeometry,
            model: this.selectModel,
            common: this.common,
            geometryParams: this.geometryParams,
            materialParams: this.materialParams,
            // might need a modelParams


        }
    }

    modDeserialize(v) {
        super.modDeserialize(v)
        this.color = v.color;
        this.modelOrGeometry = v.modelOrGeometry;
        this.selectModel = v.model;



        // copy the values from v.common, v.geometryParams, v.materialParams
        // to this.common, this.geometryParams, this.materialParams
        // we need to copy the values, not just assign the object
        // because the GUI is referencing the values in this.common, etc
        // and so creating a new object would break the GUI
        for (const key in v.common) {
            this.common[key] = v.common[key];
        }

        if (this.modelOrGeometry === "geometry") {
            // we do an initial rebuild of geometry to set up the parameters
            // with this.common.geometry
            // otherwise parameters will get reset to defaults
            this.rebuild();
        }

        for (const key in v.geometryParams) {
            this.geometryParams[key] = v.geometryParams[key];
        }
        for (const key in v.materialParams) {
            this.materialParams[key] = v.materialParams[key];
        }

        // might need a modelParams

        this.rebuildMaterial();
        this.rebuild();



    }


    addParams(geometryParams, toHere, gui, isCommon=false) {
        const v = this.props;
        for (const key in geometryParams) {
            if (v[key] === undefined) {
                // if no value is given, then use the first value in the array
                // (the default value)
                // or the value itself if it's not an array
                if (Array.isArray(geometryParams[key]) && key !== "color") {
                    v[key] = geometryParams[key][0];
                } else {
                    v[key] = geometryParams[key];
                }
            }
            toHere[key] = v[key];

            let controller;

            const colorNames = ["color", "emissive", "specularColor", "sheenColor"]
            if (colorNames.includes(key)) {
                // assume string values are colors
                // (might need to have an array of names of color keys, like "emissive"
              // add color picker
                // its going to be to controlling toHere[key]
                // which will be this.common.color
                // first we need to ensure it's in the correct format for lil-gui
                // which expect a hex string like "#RRGGBB"

                let passedColor = toHere[key];
                let color3;
                if (Array.isArray(passedColor)) {
                    // the only format three.js can't handle is an array
                    color3 = new Color(passedColor[0], passedColor[1], passedColor[2]);
                } else {
                    // otherwise it's a hex string, or a three.js color
                    color3 = new Color(passedColor);
                }
                toHere[key] = "#" + color3.getHexString();
                controller = gui.addColor(toHere, key).name(key).listen()
                    .onChange((v) => {
                        this.rebuild();
                        par.renderOne = true
                    })

            } else if (Array.isArray(geometryParams[key])) {

                // is the firsts value in the array a number?
                if (typeof geometryParams[key][0] === "number") {
                    // and make a gui slider for the parameter
                    controller = gui.add(toHere, key, geometryParams[key][1], geometryParams[key][2], geometryParams[key][3]).name(key).listen()
                        .onChange((v) => {
                            this.rebuild();
                            par.renderOne = true
                        })
                } else {
                    // assume it's a string, so a drop-down
                    // make a drop-down for the parameter
                    controller = gui.add(toHere, key, geometryParams[key]).name(key).listen()
                        .onChange((v) => {
                            if (key === "geometry") {
                                this.modelOrGeometry = "geometry"
                            }
                            this.rebuild();
                            par.renderOne = true
                        })
                }

            } else {
                // if it's not an array, then it's a boolean
                // so make a checkbox
                controller = gui.add(toHere, key).name(key).listen()
                    .onChange((v) => {
                        this.rebuild();
                        par.renderOne = true
                    })
            }

            controller.isCommon = isCommon;

        }
    }




    rebuild() {
        let newType = false;
        if (this.modelOrGeometry !== this.lastModelOrGeometry) {
            this.lastModelOrGeometry = this.modelOrGeometry;
            newType = true;
        }


        const v = this.props;

        const common = this.common;


        if (this.modelOrGeometry === "model") {
            //this.destroyNonCommonUI(this.gui);

            // load the model if different, this will be async
            // here this.selectModel is the NAME of the model (id or drag and drop filename
            // and this.currentModel points to a model def object (which currently just just a file)
            // so this.currentModel.file is the filename of the last loaded file
            const model = ModelFiles[this.selectModel];

            if (model !== this.currentModel || newType) {

                // if the new model and the old model are BOTH dynamic
                // then we need to remove the old model from the file manager and the GUI
                // Otherwise we'll accumulate models that will get loaded but are not used

                if (this.currentModel
                    && FileManager.isUnhosted(this.currentModel.file)
                    && FileManager.isUnhosted(this.selectModel)) {
                    console.log(`Removing unhosted file: ${this.currentModel.file}, replacing with ${model.file}`)
                    FileManager.disposeRemove(this.currentModel.file);
                    // will need to remove from GUI. after we implement adding it ...

                }


                this.currentModel = model;


                //const loader = new GLTFLoader();
                console.log("LOADING NEW GLTF model: ", model.file);

                loadGLTFModel(model.file, gltf => {
                    // since it's async, we might now be rendering a geometry
                    // If so, then don't add the model to the group
                    if (this.modelOrGeometry === "model") {

                        // destroy the existing object AFTER the new one is loaded
                        // otherwise we might start loading a new object before the last one had finished loading
                        // so the first one will still get added
                        this.destroyObject();

                        this.model = gltf.scene;

                        if (Globals.shadowsEnabled) {
                            this.model.castShadow = true;
                            this.model.receiveShadow = true;
                        }
                        this.group.add(this.model);
                        this.propagateLayerMask()
                        this.recalculate()
                        this.applyMaterialToModel();
                        this.rebuildBoundingBox();
                        console.log("ADDED TO SCENE : ", model.file);

                    }
                });
            }

            if (this.common.applyMaterial) {
                this.rebuildMaterial();
                this.applyMaterialToModel();
            } else {
                // restore the original materials
                if (this.model) {
                    this.model.traverse((child) => {
                        if (child.isMesh && child.originalMaterial) {
                            child.material = child.originalMaterial;
                            child.originalMaterial = undefined;
                        }
                    });
                }
            }
            this.rebuildBoundingBox();
            return;
        }


        this.destroyObject();

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



        // if the geometry or material type has changed, then delete all the geometry-specific parameters
        // and re-create them
        if (this.lastGeometry !== common.geometry) {
            this.destroyNonCommonUI(this.gui);

            // and re-create them
            this.geometryParams = {}
            this.addParams(geometryParams, this.geometryParams, this.gui);

            this.lastGeometry = common.geometry;
        }


        // // map them to the variables in this.geometryParams
        const params = Object.keys(this.geometryParams)
            .map(key => this.geometryParams[key]);

        this.geometry = new geometryDef.g(...params);

        const rotateX  = common.rotateX + ((common.geometry === "capsule" || common.geometry === "tictac") ? 90 : 0);

        if (rotateX) {
            this.geometry.rotateX(rotateX * Math.PI / 180);
        }
        if (common.rotateY) {
            this.geometry.rotateY(common.rotateY * Math.PI / 180);
        }

        if (common.rotateZ) {
            this.geometry.rotateZ(common.rotateZ * Math.PI / 180);
        }

        this.rebuildMaterial();

        if (common.wireframe) {
            this.wireframe = new WireframeGeometry(this.geometry);
            this.object = new LineSegments(this.wireframe);
        } else if (common.edges) {
            this.wireframe = new EdgesGeometry(this.geometry);
            this.object = new LineSegments(this.wireframe);
        } else {
            this.object = new Mesh(this.geometry, this.material);
        }

        // const matColor = new Color(common.color)
        // this.object.material.color = matColor;

        this.object.material.depthTest = common.depthTest ?? true;
        this.object.material.opacity = common.opacity ?? 1;
        this.object.material.transparent = common.transparent ?? (v.opacity < 1.0);

        if (Globals.shadowsEnabled) {
            this.object.castShadow = true;
            this.object.receiveShadow = true;
        }
        this.group.add(this.object);
        this.propagateLayerMask()
        this.recalculate()


        // remove the BB measure, in case we don't rebuild them
        NodeMan.disposeRemove(this.measureX, true);
        this.measureX  = undefined;
        NodeMan.disposeRemove(this.measureY, true);
        this.measureY  = undefined;
        NodeMan.disposeRemove(this.measureZ, true);
        this.measureZ  = undefined;

        this.rebuildBoundingBox();



    }

    rebuildBoundingBox(force = true)
    {

        // if we are displauing a bonding box, then do it
        if (this.displayBoundingBox) {

            // only recalculate the box if forced
            if (force) {

                if (this.modelOrGeometry === "model") {
                    // detach from the group
                    this.group.remove(this.model);

                    // ensure the matrix is up to date
                    this.model.updateMatrixWorld(true);

                    // store the original matrix
                    const matrix = this.model.matrix.clone();
                    // set the matrix to the identity
                    this.model.matrix.identity();
                    // update the world matrix
                    this.model.updateWorldMatrix(true, true);


                    this.boundingBox = new Box3();
                    this.boundingBox.setFromObject(this.model);

                    // restore the original matrix
                    this.model.matrix.copy(matrix);
                    this.model.updateWorldMatrix(true, true);
                    // re-attach to the group
                    this.group.add(this.model);

                    if (this.layers) {
                        this.group.layers.mask = this.layers;
                        propagateLayerMaskObject(this.group);
                    }

                } else {
                    this.object.geometry.computeBoundingBox();
                    this.boundingBox = this.object.geometry.boundingBox;
                }
            }

            if (!this.boundingBox) {
                return;
            }


            const min = this.boundingBox.min.clone();
            const max = this.boundingBox.max.clone();

            // transform them by this.group
            min.applyMatrix4(this.group.matrixWorld);
            max.applyMatrix4(this.group.matrixWorld);

            // calculate all the corners of the bounding box
            const corners = [];
            for (let i = 0; i < 8; i++) {
                const x = i & 1 ? max.x : min.x;
                const y = i & 2 ? max.y : min.y;
                const z = i & 4 ? max.z : min.z;
                corners.push(V3(x, y, z));
            }

            // calculate three edges of the bounding box about
            // the corner which is closest to the camera

            const cameraNode = NodeMan.get("mainCamera");
            const camPos = cameraNode.camera.position;
            let closest = 0;
            let closestDist = 1000000;
            for (let i = 0; i < 8; i++) {
                const dist = corners[i].distanceTo(camPos);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = i;
                }
            }

            // only rebuild it if the closest corner has changed
            // or forced (some external change, like size)
            if (force || this.lastClosest !== closest) {

                this.lastClosest = closest;

                // now we have the closest corner, we can calculate the three edges
                const AX = corners[closest];
                const BX = corners[closest ^ 1];
                const AY = corners[closest];
                const BY = corners[closest ^ 2];
                const AZ = corners[closest];
                const BZ = corners[closest ^ 4];

                //
                NodeMan.disposeRemove(this.measureX, true);
                NodeMan.disposeRemove(this.measureY, true);
                NodeMan.disposeRemove(this.measureZ, true);

                this.measureX = new CNodeMeasureAB({
                    id: this.id + "_AX",
                    A: AX,
                    B: BX,
                    color: "#ff8080",
                    text: "X",
                    unitSize: "small"
                })
                this.measureY = new CNodeMeasureAB({
                    id: this.id + "_AY",
                    A: AY,
                    B: BY,
                    color: "#80ff80",
                    text: "X",
                    unitSize: "small"
                })
                this.measureZ = new CNodeMeasureAB({
                    id: this.id + "_AZ",
                    A: AZ,
                    B: BZ,
                    color: "#8080ff",
                    text: "X",
                    unitSize: "small"
                })
            }
        }
    }

    rebuildMaterial()
    {
        const materialType = this.common.material.toLowerCase();
        const materialDef = materialTypes[materialType];
        assert(materialDef !== undefined, "Unknown material type: " + materialType)

        // if the material type has changed, then delete all the material-specific parameters
        // and re-create them for the new material type
        if (this.lastMaterial !== materialType) {

            // remove all the non-common children of the material folder
            this.destroyNonCommonUI(this.materialFolder)




            this.lastMaterial = materialType
            const materialParams = materialDef.params;
            this.materialParams = {}
            this.addParams(materialParams, this.materialParams, this.materialFolder);
        }

        if (this.material)  {
            this.material.dispose();
        }

        //this.lastMaterial = this.common.material;
        this.material = new materialDef.m({
            //  color: this.common.color,
            ...this.materialParams
        });
    }

    applyMaterialToModel() {
        // iterate over all the meshes in the model
        // and apply this.material to them

        if (this.model === undefined || !this.common.applyMaterial) {
            return;
        }
        this.model.traverse((child) => {
            if (child.isMesh) {
                if (child.originalMaterial === undefined) {
                    // save the original material so we can restore it later
                    child.originalMaterial = child.material;
                }
                child.material = this.material.clone();
                // // if the material has a map, then set the colorSpace to NoColorSpace
                // if (child.material.map) {
                //     child.material.map.colorSpace = NoColorSpace;
                // }
                // if (child.material.emissiveMap) {
                //     child.material.emissiveMap.colorSpace = NoColorSpace;
                // }
            }
        });

    }


    destroyNonCommonUI(gui) {
        // delete the non-common children of this.gui
        // iterate backwards so we can delete as we go
        for (let i = gui.controllers.length - 1; i >= 0; i--) {
            let c = gui.controllers[i];
            if (!c.isCommon) {
                c.destroy();
            }
        }
    }

    destroyObject() {
        if (this.object) {
            this.object.geometry.dispose();
            this.object.material.dispose();
            this.group.remove(this.object);
            this.object = undefined;
        }

        if (this.material) {
            this.material.dispose();
        }

        if (this.model) {
            this.group.remove(this.model);
            disposeScene(this.model)
            this.model = undefined
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

    update(f) {
        super.update(f);
        this.rebuildBoundingBox(false);
    }


}
