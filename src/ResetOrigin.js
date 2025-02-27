import {NodeMan, Sit} from "./Globals";
import {ECEFToLLAVD_Sphere, EUSToECEF} from "./LLA-ECEF-ENU";
import {V3} from "./threeUtils";
import {CNode} from "./nodes/CNode";


export function resetGlobalOrigin() {
    // The origin of the EUS coordinate system is initially set to near Los Angeles
    // if we move far from there, then the precision of the floating point numbers
    // will cause the origin to jitter, and we'll lose precision
    // so we can reset the origin to the current location

    const lookCamera = NodeMan.get("lookCamera").camera;
    const pos = lookCamera.position;

    // get the current EUS origin in ECEF
    const oldEUSOrigin = EUSToECEF(V3(0,0,0));


    const LLA = ECEFToLLAVD_Sphere(EUSToECEF(pos));
    console.log("Resetting Origin to " + LLA.x + ", " + LLA.y + ", " + LLA.z);
    Sit.lat = LLA.x;
    Sit.lon = LLA.y;

    // get the new EUS origin in ECEF
    const newEUSOrigin = EUSToECEF(V3(0,0,0));

    // get the difference between the old and new origins
    // "diff" is a value we can add to a position that will move them into
    // the new EUS coordinate system
    // it the value you SUBTRACT to change the coordinate system
    // we want a value we can add, so we negate it.
    const diff = newEUSOrigin.clone().sub(oldEUSOrigin).negate();


    // Now will we also need to adjust the matrix? YES for may things



    // iterate over all the nodes and adjust their positions

    // TODO - update all things that rely on local ESU coordinates
    // Cameras need position moving and transformation matrix updating
    // Sprites need position moving
    // CNodes need position moving - do they have a position?
    // Tracks might need recalculating from LLA to ESU
    // Display tracks similar.
    // Terrain might need recalculating from LLA to ESU
    // Prefer recalculation from LLA to ESU over transforming ESU->ECEF->(transfrom)->ESU coordinates
    // Other?
    //

    NodeMan.iterate((id, node) => {
        if (node instanceof CNode) {
            node.adjustOrigin(diff);
        }
    })

    NodeMan.recalculateAllRootFirst();

}