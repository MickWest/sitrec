// Common snippets of data definitions for sitrecs

export const commonKMLTarget = {
    KMLTargetData: {kind: "KMLData", file: "KMLTarget",},
    targetTrack: {kind: "trackFromDataFile", file: "KMLTarget", dataID: "KMLTargetData",},
    displayKMLTarget: {kind: "DisplayTrack", track: "KMLTargetData", color: [1,0,0], width: 1,},
    displaySmoothedTarget: {kind: "DisplayTrack", track: "targetTrack", color: [1,0,0], width: 4,},
    targetSphereBig: {kind: "DisplayTargetSphere", track: "targetTrack", size: 1000, color: [1,0,0],},
}

export const commonKMLTracks = {
    ...commonKMLTarget,
    displayLOS: {kind: "DisplayTrackToTrack"},
    //   targetObject: {file: "TargetObjectFile",},
    cameraSphereBig: {kind: "DisplayTargetSphere", track: "cameraTrack", size: 1000, color: [1,1,0],},
}

export const commonKMLTrackToTrack = {
    ...commonKMLTracks,
    lookAtTrack: {},
}

