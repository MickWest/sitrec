import { initSitch } from "./sitrec/src/indexCommon.js"

import {
  get_real_horizon_angle_for_frame,
  Frame2Az, Frame2El, jetPitchFromFrame, jetRollFromFrame
} from "./sitrec/src/JetStuff.js"

await initSitch('gimbal', 'SitGimbal.js')
var frame = 435
var horizon_1 = get_real_horizon_angle_for_frame(frame)
console.log('horizon_1 = ' + horizon_1)

console.log("(pitch,roll,az,el) = (" + jetPitchFromFrame(frame) + ", " + jetRollFromFrame(frame) 
            + ", " + Frame2Az(frame) + ", " + Frame2El(frame) + ")")

if(horizon_1 !== -28.43948837191162)
  throw new Error("the horizon was calculated incorrectly")