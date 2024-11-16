import { initSitch } from "./sitrec/src/indexCommon.js"
import { NodeMan } from "./sitrec/src/Globals.js"

await initSitch("gofast", "SitGoFast.js")

function testLOS() {
    for(var i = 0; i < 1030; i+=400) {
        const LOSnode = NodeMan.get("LOSTraverseSelect")
        const LOS = LOSnode.getValueFrame(i).position.toArray()
        console.log('LOS at frame', i, ':', LOS)
    }
}
testLOS()