import { initSitch } from "./sitrec/src/indexCommon.js"

import {
    get_real_horizon_angle_for_frame,
    Frame2Az, Frame2El, jetPitchFromFrame, jetRollFromFrame
} from "./sitrec/src/JetStuff.js"

import { NodeMan } from "./sitrec/src/Globals.js"

await initSitch('gimbal', 'SitGimbal.js')

function testHorizon() {
    var frame = 435
    var horizon_1 = get_real_horizon_angle_for_frame(frame)
    console.log('horizon_1 = ' + horizon_1)

    console.log("(pitch,roll,az,el) = (" + jetPitchFromFrame(frame) + ", " + jetRollFromFrame(frame) 
                + ", " + Frame2Az(frame) + ", " + Frame2El(frame) + ")")

    if(horizon_1 !== -28.43948837191162)
        throw new Error("the horizon was calculated incorrectly")
}
testHorizon()

function testCloudSpeed() {
    const cs_node = NodeMan.get("cloudSpeedEditor")
    console.log("cloud speed profile: ", cs_node.modSerialize())
    console.log("cloud speed for frame:")
    for(var i = 0; i <= 1000; i+=250) {
        const cs = cs_node.getValueFrame(i)
        console.log(i, ":", cs)
    }
}
testCloudSpeed()

function testAirTrack() {
    const airTrack_node = NodeMan.get("airTrack")
    console.log("air track position for frame:")
    for(var i = 0; i <= 1000; i+=250) {
        const p = airTrack_node.getValueFrame(i).position.toArray()
        console.log(i, ":", p)
    }
}
testAirTrack()