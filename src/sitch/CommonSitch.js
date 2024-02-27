// Common snippets of data definitions for sitrecs

export const commonKMLTarget = {
    KMLTargetData: {kind: "KMLData", file: "KMLTarget",},
    targetTrack: {kind: "trackFromDataFile", file: "KMLTarget", dataID: "KMLTargetData",},
    displayKMLTarget: {kind: "DisplayTrack", track: "KMLTargetData", color: [1,0,0], width: 1,},
    displaySmoothedTarget: {kind: "DisplayTrack", track: "targetTrack", color: [1,0,0], width: 4,},
    targetSphereBig: {kind: "DisplayTargetSphere", track: "targetTrack", size: 1000, color: [1,0,0],},
}

export const commonKMLCamera = {
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

export const commonKMLTracks = {
    ...commonKMLTarget,
    ...commonKMLCamera,
//    displayLOS: {kind: "DisplayTrackToTrack"},
    //   targetObject: {file: "TargetObjectFile",},
    DisplayCameraFrustum: {targetTrack: "targetTrack"},
    ...commonLabels,
}

export const commonKMLTrackToTrack = {
    ...commonKMLTracks,
    lookAtTrack: {},  // and look at targetTrack
}
