// Common snippets of data definitions for sitrecs


/*
 Nodes can be converted by using this regular expression / replacement

new\s+CNode(\w+)\(\s*\{\s*id:\s*"(\w+)",\s*((.|\s)+?)\}\s*\)

$2: { kind: "$1",\n$3},

 */

export const commonTargetTrack = {
    targetTrack: {kind: "trackFromDataFile", file: "TargetTrack", dataID: "TargetTrackData",},
    displayTargetTrack: {kind: "DisplayTrack", track: "TargetTrackData", color: [1,0,0], width: 1,},
    displaySmoothedTarget: {kind: "DisplayTrack", track: "targetTrack", color: [1,0,0], width: 4,},
    targetSphereBig: {kind: "DisplayTargetSphere", track: "targetTrack", size: 1000, color: [1,0,0],},
}

export const commonTrackedCamera = {
    cameraTrack: {},
    followTrack: {},
    cameraSphereBig: {kind: "DisplayTargetSphere", track: "cameraTrack", size: 1000, color: [1,1,0],},
}


export const commonLabels = {
    cameraLabel:        { kind: "Label3D", text: "Camera", position: "lookCamera" , defer: true},
    targetLabel:        { kind: "Label3D", text: "Target", position: "targetTrack" , defer: true},
    altitudeLabel:      { kind: "MeasureAltitude",position: "lookCamera" , defer: true },
    targetAltitudeLabel:{ kind: "MeasureAltitude",position: "targetTrack" , defer: true},
    distanceLabel:      { kind: "MeasureAB",A: "lookCamera", B: "targetTrack" , defer: true},
}

export const commonJetLabels = {
    altitudeLabel1:      { kind: "MeasureAltitude",position: "jetTrack" , defer: true},
    altitudeLabel2:      { kind: "MeasureAltitude",position: "LOSTraverseSelect", defer: true },
    distanceLabel:      { kind: "MeasureAB",A: "jetTrack", B: "LOSTraverseSelect", defer: true},
}

export const commonTrackAndCameraLabeled = {
    ...commonTargetTrack,
    ...commonTrackedCamera,
//    displayLOS: {kind: "DisplayTrackToTrack"},
    //   targetObject: {file: "TargetObjectFile",},
    DisplayCameraFrustum: {targetTrack: "targetTrack"},
    ...commonLabels,
}

export const commonTrackToTrack = {
    ...commonTrackAndCameraLabeled,
    lookAtTrack: {},  // and look at targetTrack
}

export const commonCompasses = {
    compassMain: {kind: "CompassUI", camera: "mainCamera", relativeTo: "mainView", left: 0.0, top: 0.90, width: -1, height: 0.1},
    compassLook: {kind: "CompassUI", camera: "lookCamera", relativeTo: "lookView", left: 0.0, top: 0.85, width: -1, height: 0.15},

}

export const commonMoveAlongTrack = {
    moveTargetAlongPath: {kind: "TrackPosition", object: "targetObject", sourceTrack: "targetTrack"},
    orientTarget: {kind: "ObjectTilt", object: "targetObject", track: "targetTrack", tiltType: "frontPointing"},
}

// // common traverse nodes and UI
// export const commonTraverse = {
//
//     // A GUI variable for the start distance - this is one of the biggest variables
//     // It's the distance of the start of the traverse along the first LOS
//     //var nodeStartDistance =
//     "startDistance": { kind: "GUIValue",
//         value: Sit.startDistance,
//         start: Sit.startDistanceMin,
//         end: Sit.startDistanceMax,
//         step: 0.01,
//         desc: "Tgt Start Dist " + Units.bigUnitsAbbrev
//     },
//
//
//     LOSTraverse1: { kind: "LOSTraverse",
//         LOS: "JetLOS",
//         startDist: "startDistance",
//         VcMPH: new CNodeGUIValue({value: 20, start: -500, end: 500, step: 0.01, desc: "Target Vc MPH"}, gui),
//     },
//
//
//     speedUnscaled: {kind:"GUIValue",
//         value: Sit.targetSpeed,
//         start: Sit.targetSpeedMin,
//         end: Sit.targetSpeedMax,
//         step: Sit.targetSpeedStep,
//         desc: "Target Speed " + Units.speedUnits
//     },
//
//     // GUI variable Target Speed in Knots (scaled to m/s)
// //    speedScaled: CNodeScale("speedScaled", 1 / Units.m2Speed,
//     speedScaled: {kind: "Scale", scale: 1 / Units.m2Speed,},
//
//
//     // Traverse at constant GROUND speed (using the above)
//     LOSTraverseConstantSpeed: { kind: "LOSTraverseConstantSpeed",
//         inputs: {
//             LOS: "JetLOS",
//             startDist: "startDistance",
//             speed: "speedScaled",
//             wind: "targetWind"
//         },
//         airSpeed:false,
//     },
//
//     // Traverse at constant AIR speed
//     LOSTraverseConstantAirSpeed: { kind: "LOSTraverseConstantSpeed",
//         inputs: {
//             LOS: "JetLOS",
//             startDist: "startDistance",
//             speed: "speedScaled",
//             wind: "targetWind"
//         },
//         airSpeed:true,
//     },
//
//     // as above, but interpolate between the start and end frames
//     // remaining constant speed, but not necessarily on the LOS
//     LOSTraverseStraightConstantAir: { kind: "InterpolateTwoFramesTrack",
//         source: "LOSTraverseConstantAirSpeed"
//     },
//
//
//     // In any Sitch we have an initialHeading and a relativeHeading
//     // initialHeading is historically the start direction of the jet, like in Gimbal
//     // it's the direction we set the jet going in
//     //
//     // relativeHeading is added to initialHeading to get targetActualHeading
//     //
//     // for Gimbal and similar this allowed us to rotate the jet's path with initialHeading
//     // and then adjust (rotate) the targetActualHeading realtive to that.
//     // For Aguadilla though, the initialheading is a fixed 0, sicne the path is fixed
//     // meaning that relativeHeading is actually absolut (i.e. relative to 0)
//     // i.e. we have a single number defining targetActualHeading
//
//     targetRelativeHeading: {
//         kind: "GUIValue",
//         value: Sit.relativeHeading,
//         start: -180,
//         end: 180,
//         step: 0.01,
//         desc: "Tgt Relative Heading"
//     },
//
//     targetActualHeading: {
//         kind: "Munge",
//         inputs: {initialHeading: "initialHeading", relativeHeading: "targetRelativeHeading"},
//         munge: function (f) {
//             var newHeading = this.in.initialHeading.getHeading() + this.in.relativeHeading.v0
//             if (newHeading < 0) newHeading += 360;
//             if (newHeading >= 360) newHeading -= 360
//             return newHeading
//         }
//     },
//
//     // and with that target heading we can try for a stright line traversal
//     // currently very simplistic and does not work with noisy data.
//     LOSTraverseStraightLine: {
//         kind:"LOSTraverseStraightLine",
//         id: "LOSTraverseStraightLine",
//         LOS: "JetLOS",
//         startDist: "startDistance",
//         radius: "radiusMiles",
//         lineHeading: "targetActualHeading",
//     },
//
//     LOSTraverseStraightLineFixed: {
//         kind: "LOSTraverseStraightLineFixed",
//         LOS: "JetLOS",  // we just need the first LOS
//         startDist: "startDistance",
//         radius: "radiusMiles",
//         lineHeading: "targetActualHeading",
//         speed: "speedScaled",
//     },
//
//
//     // Constant altitude
//
//     LOSTraverseConstantAltitude: { kind: "LOSTraverseConstantAltitude",
//         inputs: {
//             LOS: "JetLOS",
//             startDist: "startDistance",
//             radius: "radiusMiles",
//         },
//     },
//
// }
