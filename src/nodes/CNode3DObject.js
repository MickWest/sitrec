// CNode3DObject.js - CNode3DObject
// a 3D object node - a sphere, cube, etc, with gnerated geometry and material from the input parameters
// encapsulates a THREE.Object3D object, like:
// - THREE.Mesh (default)
// - THREE.LineSegments (if wireframe or edges)

import { CNode3DGroup } from './CNode3DGroup';
import * as LAYER from '../LayerMasks';
import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  EdgesGeometry,
  IcosahedronGeometry,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshPhysicalMaterial,
  OctahedronGeometry,
  RingGeometry,
  SphereGeometry,
  TetrahedronGeometry,
  TorusGeometry,
  TorusKnotGeometry,
  WireframeGeometry,
} from 'three';
import { gui } from '../Globals';
import { par } from '../par';
import { assert } from '../assert';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeScene } from '../threeExt';

const Models = {
  'F/A-18E/F': { file: 'data/models/FA-18F.glb' },
  '737 MAX 8 (AA)': { file: 'data/models/737_MAX_8_AA.glb' },
  '737 MAX 8 (White)': { file: 'data/models/737_MAX_8_White.glb' },
  '777-200ER (Malyasia)': { file: 'data/models/777-200ER_Malaysia.glb' },
  'A340-600': { file: 'data/models/A340-600.glb' },
  'DC-10': { file: 'data/models/DC-10.glb' },

  Saucer: { file: 'data/models/saucer01a.glb' },
};

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
    },
  },
  box: {
    g: BoxGeometry,
    params: {
      width: [1, 0.1, 100, 0.1],
      height: [1, 0.1, 100, 0.1],
      depth: [1, 0.1, 100, 0.1],
    },
  },
  capsule: {
    g: CapsuleGeometry,
    params: {
      radius: [0.5, 0.1, 100, 0.1],
      length: [4, 0.1, 100, 0.1],
      capSegments: [20, 4, 40, 1],
      radialSegments: [20, 4, 40, 1],
    },
  },

  circle: {
    g: CircleGeometry,
    params: {
      radius: [0.5, 0.1, 100, 0.1],
      segments: [10, 3, 100, 1],
    },
  },

  cone: {
    g: ConeGeometry,
    params: {
      radius: [0.5, 0.1, 100, 0.1],
      height: [1, 0, 100, 0.1],
      radialSegments: [10, 4, 40, 1],
      heightSegments: [10, 3, 40, 1],
    },
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
    },
  },

  dodecahedron: {
    g: DodecahedronGeometry,
    params: {
      radius: [0.5, 0.1, 100, 0.1],
      detail: [0, 0, 5, 1],
    },
  },

  icosahedron: {
    g: IcosahedronGeometry,
    params: {
      radius: [0.5, 0.1, 100, 0.1],
      detail: [0, 0, 5, 1],
    },
  },

  octahedron: {
    g: OctahedronGeometry,
    params: {
      radius: [0.5, 0.1, 100, 0.1],
      detail: [0, 0, 5, 1],
    },
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
    },
  },

  tetrahedron: {
    g: TetrahedronGeometry,
    params: {
      radius: [0.5, 0.1, 100, 0.1],
      detail: [0, 0, 5, 1],
    },
  },

  torus: {
    g: TorusGeometry,
    params: {
      radius: [0.5, 0.1, 100, 0.1],
      tube: [0.15, 0.01, 100, 0.01],
      radialSegments: [10, 3, 100, 1],
      tubularSegments: [20, 3, 100, 1],
      arc: [Math.PI * 2, 0, Math.PI * 2, 0.1],
    },
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
    },
  },
};

// material types for meshes
const materialTypes = {
  basic: {
    m: MeshBasicMaterial,
    params: {
      color: 'white',
      fog: true,
    },
  },

  // lambert, with no maps, essentially just combines the color and emissive
  lambert: {
    m: MeshLambertMaterial,
    params: {
      color: 'white',
      emissive: 'black',
      emissiveIntensity: [1, 0, 1, 0.01],
      flatShading: false,
      fog: true,
    },
  },

  phong: {
    m: MeshPhongMaterial,
    params: {
      color: 'white',
      emissive: 'black',
      emissiveIntensity: [1, 0, 1, 0.01],
      specularColor: 'white',
      shininess: [30, 0, 100, 0.1],
      flatShading: false,
      fog: true,
    },
  },

  physical: {
    m: MeshPhysicalMaterial,
    params: {
      color: 'white',
      clearcoat: [1, 0, 1, 0.01],
      clearcoatRoughness: [0, 0, 1, 0.01],
      emissive: 'black',
      emissiveIntensity: [1, 0, 1, 0.01],
      specularColor: 'white',
      specularIntensity: [1, 0, 1, 0.01],
      sheen: [0, 0, 1, 0.01],
      sheenRoughness: [0.5, 0, 1, 0.01],
      sheenColor: 'black',
      flatShading: false,
      fog: true,
      reflectivity: [1, 0, 1, 0.01],
      transmission: [0, 0, 1, 0.01],
      ior: [1.5, 1, 2.33, 0.01],
      roughness: [0.5, 0, 1, 0.01],
      metalness: [0.5, 0, 1, 0.01],
    },
  },
};

const commonParams = {
  geometry: [
    'sphere',
    'box',
    'capsule',
    'circle',
    'cone',
    'cylinder',
    'dodecahedron',
    'icosahedron',
    'octahedron',
    'ring',
    'tetrahedron',
    'torus',
    'torusknot',
  ],
  rotateX: [0, -180, 180, 1],
  rotateY: [0, -180, 180, 1],
  rotateZ: [0, -180, 180, 1],

  material: ['basic', 'lambert', 'phong', 'physical'],
  wireframe: false,
  edges: false,
  depthTest: true,
  opacity: [1, 0, 1, 0.01],
  transparent: false,
  // color: "white",
};

export class CNode3DObject extends CNode3DGroup {
    constructor(v) {
        v.layers ??= LAYER.MASK_HELPERS;
        v.color ??= "white"
        v.size ??= 1;

    // patch DON'T convert the color to a constant node
    const oldColor = v.color;
    super(v);
    v.color = oldColor;

    this.input('size', true); // size input is optional

    this.color = v.color;

    const menuName = this.props.name ?? this.id;
    this.gui = gui.addFolder(`3D Ob: ${menuName}`).close();
    this.common = {};

        let menuName = this.props.name ?? this.id;
        this.gui = gui.addFolder("3D Ob: " + menuName).close()
        this.common = {}

        this.modelOrGeometry = v.modelOrGeometry;
        // if we don't have one, infer it from the presence of either "model" or geometry" in the parameters
        if (this.modelOrGeometry === undefined) {
            if (v.model !== undefined) {
                this.modelOrGeometry = "model";
            } else {
                this.modelOrGeometry = "geometry";
            }
        }


        this.modelOrGeometryMenu = this.gui.add(this, "modelOrGeometry", ["geometry", "model"]).name("Model or Geometry").onChange((v) => {
            this.rebuild();
            par.renderOne = true
        });

        this.modelOrGeometryMenu.isCommon = true;

        this.selectModel = "F/A-18E/F";
        this.modelMenu = this.gui.add(this, "selectModel", Object.keys(Models)).name("Object Type").onChange((v) => {
            this.rebuild();
            par.renderOne = true
        });

        this.modelMenu.isCommon = true;

        // add the common parameters to the GUI
        // note we set isCommon to true to flag them as common
        // so they don't get deleted when we rebuild the GUI after object type change
        this.addParams(commonParams, this.common, true); // add the common parameters to the GUI

        this.rebuild();
        par.renderOne = true;
      });

    this.modelOrGeometryMenu.isCommon = true;

    this.selectModel = 'F/A-18E/F';
    this.modelMenu = this.gui
      .add(this, 'selectModel', Object.keys(Models))
      .name('Object Type')
      .onChange((v) => {
        this.rebuild();
        par.renderOne = true;
      });

    this.modelMenu.isCommon = true;

    // add the common parameters to the GUI
    // note we set isCommon to true to flag them as common
    // so they don't get deleted when we rebuild the GUI after object type change
    this.addParams(commonParams, this.common, true); // add the common parameters to the GUI

    this.rebuild();
  }

  addParams(geometryParams, toHere, isCommon = false) {
    const v = this.props;
    for (const key in geometryParams) {
      if (v[key] === undefined) {
        // if no value is given, then use the first value in the array
        // (the default value)
        // or the value itself if it's not an array
        if (Array.isArray(geometryParams[key]) && key !== 'color') {
          v[key] = geometryParams[key][0];
        } else {
          v[key] = geometryParams[key];
        }
      }
      toHere[key] = v[key];

      let controller;

      const colorNames = ['color', 'emissive', 'specularColor', 'sheenColor'];
      if (colorNames.includes(key)) {
        // assume string values are colors
        // (might need to have an array of names of color keys, like "emissive"
        // add color picker
        // its going to be to controlling toHere[key]
        // which will be this.common.color
        // first we need to ensure it's in the correct format for lil-gui
        // which expect a hex string like "#RRGGBB"

        const passedColor = toHere[key];
        let color3;
        if (Array.isArray(passedColor)) {
          // the only format three.js can't handle is an array
          color3 = new Color(passedColor[0], passedColor[1], passedColor[2]);
        } else {
          // otherwise it's a hex string, or a three.js color
          color3 = new Color(passedColor);
        }
        toHere[key] = `#${color3.getHexString()}`;
        controller = this.gui
          .addColor(toHere, key)
          .name(key)
          .listen()
          .onChange((v) => {
            this.rebuild();
            par.renderOne = true;
          });
      } else if (Array.isArray(geometryParams[key])) {
        // is the firsts value in the array a number?
        if (typeof geometryParams[key][0] === 'number') {
          // and make a gui slider for the parameter
          controller = this.gui
            .add(
              toHere,
              key,
              geometryParams[key][1],
              geometryParams[key][2],
              geometryParams[key][3]
            )
            .name(key)
            .listen()
            .onChange((v) => {
              this.rebuild();
              par.renderOne = true;
            });
        } else {
          // assume it's a string, so a drop-down
          // make a drop-down for the parameter
          controller = this.gui
            .add(toHere, key, geometryParams[key])
            .name(key)
            .listen()
            .onChange((v) => {
              this.rebuild();
              par.renderOne = true;
            });
        }
      } else {
        // if it's not an array, then it's a boolean
        // so make a checkbox
        controller = this.gui
          .add(toHere, key)
          .name(key)
          .listen()
          .onChange((v) => {
            this.rebuild();
            par.renderOne = true;
          });
      }

      controller.isCommon = isCommon;
    }
  }

  rebuild() {
    const v = this.props;
    this.destroyObject();
    const common = this.common;

    if (this.modelOrGeometry === 'model') {
      // load the model, this will be async
      const model = Models[this.selectModel];
      const loader = new GLTFLoader();
      console.log('Loading model: ', model.file);
      loader.load(model.file, (gltf) => {
        this.model = gltf.scene;
        this.group.add(this.model);
        this.propagateLayerMask();
        this.recalculate();
      });

      return;
    }

    // set up inputs based on the geometry type
    // add the defaults if a parameter is missing
    // and add UI controls for the parameters
    const geometryType = common.geometry.toLowerCase();
    const geometryDef = gTypes[geometryType];
    assert(geometryDef !== undefined, `Unknown geometry type: ${geometryType}`);
    const geometryParams = geometryDef.params;
    // for all the parameters in the geometry type
    // add them to the geometryParams object
    // (either the passed value, or a default)

    const materialType = common.material.toLowerCase();
    const materialDef = materialTypes[materialType];
    assert(materialDef !== undefined, `Unknown material type: ${materialType}`);
    const materialParams = materialDef.params;

    // if the geometry or material type has changed, then delete all the geometry-specific parameters
    // and re-create them
    if (
      this.lastGeometry !== common.geometry ||
      this.lastMaterial !== common.material
    ) {
      this.destroyNonCommonUI();

      // and re-create them
      this.geometryParams = {};
      this.addParams(geometryParams, this.geometryParams);

      this.materialParams = {};
      this.addParams(materialParams, this.materialParams);

      this.lastGeometry = common.geometry;
      this.lastMaterial = common.material;
    }

    // // map them to the variables in this.geometryParams
    const params = Object.keys(this.geometryParams).map(
      (key) => this.geometryParams[key]
    );

    this.geometry = new geometryDef.g(...params);

    const rotateX = common.rotateX + (common.geometry === 'capsule' ? 90 : 0);

    if (rotateX) {
      this.geometry.rotateX((rotateX * Math.PI) / 180);
    }
    if (common.rotateY) {
      this.geometry.rotateY((common.rotateY * Math.PI) / 180);
    }

    if (common.rotateZ) {
      this.geometry.rotateZ((common.rotateZ * Math.PI) / 180);
    }

    const material = new materialDef.m({
      //  color: common.color,
      ...this.materialParams,
    });

    if (common.wireframe) {
      this.wireframe = new WireframeGeometry(this.geometry);
      this.object = new LineSegments(this.wireframe);
    } else if (common.edges) {
      this.wireframe = new EdgesGeometry(this.geometry);
      this.object = new LineSegments(this.wireframe);
    } else {
      this.object = new Mesh(this.geometry, material);
    }

    // const matColor = new Color(common.color)
    // this.object.material.color = matColor;

    this.object.material.depthTest = common.depthTest ?? true;
    this.object.material.opacity = common.opacity ?? 1;
    this.object.material.transparent = common.transparent ?? v.opacity < 1.0;

    this.group.add(this.object);
    this.propagateLayerMask();
    this.recalculate();
  }

  destroyNonCommonUI() {
    // delete the non-common children of this.gui
    // iterate backwards so we can delete as we go
    for (let i = this.gui.controllers.length - 1; i >= 0; i--) {
      const c = this.gui.controllers[i];
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
      disposeScene(this.model);
      this.model = undefined;
    }
  }

  dispose() {
    this.gui.destroy();
    this.destroyObject();
    super.dispose();
  }

  recalculate() {
    const scale = this.in.size.v0;
    this.group.scale.setScalar(scale);
  }
}
