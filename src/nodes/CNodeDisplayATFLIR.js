import {CNode3DGroup} from "./CNode3DGroup";
import {assert, radians} from "../utils";
import {
    getGlareAngleFromFrame,
    jetPitchFromFrame,
    jetRollFromFrame, pitchAndGlobalRollFromFrame,
    targetSphere, vizRadius
} from "../JetStuff";
import {showHider} from "../KeyBoardHandler";
import {par} from "../par";
import {AzElHelper, SphericalGridHelper} from "../CHelper";
import {Sit} from "../Globals";
import {CNodeDisplayCameraFrustum, CNodeDisplayCameraFrustumATFLIR} from "./CNodeDisplayCameraFrustum";
import {ViewMan} from "./CNodeView";
import {EA2XYZ, PRJ2XYZ} from "../SphericalMath";
import {dispose, propagateLayerMaskObject, V3} from "../threeExt";
import {} from "../Globals";

import {GLTFLoader} from '../../three.js/examples/jsm/loaders/GLTFLoader.js';
import {Line2} from '../../three.js/examples/jsm/lines/Line2.js';
import {LineGeometry} from '../../three.js/examples/jsm/lines/LineGeometry.js';
import {LocalFrame, GlobalScene} from "../LocalFrame";
import {makeMatLine} from "../MatLines";
import {GridHelper, Group, PMREMGenerator, TextureLoader} from "../../three.js/build/three.module";
import * as LAYER from "../LayerMasks";


export var Pod;
export var PODBack;
export var EOSU;
export var Ball;
export var Pointer;
export var PodFrame;  // group used to store the frame of reference of the pod and the singularity grid
export var FA18;

var matLineWhite = makeMatLine(0xffffff);
var matLineCyan = makeMatLine(0x00ffff,1.5);
var matLineGreen = makeMatLine(0x00ff00);

// Container for the various 3D movesl that make up the atflir
export class CNodeDisplayATFLIR extends CNode3DGroup {
    constructor(v) {

        super(v);

        PodFrame = new Group();
        PodFrame.layers.mask = LAYER.MASK_HELPERS

        assert(PodFrame != undefined, "Missing PodFrame")
        LocalFrame.add(PodFrame)

        /////////////////////////////////////////////////////
        // loading
        const loader = new GLTFLoader()
        loader.load('data/models/ATFLIR.glb?v=27', gltf => {

            Pod = gltf.scene
            PODBack = Pod.getObjectByName('BODY')
            EOSU = Pod.getObjectByName('HEAD')
            Ball = Pod.getObjectByName('BALL')

            PodFrame.add(Pod)
            var podScale = 50;
            Pod.scale.setScalar(podScale)

            PodFrame.rotateX(radians(jetPitchFromFrame()))

            Pointer = gltf.scene.getObjectByName('Pointer')
            showHider(Pointer, "Physical Pointer", false)

            // make the pod back materials unique, so we can wireframe them later
            PODBack.traverse(child => {
                //   console.log(child)
                if (child.isMesh) {
                    child.material = child.material.clone()
                }
            })

            propagateLayerMaskObject(PodFrame)


            /*
            // TODO: Maybe get this working again.
            // it broke after we switched from global rendering to local (per-view) rendering
            // however it was problematic anyway, due to affecting clouds
            // and we are goin to need it in TWO renderers, not just one
            // so maybe better to leave it alonf.
            // sky texture after the pod
            // This is for the environment mapping
            // and affects the clouds ... ???
            var skyLoader = new TextureLoader();
            this.skyTexture = skyLoader.load("images/small-sky.jpg?v=3", function (texture) {

            // this mainview was the patch I used.
                var pmremGenerator = new PMREMGenerator(ViewMan.get("mainView").renderer);
                var envMap = pmremGenerator.fromEquirectangular(texture).texture;
                GlobalScene.environment = envMap;
            });
*/
            // for quicker startup we load the jet after the pod
            // as it's hidden by default.

            loader.load('data/models/FA-18F.glb?v=8', function (gltf) {
                FA18 = gltf.scene.getObjectByName('FA-18F')
                var podScale = 10;
                FA18.scale.setScalar(podScale);
                FA18.position.z = 120
                FA18.position.y = par.jetOffset

                PodFrame.add(gltf.scene)
                FA18.visible = false
                showHider(FA18, "[J]et", false, 'j')
                propagateLayerMaskObject(PodFrame)

            })
        })
        // End loading
        //////////////////////////////////////////////

        const size = 400;
        const divisions = 30;
        const gridHelper = new GridHelper(size, divisions, 0xc0c000, 0xc0c000);
        LocalFrame.add(gridHelper);
        showHider(gridHelper, "[H]orizon Grid", false, 'h')

        const gridHelper2 = new GridHelper(size, divisions, 0x00ffff, 0x00ffff);
        PodFrame.add(gridHelper2);
        showHider(gridHelper2, "[W]ing Plane Grid", false, 'w')


        this.SphericalGrid = new SphericalGridHelper(vizRadius)
        // Spherical coordinates grid, in frame or refence of the pod
        PodFrame.add(this.SphericalGrid)
        showHider(this.SphericalGrid, "[S]pherical Boresight Grid", true, 's')

        this.AzElGrid = new AzElHelper(vizRadius)
        // Az/El grid is in the local coordinate system (i.e. ENU, with origin at the jet/ATFLIR
        LocalFrame.add(this.AzElGrid)
        showHider(this.AzElGrid, "[A]zimuth/Elevation Grid", false, 'a')
        // helper object camera frustum

        if (Sit.name === "gimbal" || Sit.name === "gimbalnear") {
            this.cameraFrustum = new CNodeDisplayCameraFrustumATFLIR({
                container: LocalFrame,
                radius: vizRadius,
                fov: ViewMan.list.podsEyeView.data.camera.fov / 2,
                color: matLineCyan,
            })
            showHider(this.cameraFrustum.group, "F[R]ustum of camera", true, 'r')
        }

        this.propagateLayerMask();
        this.recalculate();

    }

    makeTrackLine() {
        LocalFrame.remove(this.TRACK_line)
        // White track of view point line
        var el = par.el   // this is somewhat deprecated, as el is not constant for GoFast
        const line_points = [];
        // Kinda Gimbal specific
        for (var az = -180; az <= 180; az++) {
            var A = EA2XYZ(el, az, vizRadius)
            line_points.push(A.x, A.y, A.z);
        }
        dispose(this.TrackLineGeometry)
        this.TrackLineGeometry = new LineGeometry();
        this.TrackLineGeometry.setPositions(line_points);
        this.TRACK_line = new Line2(this.TrackLineGeometry, matLineWhite);

        this.TRACK_line.computeLineDistances();
        this.TRACK_line.scale.set(1, 1, 1);
        LocalFrame.add(this.TRACK_line);
        showHider(this.TRACK_line, "[T]rack line", true, 't');

    }

    update() {
        // copy the matrix of the ball to the cameraFrustum, except scale.
        if (Ball && this.cameraFrustum) {
            // like with the podsEyeView camera, copy the up orientation
            // and look at the target
            this.cameraFrustum.group.up = V3(Ball.matrixWorld.elements[4],
                Ball.matrixWorld.elements[5],
                Ball.matrixWorld.elements[6])
            this.cameraFrustum.group.up.normalize()
            var worldTarget = V3(0, 0, 0)
            targetSphere.getWorldPosition(worldTarget)
            this.cameraFrustum.group.lookAt(worldTarget)
        }
    }

    recalculate() {
        this.makeTrackLine()
        makePointingLine()
    }
}

var PointingLineGeometry
var POINTING_line
function makePointingLine() {
    var oldVisible = false; // stupid way of doing it, because I'm recreatingthe object. Should alter geometry.
    if (POINTING_line != undefined) oldVisible = POINTING_line.visible
    LocalFrame.remove(POINTING_line)
    // Green track of view point line
    const line_points = [];
    for (var frame = 0; frame < Sit.frames; frame += 2) {
        var pitch, globalRoll;
        [pitch, globalRoll] = pitchAndGlobalRollFromFrame(frame)
        var glarePos = PRJ2XYZ(pitch, getGlareAngleFromFrame(frame) + jetRollFromFrame(frame), jetPitchFromFrame(), vizRadius)
        line_points.push(glarePos.x, glarePos.y, glarePos.z);
    }
    dispose(PointingLineGeometry)
    PointingLineGeometry = new LineGeometry();
    PointingLineGeometry.setPositions(line_points);
    POINTING_line = new Line2(PointingLineGeometry, matLineGreen);
    POINTING_line.visible = oldVisible
    POINTING_line.computeLineDistances();
    POINTING_line.scale.set(1, 1, 1);
    LocalFrame.add(POINTING_line);
    showHider(POINTING_line, "[L]ine of glare track", oldVisible, 'l');
}