// A variety of functions related to the jet and the atflir pod orientation, and glare
// so mostly related to Gimbal, GoFast, FLIR1 and Aguadilla

import {EarthRadiusMiles, gui, guiMenus, guiPhysics, guiTweaks, infoDiv, NodeMan, Sit, Units} from "./Globals";
import {par} from "./par";
import {abs, cos, degrees, metersFromMiles, metersFromNM, radians} from "./utils";
import {CueAz, EA2XYZ, EAJP2PR, getLocalUpVector, PRJ2XYZ, XYZ2EA} from "./SphericalMath";
import {DebugArrowAB, dispose, GridHelperWorld, propagateLayerMaskObject, sphereMark} from "./threeExt";
import * as LAYER from "./LayerMasks";
import {Line2} from "three/addons/lines/Line2.js";
import {LineGeometry} from "three/addons/lines/LineGeometry.js";
import {showHider, toggles} from "./KeyBoardHandler";
import {VG, ViewMan} from "./nodes/CNodeView";
import {chartDiv, setupGimbalChart, theChart, UpdateChart, UpdateChartLine, updateChartSize} from "./JetChart";
import {Ball, CNodeDisplayATFLIR, EOSU, PODBack, PodFrame} from "./nodes/CNodeDisplayATFLIR";
import {calculateGlareStartAngle, getDeroFromFrame, getPodRollFromGlareAngleFrame} from "./JetHorizon";
import {GlobalScene, LocalFrame} from "./LocalFrame";
import {CNodeDisplayTrack} from "./nodes/CNodeDisplayTrack";
import {CNodeConstant} from "./nodes/CNode";
import {CNodeScale, scaleNodeF2M} from "./nodes/CNodeScale";
import {CNodeGUIValue} from "./nodes/CNodeGUIValue";
import {CNodeLOSTraverse} from "./nodes/CNodeLOSTraverse";
import {CNodeLOSTraverseConstantSpeed} from "./nodes/CNodeLOSTraverseConstantSpeed";
import {CNodeMunge} from "./nodes/CNodeMunge";
import {CNodeLOSTraverseStraightLine, CNodeLOSTraverseStraightLineFixed} from "./nodes/CNodeLOSTraverseStraightLine";
import {CNodeLOSTraverseConstantAltitude} from "./nodes/CNodeLOSTraverseConstantAltitude";
import {CNodeSwitch} from "./nodes/CNodeSwitch";
import {makeMatLine, updateMatLineResolution} from "./MatLines";
import {CNodeViewUI} from "./nodes/CNodeViewUI";
import {
    AddAltitudeGraph,
    AddSizePercentageGraph,
    AddSpeedGraph,
    AddTailAngleGraph,
    AddTargetDistanceGraph
} from "./JetGraphs";
import {
    AlwaysDepth,
    BufferGeometry,
    Color,
    DoubleSide,
    Float32BufferAttribute,
    LineBasicMaterial,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    Plane,
    Sprite,
    SpriteMaterial,
    TextureLoader,
    Vector3
} from "three";
import {CNodeDisplayLOS} from "./nodes/CNodeDisplayLOS";
import {isLocal} from "../config";
import {CNodeATFLIRUI} from "./nodes/CNodeATFLIRUI";
import {CNodeView3D} from "./nodes/CNodeView3D";
import {CNodeChartView} from "./nodes/CNodeChartView";
import {CNodeHeading} from "./nodes/CNodeHeading";
import {CNodeInterpolateTwoFramesTrack} from "./nodes/CNodeInterpolateTwoFramesTrack";
import {CNodeCamera} from "./nodes/CNodeCamera";
import {trackVelocity} from "./trackUtils";
import {V3} from "./threeUtils";


var matLineWhite = makeMatLine(0xffffff);
var matLineCyan = makeMatLine(0x00ffff,1.5);
var matLineGreen = makeMatLine(0x00ff00);
var matLineGreenThin = makeMatLine(0x00c000,1.0);



export function jetRollFromFrame(f) {
    return NodeMan.get("bank").v(f)
}

export function jetPitchFromFrame(f = -1) {
    if (f == -1) f = par.frame;
    var jetPitch = par.jetPitch;
    if (par.scaleJetPitch) {
        var roll = jetRollFromFrame(f)
        jetPitch *= 1 / cos(radians(abs(roll)))
    }
    return jetPitch;
}


// marker spheres and maybe a sprite for the glare
// these are all in the LocalFrame
// setup by Gimbal, GoFast, FLIR1 and Aguadilla
export function initJetVariables() {
    targetSphere = sphereMark(V3(0,0,0),2,0xffffff, LocalFrame)

    aSphere = sphereMark(V3(0,0,0),1.5,0xc08080,LocalFrame)
    bSphere = sphereMark(V3(0,0,0),1.5,0x80c080,LocalFrame)
    glareSphere = sphereMark(V3(0,0,0),1.8,0x00ff00,LocalFrame)

    glareSphere.name = "glareSphere"

    if (Sit.showGlare) {
        const mapt = new TextureLoader().load('data/images/GlareSprite.png?v=1');
        const spriteMaterial = new SpriteMaterial({map: mapt, color: 0xffffff, sizeAttenuation: false});

        glareSprite = new Sprite(spriteMaterial);
        glareSprite.position.set(0, 0, -50)
        glareSprite.scale.setScalar(0.04)
        glareSprite.layers.disable(LAYER.MAIN)
        glareSprite.layers.enable(LAYER.podsEye)
        glareSprite.layers.enable(LAYER.LOOK)
    }
}


export function getHumanHorizonFromPitchRollAzEl(jetPitch, jetRoll, az, el) {


//     if (type == 1) {
//         return jetRoll * cos(radians(az)) + jetPitch * sin(radians(az));
//     } else {
//         // rotate the absolute 3D coordinates of (el, az) into the frame of reference of the jet
//         vec3d relative_AzElHeading = EA2XYZ(el, az, 1)
//             .rotate(vec3d { 1, 0, 0 }, -radians(jetPitch)) // reverse both the order and sign of these rotations
//              .rotate(vec3d { 0, 0, 1 }, radians(jetRoll));

    var relative_AzElHeading = EA2XYZ(el, az, 1)
        .applyAxisAngle(V3(1, 0, 0), -radians(jetPitch))
        .applyAxisAngle(V3(0, 0, 1), radians(jetRoll))

//         // caclulcate (el, az) angles relative to the frame of reference of the jet
//         auto [relative_el, relative_az] = XYZ2EA(relative_AzElHeading);
    var relative_el, relative_az;
    [relative_el, relative_az] = XYZ2EA(relative_AzElHeading)

//
//         // compute the jet's pose in the global frame of reference
//         auto jetUp = vec3d { 0, 1, 0 }
//     .rotate(vec3d { 0, 0, 1 }, -radians(jetRoll))
//     .rotate(vec3d { 1, 0, 0 }, radians(jetPitch));
    var jetUp = V3(0, 1, 0)
        .applyAxisAngle(V3(0, 0, 1), -radians(jetRoll))
        .applyAxisAngle(V3(1, 0, 0), radians(jetPitch))

//         auto jetRight = vec3d { 1, 0, 0 }
//     .rotate(vec3d { 0, 0, 1 }, -radians(jetRoll))
//     .rotate(vec3d { 1, 0, 0 }, radians(jetPitch));
    var jetRight = V3(1, 0, 0)
        .applyAxisAngle(V3(0, 0, 1), -radians(jetRoll))
        .applyAxisAngle(V3(1, 0, 0), radians(jetPitch))

//    DebugArrowV("jetUp",jetUp)

//         // rotate the camera by relative_az in the wing plane so that it's looking at the object
//         // the camera pitching up by relative_el has no effect on a vector pointing right
//         auto camera_horizon = jetRight.rotate(jetUp, -radians(relative_az));
    var camera_horizon = jetRight.applyAxisAngle(jetUp, -radians(relative_az));

//    DebugArrowV("camera_horizon",camera_horizon,100,0xff0000) // red

//    pointObject3DAt(gridHelperNod, camera_horizon)

//         // the real horizon is a vector pointing right, perpendicular to the global viewing angle az
//         auto real_horizon = vec3d { 1, 0, 0 }.rotate(vec3d { 0, 1, 0 }, -radians(az));
    var real_horizon = V3(1, 0, 0).applyAxisAngle(V3(0, 1, 0), -radians(az))
//    DebugArrowV("real_horizon",real_horizon,100,0x00ff00) // green

//
//         // it can be shown that the real horizon vector is already in the camera plane
//         // so return the angle between the camera horizon and the real horizon
//         return -degrees(camera_horizon.angleTo(real_horizon));
    return -degrees(camera_horizon.angleTo(real_horizon));
//     }
// }
}


export function Frame2Az(frame) {
    return NodeMan.get("azSources").v(frame)
}

export function Frame2El(frame) {
    return NodeMan.get("el").v(frame)
}

// https://www.metabunk.org/threads/gimbal-derotated-video-using-clouds-as-the-horizon.12552/page-2#post-276183
//double get_real_horizon_angle_for_frame(int frame, int type = 2) {
export function get_real_horizon_angle_for_frame(frame) {
//    double el = Frame2El(frame), az = Frame2Az(frame);
//    double jetPitch = jetPitchFromFrame(frame), jetRoll = jetRollFromFrame(frame);

    var jetPitch = jetPitchFromFrame(frame) // this will get scaled pitch
    var jetRoll = jetRollFromFrame(frame)
    var az = Frame2Az(frame)
    var el = Frame2El(frame);

    return getHumanHorizonFromPitchRollAzEl(jetPitch, jetRoll, az, el)
}

export var targetSphere;
export var glareSphere;
export var aSphere;
export var bSphere;
// just for NAR view and dero view for gimbal
export var glareSprite

export function getGlareAngleFromFrame(f) {
    if (!NodeMan.exists("glareAngle")) {
        if (f === 0)
            console.warn("GlareAngleFromFrame being called BUT missing glareAngle node")
        return 0;
    }

    // this is different to GimbalSim, as that was negative
    if (f < 698) {
        var old = parseFloat(NodeMan.get("glareAngle").getValueFrame(0)) // old flat line
        // so here we need to SUBTRACT the fraction of par.initialGlareRotation
        var modified = old - par.initialGlareRotation * (697 - f) / 697 // go from +6 to +0
        return par.glareStartAngle + modified
    }

    return par.glareStartAngle + NodeMan.get("glareAngle").getValueFrame(f)

}


// Take a frame number in the video (i.e. a time in 1/30ths)
// and return the angle formed by projecting the camera's Az/El vector
// onto the plane of the wings
export function Frame2CueAz(frame) {
    // get az for this frame (el is constant, in par.el)
    // this comes from video data, shown on the graph as yellow
    const az = Frame2Az(frame)
    const el = Frame2El(frame)
    const jetRoll = jetRollFromFrame(frame) // get jet roll angle from either video data or constant
    const jetPitch = jetPitchFromFrame(frame)
    return CueAz(el, az, jetRoll, jetPitch)
}

// calculate just the pod roll, ie global roll less the jet roll
// calculate the "ideal" roll angle (pod roll plus jet roll) to point at target
export function pitchAndGlobalRollFromFrame(frame) {
    var az = Frame2Az(frame)
    var el = Frame2El(frame)
    var pitch, globalRoll;
    return EAJP2PR(el, az, jetPitchFromFrame(frame))
}

function globalRollFromFrame(frame) {
    var pitch, globalRoll
    [pitch, globalRoll] = pitchAndGlobalRollFromFrame(frame)
    return globalRoll;
}

export function podRollFromFrame(frame) {
    var globalRoll = globalRollFromFrame(frame)
    var podRoll = globalRoll - jetRollFromFrame(frame);
    if (podRoll < -180) podRoll += 360;
    if (podRoll >= 180) podRoll -= 360;
    return podRoll
}

var LOS_line;
var LOS_points;
var LOS_geometry;
var LOSX_line;
var LOSX_points;
var LOSX_geometry;

export function updateLOS(scene, targetPos) {


    LOS_points = [0, 0, 0, 0, 0, 0]
    if (par.deroFromGlare) {
        LOS_points[3] = glareSphere.position.x;
        LOS_points[4] = glareSphere.position.y;
        LOS_points[5] = glareSphere.position.z;
    } else {
        LOS_points[3] = targetPos.x;
        LOS_points[4] = targetPos.y;
        LOS_points[5] = targetPos.z;
    }
    LocalFrame.remove(LOS_line)
    dispose(LOS_geometry)
    LOS_geometry = new LineGeometry();
    LOS_geometry.setPositions(LOS_points);
    LOS_line = new Line2(LOS_geometry, matLineGreen);
    LOS_line.layers.mask = LAYER.MASK_HELPERS;
    LocalFrame.add(LOS_line)

    var LOSXlen = 10000
    LOSX_points = [0, 0, 0, 0, 0, 0]

    var localOrigin = V3(0, 0, 0)
    var worldLos = targetPos.clone().multiplyScalar(LOSXlen)

    LocalFrame.localToWorld(localOrigin)
    LocalFrame.localToWorld(worldLos)

    LOSX_points[0] = localOrigin.x;
    LOSX_points[1] = localOrigin.y;
    LOSX_points[2] = localOrigin.z;

    LOSX_points[3] = worldLos.x;
    LOSX_points[4] = worldLos.y;
    LOSX_points[5] = worldLos.z;

    scene.remove(LOSX_line)
    dispose(LOSX_geometry)

    LOSX_geometry = new LineGeometry();
    LOSX_geometry.setPositions(LOSX_points);
    LOSX_line = new Line2(LOSX_geometry, matLineWhite);
    LOSX_line.layers.mask = LAYER.MASK_HELPERS;
    scene.add(LOSX_line)
}

var ERROR_circle;
var ERROR_points;
var ERROR_geometry;

export function update_ERROR_circle(scence, circleCenter) {
    // to make the circle, we have a vector v, and we want to first rotate it
    // by 5° away from itself.
    // to do this we get a rotation vector p that's perpendicular to v and rotate around that

    LocalFrame.remove(ERROR_circle)
    var p = V3(-circleCenter.z, circleCenter.y, circleCenter.x)
    p.cross(circleCenter)

    p.normalize()  // to use a vector as an axis it needs to be normalized

    var circlePoint = V3(circleCenter.x, circleCenter.y, circleCenter.z)
    circlePoint.applyAxisAngle(p, radians(5))
    ERROR_points = []

    var circleDirection = circleCenter.clone().normalize()

    ERROR_points.push(circlePoint.x, circlePoint.y, circlePoint.z)
    var circleTurn = 5;
    for (var i = 0; i <= 360; i += circleTurn) {
        circlePoint.applyAxisAngle(circleDirection, radians(circleTurn))
        ERROR_points.push(circlePoint.x, circlePoint.y, circlePoint.z)
    }

    dispose(ERROR_geometry)
    ERROR_geometry = new LineGeometry();
    ERROR_geometry.setPositions(ERROR_points);
    var oldErrorCircleVisible = true;
    if (ERROR_circle != undefined)
        oldErrorCircleVisible = ERROR_circle.visible
    ERROR_circle = new Line2(ERROR_geometry, matLineGreenThin);
    ERROR_circle.layers.enable(LAYER.podsEye)
    ERROR_circle.visible = oldErrorCircleVisible
    LocalFrame.add(ERROR_circle)
    showHider(ERROR_circle, 'showErrorCircle', oldErrorCircleVisible, 'o')
}

export var vizRadius = 100
var debugText = ""; // stick text in here, and it's show instead of keyboard shortcuts
export function UpdateHUD() {
    /*
     var pitch1, pitch2, startRoll, endRoll;


     [pitch1, startRoll] = EAJP2PR(par.el, -54, jetPitchFromFrame());
     startRoll -= jetRollFromFrame(0);
     [pitch2, endRoll] = EAJP2PR(par.el, 8, jetPitchFromFrame());
     endRoll -= jetRollFromFrame(Sit.frames-1);
     var rollRange = Math.abs(endRoll-startRoll)

     infoDiv.innerHTML =
         "El           " + par.el.toFixed(1) + "°<br>" +
         "Az           " + par.az.toFixed(1) + "°<br>" +
         "Global Roll  " + par.globalRoll.toFixed(1) + "°<br>" +
         "Jet Roll     " + NodeMan.get("bank").v(par.frame).toFixed(1) + "°<br>" +
         "Pod Roll     " + par.podRollIdeal.toFixed(1) + "°<br>" +
         "Roll Range   " + rollRange.toFixed(1) + "°<br>" +
         "Pod Pitch    "    + par.podPitchPhysical.toFixed(1) + "°<br>"
 */
    var keyInfo = ""

    // keyInfo += navigator.userAgent+"<br>"
    // keyInfo += navigator.platform+"<br>"

    if (par.showKeyboardShortcuts) {
        keyInfo += "[F]ull Screen<br>" +
            "[1] Z Axis Snap<br>" +
            "[7] Y Axis Snap<br>" +
            "[3] X Axis Snap<br>" +
            "[9] 180° view toggle<br>"
        ;
    }
    if (ViewMan.list.video.data.videoPercentLoaded > 0 && ViewMan.list.video.data.videoPercentLoaded < 100) {
        keyInfo += "Loading Video " + VideoPercentLoaded + "%<br>";
    }


    if (par.showKeyboardShortcuts) {

        Object.keys(toggles).forEach(function (key) {
            keyInfo += toggles[key]._name + "<br>"
        })
    }

    if (debugText != "")
        infoDiv.innerHTML = debugText;
    else
        infoDiv.innerHTML = keyInfo;

    UpdateChartLine();

}

// Do what needs doing if pitch and or roll (including JetRoll) has changed
// we re-calculate global roll here
// so are assuming that podRoll and jetRoll are correc
export function ChangedPR() {

    if (Ball == undefined) {
        // waiting for the model to load, so set a flag saying we need to do this again
        // this is a patch, as we really should seperate the the rendered model from the calculations
        // of the gimbal orientation (plane->EOSU->Ball)
        // this is legacy code
        par.needsGimbalBallPatch = true;
        return;
    }

    par.needsGimbalBallPatch = false;

    // calculate the global roll (total roll needed)
    // this is used elsewhere
    par.globalRoll = par.podRollPhysical + NodeMan.get("bank").v(par.frame);

    // give pitch, roll, bank, set the ATFLIR pods pars rotations
    // These are all relative to the jet
    PodFrame.rotation.z = radians(-NodeMan.get("bank").v(par.frame))
    PodFrame.rotation.x = radians(jetPitchFromFrame())
    Ball.rotation.x = radians(-par.podPitchPhysical)
    EOSU.rotation.z = radians(-par.podRollPhysical)

    // INPUT
    var jetTrack = NodeMan.get("jetTrack")
    // move the jet!!!
    // we also need to be able to move the camera WITH the jet.
    var jet = jetTrack.p(par.frame);
    var offset = jet.clone().sub(LocalFrame.position)
    LocalFrame.position.add(offset)


    // how much has the heading changed
    const oldHeading = par.jetHeading;
    const newHeading = jetTrack.v(par.frame).heading
    var headingChange = newHeading - oldHeading;
    if (headingChange < -180) headingChange += 360;

    // rotate the LocalFrame by this
    // TODO: this is a about the Y axis, should it not be local up?
    var upAxis = V3(0, 1, 0)

    // rotateOnAxis is in OBJECT space, so it rotates the object
    // about it's own origin
    //LocalFrame.rotateOnAxis(upAxis,-radians(headingChange))

    LocalFrame.quaternion.identity()
    LocalFrame.rotateOnAxis(upAxis, -radians(newHeading))

    LocalFrame.updateMatrix()
    LocalFrame.updateMatrixWorld()

    // lock camamera to ATFLIR helper
    //


    // // Lock camera to jet by adding the same ffset and rotating by the heading change
    // if (par.lockCameraToJet) {
    //     const mainCam = NodeMan.get("mainCamera").camera;
    //
    //     mainCam.position.add(offset)
    //
    //     mainCam.position.sub(LocalFrame.position)
    //     mainCam.position.applyAxisAngle(upAxis, -radians(headingChange))
    //     mainCam.position.add(LocalFrame.position)
    //
    //     mainCam.rotateOnAxis(upAxis, -radians(headingChange))
    //
    //     mainCam.updateMatrix()
    //     mainCam.updateMatrixWorld()
    // }

    // now the forward vector of the jet will be correct
    // we need to adjust the local frame so the up Vector is correct,
    // OR should we set it from the track?
    // really what we are interest in here are
    // A) the view of the lookCam
    // B) the lines of sight

    var _x = V3()
    var _y = V3()
    var _z = V3()
    LocalFrame.matrix.extractBasis(_x, _y, _z)  // matrix or matrixWorld? parent is GlobalScene, so

    // INPUT
    var localUp = getLocalUpVector(LocalFrame.position, metersFromMiles(NodeMan.get("radiusMiles").v0))

    _y.copy(localUp)

    // as per lookAt,
    // x = cross(y,z)
    // y = cross(z,x)
    // z = cross(x,y)

    _x.crossVectors(_y, _z)
    _z.crossVectors(_x, _y)

    var m = new Matrix4()
    m.makeBasis(_x, _y, _z)

    LocalFrame.quaternion.setFromRotationMatrix(m);

    // the local matrix is composed from position, quaternion, and scale.
    // the world matrix is the parent's world matrix multipled by this local matrix

    LocalFrame.updateMatrix()
    LocalFrame.updateMatrixWorld()

    par.jetHeading = newHeading;

    var glarePos = PRJ2XYZ(par.podPitchPhysical, par.podRollPhysical + NodeMan.get("bank").v(par.frame), jetPitchFromFrame(), vizRadius)

   glareSphere.position.copy(glarePos);

    var targetPos = PRJ2XYZ(par.podPitchIdeal, par.podRollIdeal + NodeMan.get("bank").v(par.frame), jetPitchFromFrame(), vizRadius)
    targetSphere.position.copy(targetPos)

    updateLOS(GlobalScene, targetPos)

    var aV = EA2XYZ(Frame2El(Sit.aFrame), Frame2Az(Sit.aFrame), vizRadius)
    aSphere.position.copy(aV)
    var bV = EA2XYZ(Frame2El(Sit.bFrame), Frame2Az(Sit.bFrame), vizRadius)
    bSphere.position.copy(bV)

    var circleCenter = glareSphere.position;

    update_ERROR_circle(GlobalScene, circleCenter)

    if (theChart !== undefined) {
        theChart.cursor.show = true;
        theChart.cursor.x = 100;
        theChart.cursor.y = 200;
    }


    //  var rotationMatrix = new Matrix4().extractRotation(PodFrame.matrixWorld);
    //  var jetUp = new Vector3(0, 1, 0).applyMatrix4(rotationMatrix).normalize();

    // The rotations below are equivalent to the above,
    // but I'm doing it explicitly like this
    // to match the code in Frame2CueAz,
    // so the graph uses the same code as the arrows
    // except instead of using a unit sphere
    // we use one of radius vizRadius
    // to get the large arrows in the display.
    var jetUp = new Vector3(0, 1, 0)
    jetUp.applyAxisAngle(V3(0, 0, 1), -radians(NodeMan.get("bank").v(par.frame)))
    jetUp.applyAxisAngle(V3(1, 0, 0), radians(jetPitchFromFrame()))
    var jetPlane = new Plane(jetUp, 0) // plane in Hessian normal form, normal unit vector and a distance from the origin
    // take the targetPos (the white dot) and project it onto the jetPlane
    var cuePos = new Vector3;
    jetPlane.projectPoint(targetPos, cuePos) // project targetPos onto jetPlane, return in cuePos
//    DebugArrowAB("Projected Cue", targetPos, cuePos, 0x00ffff, false, LocalFrame)
//    DebugArrowAB("Cue Az", V3(0, 0, 0), cuePos, 0x00ffff, false, LocalFrame)

    var horizonPlane = new Plane(V3(0, 1, 0), 0)
    var azPos = new Vector3;
    horizonPlane.projectPoint(targetPos, azPos) // the same as just setting y to 0
//    DebugArrowAB("Projected Az", targetPos, azPos, 0xffff00, false, LocalFrame)
//    DebugArrowAB("Az", V3(0, 0, 0), azPos, 0xffff00, false, LocalFrame)
    UpdateHUD()
}


export function UpdatePRFromEA() {
    var pitch, roll;
    [pitch, roll] = EAJP2PR(Frame2El(par.frame), Frame2Az(par.frame), jetPitchFromFrame());
    par.podPitchPhysical = pitch;
    par.podPitchIdeal = pitch;
    par.globalRoll = roll
    par.podRollIdeal = par.globalRoll - NodeMan.get("bank").v(par.frame);
    if (par.deroFromGlare) {
        par.podRollPhysical = getPodRollFromGlareAngleFrame(par.frame)
    } else
        par.podRollPhysical = par.podRollIdeal
    ChangedPR()
}

export function UIChangedAz() {
    // we find the correct frame by finding the first one that has a calculated Az that
    // is greater than this az
    var aZDecreasing = Frame2Az(Sit.frames - 1) < Frame2Az(0)
    for (var f = 0; f < Sit.frames; f++) {
        if ((aZDecreasing ? Frame2Az(f) <= par.az : Frame2Az(f) >= par.az)) {
            console.log("UIChangedAz: frame " + par.frame + "-> " + f + " from az = " + par.az)
            par.frame = f;
            break;
        }
    }
    UIChangedFrame();
}

export function UIChangedTime() {
    par.renderOne = true;

    par.frame = Math.round(par.time * Sit.fps)
    if (par.frame >= Sit.frames) {
        par.frame = Sit.frames - 1
    }
    if (Sit.azSlider) {
        par.az = Frame2Az(par.frame)
        par.el = Frame2El(Sit.aFrame)
        UpdatePRFromEA()
    }

    par.paused = true;
}


// not sure if this function is even needed
export function UIChangedFrame() {
    par.renderOne = true;

    if (par.frame > Sit.frames - 1) par.frame = Sit.frames - 1;

    par.time = par.frame / Sit.fps
    if (Sit.azSlider) {
        par.az = Frame2Az(par.frame)
        par.el = Frame2El(Sit.aFrame)
        UpdatePRFromEA()
        NodeMan.get("azSources").recalculateCascade()
    }
    par.paused = true;
}

export var ATFLIR;
export function setATFLIR(a) {ATFLIR = a;}

export function curveChanged() {
    UpdateChart()
    UpdatePRFromEA()

    ATFLIR.recalculate()

    par.renderOne = true;

}

export function UIChangedPR() {
    par.paused = true;
    par.renderOne = true;
    ChangedPR();
}

export function SetupTrackLOSNodes() {

//    console.log("+++ JetLOSDisplayNode")

    if (Sit.name === "gimbal" || Sit.name === "gimbalnear") {
        new CNodeDisplayLOS({
            id: "JetLOSDisplayNode",
            inputs: {
                LOS: "JetLOS",
            },
            //     highlightLines:{369:makeMatLine(0xff0000,2)}, // GoFast first frame with RNG

            color: 0x404040,


            // // @dimebag2 lines
            // highlightLines: {
            //     30: makeMatLine(0x800000, 2),  // 1*30 PT1 Red
            //     330: makeMatLine(0x000080, 2), // 11 sec PT2 Blue
            //     630: makeMatLine(0x805300, 2), // 21 sec PT3 Orange
            //     930: makeMatLine(0x800080, 2), // 31 sec PT4 Magnenta
            //     1020: makeMatLine(0x008000, 2)
            // }, // 34 sec PT5 green


        })

    }

//    console.log("+++ JetTrackDisplayNode")
    new CNodeDisplayTrack({
        id: "jetTrackDisplayNode",
        track: "jetTrack",
        color: new CNodeConstant({id: "jetTrackColor", value: new Color(0, 1, 1)}),
        secondColor:    new CNodeConstant({id: "jetTrackColor2", value: new Color(0, 0.75, 0.75)}),
        width: 3,
        depthFunc:AlwaysDepth,
        toGround:60,
    })

//    console.log("+++ LOSTraverseDisplayNode")
    new CNodeDisplayTrack({
        id: "LOSTraverseDisplayNode",
        inputs: {
            track: "LOSTraverseSelect",
            color:          new CNodeConstant({id: "losTraverseColor", value: new Color(0, 1, 0)}),
            secondColor:    new CNodeConstant({id: "losTraverseColor2",value: new Color(0, 0.75, 0)}),
            width:          new CNodeConstant({id: "losTraverseWidth",value: 3}),
        },
        frames: Sit.frames,
        depthFunc:AlwaysDepth,
    })



}


export function SetupTraverseNodes(id, traverseInputs,defaultTraverse,los = "JetLOS", idExtra="", exportable=true) {
    CreateTraverseNodes(idExtra, los);
    return MakeTraverseNodesMenu(id, traverseInputs,defaultTraverse, idExtra, exportable)
}



// COMMON TRAVERSE NODE OPTIONS
//
export function CreateTraverseNodes(idExtra="", los = "JetLOS") {


    // A GUI variable for the start distance - this is one of the biggest variables
    // It's the distance of the start of the traverse along the first LOS
    if (!NodeMan.exists("startDistance")) {
        new CNodeScale("startDistance", Units.big2M, new CNodeGUIValue({
            id: "startDistanceGUI",
            value: Sit.startDistance,
            start: Sit.startDistanceMin,
            end: Sit.startDistanceMax,
            step: 0.01,
            desc: "Tgt Start Dist " + Units.bigUnitsAbbrev,
            color: "#FFC0C0"
        }, guiMenus.traverse))
    }

//    console.log("+++ LOSTraverse")
    new CNodeLOSTraverse({
        id: "LOSTraverse1"+idExtra,
        LOS: los,
        startDist: "startDistance",
        VcMPH: new CNodeGUIValue({id: "targetVCGUI"+idExtra, value: 20, start: -500, end: 500, step: 0.01, desc: "Target Vc MPH"
        },
            guiMenus.traverse),
    })


    // GUI variable Target Speed in Knots (scaled to m/s)
    if (!NodeMan.exists("speedScaled")) {
        new CNodeScale("speedScaled", 1 / Units.m2Speed,
            new CNodeGUIValue({
                id: "targetSpeedGUI"+idExtra,
                value: Sit.targetSpeed,
                start: Sit.targetSpeedMin,
                end: Sit.targetSpeedMax,
                step: Sit.targetSpeedStep,
                desc: "Target Speed " + Units.speedUnits
            }, guiMenus.traverse))
    }

    // Traverse at constant GROUND speed (using the above)
    new CNodeLOSTraverseConstantSpeed({
        id: "LOSTraverseConstantSpeed"+idExtra,
        inputs: {
            LOS: los,
            startDist: "startDistance",
            speed: "speedScaled",
            wind: "targetWind"
        },
        airSpeed:false,

    }, guiPhysics)

    // Traverse at constant AIR speed
    new CNodeLOSTraverseConstantSpeed({
        id: "LOSTraverseConstantAirSpeed"+idExtra,
        inputs: {
            LOS: los,
            startDist: "startDistance",
            speed: "speedScaled",
            wind: "targetWind"
        },
        airSpeed:true,
    },guiMenus.traverse)

    // as above, but interpolate between the start and end frames
    // remaining constant speed, but not necessarily on the LOS
    new CNodeInterpolateTwoFramesTrack({
        id: "LOSTraverseStraightConstantAir"+idExtra,
        source: "LOSTraverseConstantAirSpeed"+idExtra,
    },guiMenus.traverse)


    // In any Sitch we have an initialHeading and a relativeHeading
    // initialHeading is historically the start direction of the jet, like in Gimbal
    // it's the direction we set the jet going in
    //
    // relativeHeading is added to initialHeading to get targetActualHeading
    //
    // for Gimbal and similar this allowed us to rotate the jet's path with initialHeading
    // and then adjust (rotate) the targetActualHeading realtive to that.
    // For Aguadilla though, the initialheading is a fixed 0, sicne the path is fixed
    // meaning that relativeHeading is actually absolut (i.e. relative to 0)
    // i.e. we have a single number defining targetActualHeading

    // initial Heading might not exist
    if (!NodeMan.exists("initialHeading")) {
        new CNodeHeading({
            id: "initialHeading",
            heading: Sit.heading ?? 0,
            name: "Initial",
            arrowColor: "green"

        }, guiMenus.traverse)
    }

    if (!NodeMan.exists("targetRelativeHeading")) {
        new CNodeGUIValue({
            id: "targetRelativeHeading",
            value: Sit.relativeHeading,
            start: -180,
            end: 180,
            step: 0.01,
            desc: "Tgt Relative Heading"
        }, guiMenus.traverse)
    }

    if (!NodeMan.exists("targetActualHeading")) {
        new CNodeMunge({
            id: "targetActualHeading",
            inputs: {initialHeading: "initialHeading", relativeHeading: "targetRelativeHeading"},
            munge: function (f) {
                var newHeading = this.in.initialHeading.getHeading() + this.in.relativeHeading.v0
                if (newHeading < 0) newHeading += 360;
                if (newHeading >= 360) newHeading -= 360
                return newHeading
            }
        }, guiMenus.traverse)
    }
    // and with that target heading we can try for a stright line traversal
    // currently very simplistic and does not work with noisy data.
    new CNodeLOSTraverseStraightLine({
        id: "LOSTraverseStraightLine"+idExtra,
        LOS: los,
        startDist: "startDistance",
        radius: "radiusMiles",
        lineHeading: "targetActualHeading",
    })

    new CNodeLOSTraverseStraightLineFixed({
        id: "LOSTraverseStraightLineFixed"+idExtra,
        LOS: los,  // we just need the first LOS
        startDist: "startDistance",
        radius: "radiusMiles",
        lineHeading: "targetActualHeading",
        speed: "speedScaled",
    })


    // Constant altitude
//    console.log("+++ LOSTraverseConstantAltitude Node")
    new CNodeLOSTraverseConstantAltitude({
        id: "LOSTraverseConstantAltitude"+idExtra,
        inputs: {
            LOS: los,
            startDist: "startDistance",
            radius: "radiusMiles",
        },
    })
}

// IMPORTANT node here
// The LOSTraverseSelect node is the selected LOS traversal method
// We pass in which ones of the above we want, plue any extra ones
// (For example in Agua we add the ufoSplineEditor node)
export function MakeTraverseNodesMenu(id, traverseInputs,defaultTraverse,idExtra="", exportable=true) {


    let traverseInputs2 = {}
    for (var inputID in traverseInputs) {
        traverseInputs2[inputID] = traverseInputs[inputID]+idExtra
    }

    let nodeMenu = new CNodeSwitch({
        id: id,
        inputs: traverseInputs2,
        desc: "LOS Traverse " + idExtra,
        default: defaultTraverse,
        exportable: exportable,

    }, guiMenus.traverse)

    // bit of a patch
    nodeMenu.frames = Sit.frames;
    nodeMenu.useSitFrames = true;
    return nodeMenu;

}


// pixel dimension of the overall browser window renderble area.
// same coordinate system as the mouse clicks
//windowWidth  = window.innerWidth;
//windowHeight = window.innerHeight;

var lastWindowWidth, lastWindowHeight;


// Detects if the page's window has been resized, and resize things as needed.
export function updateSize(force) {

    if (force || lastWindowWidth != window.innerWidth || lastWindowHeight != window.innerHeight) {
        var windowWidth = window.innerWidth;
        var windowHeight = window.innerHeight;
        lastWindowHeight = windowHeight;
        lastWindowWidth = windowWidth;

        updateMatLineResolution(windowWidth*2, windowHeight*2)

        var scale = window.innerWidth / 1920

        ViewMan.updateSize();

        ViewMan.iterate((key, data) => data.updateWH())
        infoDiv.style.fontSize = 12 * scale + "px"
        updateChartSize()
        par.renderOne = true;
    }
}



export function initViews() {
    new CNodeChartView({
        id: "chart",
        top: 0.5, height: 0.5, width: -1,
        visible: true,
        // draggable is handled internally
    })

    ViewMan.get("chart").setVisible(par.showChart);

    var labelOriginalVideo = new CNodeViewUI({id: "labelOriginalVideo", overlayView: ViewMan.list.video.data});
    labelOriginalVideo.addText("videolabel", "ORIGINAL VIDEO", 70, 10, 3, "#f0f00080")
    labelOriginalVideo.setVisible(true)

    if (1 || !isLocal) {
        var labelMainView = new CNodeViewUI({id: "labelMainView", overlayView: ViewMan.list.mainView.data});
        labelMainView.addText("videolabel1", "WORK IN PROGRESS", 45, 90, 3, "#f0f00020")
        labelMainView.addText("videolabel2", "RESULTS MAY VARY", 45, 95, 3, "#f0f00020")
        labelMainView.setVisible(true)
    }
    var farClipLook = metersFromMiles(500)



    if (Sit.name === "gimbal" || Sit.name === "gimbalnear" || Sit.name === "flir1") {

        // a grid spaced one Nautical mile square
        const gridSquaresGround = 200
        let gridHelperGround = new GridHelperWorld(1,metersFromNM(gridSquaresGround), gridSquaresGround, metersFromMiles(EarthRadiusMiles), 0x606000, 0x606000);
        GlobalScene.add(gridHelperGround);

        setATFLIR(new CNodeDisplayATFLIR({
            id: "displayATFLIR",
            inputs: {},
            layers: LAYER.MASK_MAIN, // ATFLIR pod would obscure the camera in look view
        }))

        // everything in the local frame should show up in MAIN, but not in LOOK
        LocalFrame.layers.mask = LAYER.MASK_MAIN;
        propagateLayerMaskObject(LocalFrame);

    }


    var line_material = new LineBasicMaterial({color: 0xffffff});
    var line_materialRED = new LineBasicMaterial({color: 0xff8080, linewidth: 5});

    // Now using the Line2, etc from https://github.com/mrdoob/three.js/blob/master/examples/webgl_lines_fat.html

    var pitchStep = 2;
    var rollStep = 1;
    var pitchGap = 10
    var rollGap = 10;

    // an invisible hemisphere, just for collision, with vizRadius
    const positions = [];
    for (var pitch = 0; pitch < 90; pitch += pitchGap) {

        for (var roll = 0; roll <= 360; roll += rollGap) {
            var A = PRJ2XYZ(pitch, roll, 0, vizRadius)
            var B = PRJ2XYZ(pitch, roll + rollGap, 0, vizRadius)
            var C = PRJ2XYZ(pitch + pitchGap, roll, 0, vizRadius)
            var D = PRJ2XYZ(pitch + pitchGap, roll + rollGap, 0, vizRadius)

            // It's a triangle list (not a strip), so need two sets of three verts for a quad.
            positions.push(A.x, A.y, A.z);
            positions.push(C.x, C.y, C.z);
            positions.push(B.x, B.y, B.z);

            positions.push(C.x, C.y, C.z);
            positions.push(D.x, D.y, D.z);
            positions.push(B.x, B.y, B.z);

        }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.computeBoundingSphere();

    const material = new MeshBasicMaterial({
        color: 0x101010,
        transparent: true,
        opacity: 0.5,
        side: DoubleSide  // not workingf ?

    });

    if (Sit.name === "gimbal" || Sit.name === "gimbalnear") {
        var dragMesh = new Mesh(geometry, material);
        dragMesh.visible = false;
        dragMesh.name = "dragMesh"
        PodFrame.add(dragMesh);
    }

    // These are Az, El, so the numbers read on screen


    if (Sit.name === "gimbal" || Sit.name === "gimbalnear" && Sit.showGlare) {
        LocalFrame.add(glareSprite);
        showHider(glareSprite, "Glare Spr[I]te", false, 'i')
    }

    // mobile adjustments, no keyboard, no chart, UI closed
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ||
        (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.platform)) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 0)
    ) {
        gui.close()
        par.showChart = false;
        chartDiv.style.display = 'none';
        par.showKeyboardShortcuts = false;
        //   infoDiv.style.display = 'none';
    }


    if (Sit.name === "gimbal" || Sit.name === "gimbalnear") {
        // this is calculated at the start, and when glareAngle switch node is changed
        calculateGlareStartAngle();

        setupGimbalChart()
    }


    updateSize(true);
}

export function SetupCommon(altitude=25000) {
//    console.log("+++ radiusMiles Node")
    // new CNodeGUIValue({
    //     id: "radiusMiles",
    //     value: EarthRadiusMiles,
    //     start: 500,
    //     end: 10000,
    //     step: 1,
    //     desc: "Earth Radius"
    // }, guiTweaks)

    // console.log(">>>+++ jetAltitude Node")
    // scaleNodeF2M("jetAltitude", new CNodeGUIValue({
    //     value: altitude,
    //     desc: "Altitude",
    //     start: altitude-500,
    //     end: altitude+500,
    //     step: 1
    // }, guiTweaks))

//    console.log("+++ cloudAltitude Node")
    scaleNodeF2M("cloudAltitude", new CNodeGUIValue({
        id: "cloudAltitudeGUI",
        value: 11740,           // Was 9500 when we had refraction adjusted Earth radius, not it's all wgs84.RADIUS
        start: 0,
        end: 26000,
        step: 10,
        desc: "Cloud Altitude"
    }, guiTweaks))

}

export function CommonJetStuff() {
    console.log(">>>+++ CommonJetStuff()")
    // only gimbal uses this
    AddSpeedGraph("LOSTraverseSelect","Target Speed",0,360,0.6,0,-1,0.25,
        [
        {x: 716, x2:725, color: "#FF00ff40"},
        {x: 813,x2:828, color: "#ff00ff40"},
        {x: 861,x2:943, color: "#ff00ff40"},
        {x: 978,x2:984, color: "#ff00ff40"},
    ])
    AddAltitudeGraph(10000, 45000)

    if (Sit.name == "gimbal") {
        AddTailAngleGraph(null, {left: 0.73, top: .25, width: -1, height: .25})
    }

    AddTargetDistanceGraph()
    AddSizePercentageGraph()

    initViews()

    UpdateHUD()
    UpdateChart()
}

// for Gimbal, GoFast, FLIR1, and Aguadilla
export function initJetStuff() {
    console.log(">>>+++ initJetStuff()")

    // note that since we have a very large distance to the far clipping plane
    // but we use a logarithmic depth buffer, so it works out.
    var farClip = metersFromMiles(2000)

    const mainCam = NodeMan.get("mainCamera").camera;
    mainCam.layers.enable(LAYER.podBack)

    const view = NodeMan.get("mainView");
    view.preRenderFunction = function () {

        const displayWindArrows = ViewMan.get("SAPage").buttonBoxed(16);  // wind button

        var windTrackLocal = NodeMan.get("localWind")
        var windTrackTarget = NodeMan.get("targetWind")
        var ufoTrack = NodeMan.get("LOSTraverseSelect")
        var jetTrack = NodeMan.get("jetTrack")

        const vScale = Sit.frames
        const windVelocityScaledLocal = windTrackLocal.v(par.frame).multiplyScalar(vScale)
        const windVelocityScaledTarget = windTrackTarget.v(par.frame).multiplyScalar(vScale)

        let jetPosition = ufoTrack.p(par.frame);
        let jetVelocityScaled = trackVelocity(ufoTrack, par.frame).multiplyScalar(vScale)
        let groundVelocityEnd = jetPosition.clone().add(jetVelocityScaled);
        let airVelocityEnd = groundVelocityEnd.clone().sub(windVelocityScaledTarget);
        DebugArrowAB("UFO Ground V", jetPosition, groundVelocityEnd, "#00ff00", displayWindArrows, GlobalScene) // green = ground speed
        DebugArrowAB("UFO Wind", airVelocityEnd, groundVelocityEnd, "#00ffff", displayWindArrows, GlobalScene) // cyan = wind speed
        DebugArrowAB("UFO Air V", jetPosition, airVelocityEnd, "#0000ff", displayWindArrows, GlobalScene) // blue = air speed

        jetPosition = jetTrack.p(par.frame);
        jetVelocityScaled = trackVelocity(jetTrack, par.frame).multiplyScalar(vScale)
        groundVelocityEnd = jetPosition.clone().add(jetVelocityScaled);
        airVelocityEnd = groundVelocityEnd.clone().sub(windVelocityScaledLocal);
        DebugArrowAB("JET Ground V", jetPosition, groundVelocityEnd, "#00ff00", displayWindArrows, GlobalScene) // green = ground speed
        DebugArrowAB("JET Wind", airVelocityEnd, groundVelocityEnd, "#00ffff", displayWindArrows, GlobalScene) // cyan = wind speed
        DebugArrowAB("JET Air V", jetPosition, airVelocityEnd, "#0000ff", displayWindArrows, GlobalScene) // blue = air speed
    }

    var farClipLook = metersFromMiles(500)

    // viw of the back of the pod with rotating glare on it.
    var podCamera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, farClipLook);
    podCamera.position.set(-20, LocalFrame.position.y + 20, -40)
    podCamera.lookAt(new Vector3(0, LocalFrame.position.y, 0));


    // wrap these other cameras in nodes
    var podCameraNode = new CNodeCamera({id:"podCamera", camera: podCamera})

// 0 - podhead
    const viewPod = new CNodeView3D({
        id: "podBackView",
        visible: false,
        top: 0.010319917440660475, left: 0.6583333333333333, width: 0.2, height: 0.3993808049535604,
        background: new Color().setRGB(0.0, 0.0, 0.0),
        up: [0, 1, 0],
        fov: 30,
        draggable: true,
        resizable: true,
        freeAspect: true,
        camera: podCameraNode,

        postRenderFunction: function() {
                if (PODBack) {
                    PODBack.visible = true;
                }
        }


    })

    viewPod.addOrbitControls(view.renderer);
    viewPod.controls.position = new Vector3(10, LocalFrame.position.y, 0);
    viewPod.controls.target = new Vector3(0, LocalFrame.position.y, 0);


//

    // Pod's eye - what the pod sees, physical angles, and then tweaked to look at target
    var podsEyeCamera = new PerspectiveCamera(20, window.innerWidth / window.innerHeight, 99, farClipLook);
    podsEyeCamera.lookAt(new Vector3(0, 0, -1));
    podsEyeCamera.layers.disable(LAYER.MAIN)
    podsEyeCamera.layers.disable(LAYER.HELPERS)
    podsEyeCamera.layers.enable(LAYER.podsEye)

    let podsEyeCameraNode = new CNodeCamera({id:"podsEyeCamera", camera: podsEyeCamera})

    new CNodeView3D({
        id: "podsEyeView",

        debug: true,
        visible: false,
        left: 0.28958, top: 0.52425, width: -1, height: 0.46749,
        background: new Color().setRGB(0.0, 0.0, 0.0),
        up: [0, 1, 0],
        fov: 1,
        draggable: true,
        resizable: true,
        camera: podsEyeCameraNode,
        preRenderFunction: function () {
            if (!Ball) return;
            // we want the camera to be based on the ball orientation
            // (i.e. what the pod head is looking at)
            // but be centered on the target
            // so we set the camera's up vector to match the ball
            // and then use lookAt to focus on the target
            // this keeps the same orientation as the ball
            this.camera.up = V3(Ball.matrixWorld.elements[4],
                Ball.matrixWorld.elements[5],
                Ball.matrixWorld.elements[6])
            this.camera.up.normalize()
            this.camera.lookAt(targetSphere.position)

            if (Sit.showGlare) {
                glareSprite.material.rotation = radians(par.glareStartAngle)
            }
        },

        postRenderFunction: function () {
            if (Sit.showGlare) {
                glareSprite.material.rotation = 0
            }
        }
    })

    const ui = new CNodeViewUI({id: "podseye", overlayView: ViewMan.list.podsEyeView.data});
    ui.addText("info", "Pods-Eye View", 50, 90, 6, "#FFFF00")

    // Pod's eye, same, but derotated so horizon is correct.
    const podsEyeDeroCamera = new PerspectiveCamera(20, window.innerWidth / window.innerHeight, 99, farClipLook);
    podsEyeDeroCamera.layers.disable(LAYER.MAIN)
    podsEyeDeroCamera.layers.disable(LAYER.HELPERS)

    podsEyeDeroCamera.layers.enable(LAYER.podsEye)
    podsEyeDeroCamera.lookAt(new Vector3(0, 0, -1));

    let podsEyeDeroCameraNode = new CNodeCamera({id:"podsEyeDeroCamera", camera: podsEyeDeroCamera})

    new CNodeView3D({
        id: "podsEyeViewDero",
        visible: false,
        left: 0.52656, top: 0.52425, width: -1, height: 0.46749,
        background: new Color().setRGB(0.0, 0.0, 0.0),
        up: [0, 1, 0],
        fov: 10,
        draggable: true,
        resizable: true,
        camera: podsEyeDeroCameraNode,
        preRenderFunction: function () {
            if (!Ball) return;
            if (this.camera.parent == null) {
                // PROBLEM, MAYBE - the ball has scale.

                Ball.add(this.camera)
            }

            if (Sit.showGlare) {
                glareSprite.scale.setScalar(0.04)
                glareSprite.material.rotation = radians(-par.podRollPhysical + par.glareStartAngle)
            }

            this.camera.up = V3(Ball.matrixWorld.elements[4],
                Ball.matrixWorld.elements[5],
                Ball.matrixWorld.elements[6])

            var worldTarget = V3(0, 0, 0)
            targetSphere.getWorldPosition(worldTarget)
            this.camera.lookAt(worldTarget)

            this.camera.rotateZ(radians(par.podRollPhysical))
        },

        postRenderFunction: function () {

            if (Sit.showGlare) {
                glareSprite.material.rotation = 0
            }
        },
    })


/////////////////////////////////////////////////////////////////
// ATRLIR pod CAM

    VG("lookView").preRenderFunction = function () {

        // PATCH for the jet sitches,
        // camera is a child of the ball, and will get the layer mask reset when the model loads
        // so we force it here.
        this.camera.layers.mask = LAYER.MASK_LOOKRENDER;

        if (!Ball) return;
        if (this.camera.parent == null) {
            // PROBLEM, MAYBE - the ball has scale.

            Ball.add(this.camera)
        }


        this.camera.up = V3(Ball.matrixWorld.elements[4],
            Ball.matrixWorld.elements[5],
            Ball.matrixWorld.elements[6])

        var worldTarget = V3(0, 0, 0)
        targetSphere.getWorldPosition(worldTarget)
        this.camera.lookAt(worldTarget)

        var deroNeeded = getDeroFromFrame(par.frame)

//                console.log(deroNeeded + " -> " + par.podRollPhysical)

        this.camera.rotateZ(radians(deroNeeded))
        if (Sit.showGlare) {
            glareSprite.scale.setScalar(0.0005)
            glareSprite.material.rotation = radians(-deroNeeded + par.glareStartAngle)
        }
    }

    VG("lookView").postRenderFunction = function () {
        if (Sit.showGlare) {
            glareSprite.material.rotation = 0
        }
    }


    VG("lookView").setVisible(par.showLookCam);


    console.table(ViewMan.list)
}

export function initJetStuffOverlays() {
    var ui = new CNodeATFLIRUI({
        id: "dero",
        jetAltitude: "jetAltitude",
        overlayView: ViewMan.list.podsEyeViewDero.data,
        defaultFontSize: 3.5,
        defaultFontColor: '#E0E0E0',
        defaultFont: 'sans-serif',
        syncVideoZoom: true,
    });
    ui.addText("info", "Derotated", 50, 90, 6, "#FFFF00")

    ui = new CNodeATFLIRUI({
        id: "ATFLIRUIOverlay",
        jetAltitude: "jetAltitude",

        overlayView: ViewMan.list.lookView.data,
        defaultFontSize: 3.5,
        defaultFontColor: '#E0E0E0',
        defaultFont: 'sans-serif',
        syncVideoZoom: true,
    });
    ui.addText("info", "NAR Cam", 50, 90, 6, "#FFFF00")
    ViewMan.get("ATFLIRUIOverlay").setVisible(par.showLookCam);
}