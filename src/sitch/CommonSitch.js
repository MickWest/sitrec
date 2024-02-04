// Common snippets of data definitions for sitrecs

export const commonKMLTracks = {
    targetTrackKML: {kind: "trackFromDataFile", file: "KMLTarget", dataID: "KMLTargetData",},
    targetTrack: {kind: "SmoothedPositionTrack", source: "targetTrackKML", method: "catmull", intervals: 20, tension: 0.5 },
    displayKMLTarget: {kind: "DisplayTrack", track: "KMLTargetData", color: [1,0,0], width: 1,},
    displaySmoothedTarget: {kind: "DisplayTrack", track: "targetTrack", color: [1,0,0], width: 4,},
    displayLOS: {kind: "DisplayTrackToTrack"},

    //   targetObject: {file: "TargetObjectFile",},
    targetSphereBig: {kind: "DisplayTargetSphere", track: "targetTrack", size: 1000, color: [1,0,0],},
    cameraSphereBig: {kind: "DisplayTargetSphere", track: "cameraTrack", size: 1000, color: [1,1,0],},
}

export const commonKMLTrackToTrack = {
    ...commonKMLTracks,
    lookAtTrack: {},
}