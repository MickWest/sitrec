// A node that returns a EUS vector position based on LLA input
// Can be defined by a lat, lon, and alt
// or a LLA array of three values
import {ECEFToLLAVD_Sphere, EUSToECEF, EUSToLLA, LLAToEUS} from "../LLA-ECEF-ENU";
import {CNode} from "./CNode";
import {V3} from "../threeUtils";
import {CNodeGUIValue} from "./CNodeGUIValue";
import {f2m, m2f} from "../utils";
import {isKeyHeld} from "../KeyBoardHandler";
import {ViewMan} from "./CNodeView";
import {NodeMan} from "../Globals";
import {adjustHeightAboveGround} from "../threeExt";

export class CNodePositionLLA extends CNode {
    constructor(v) {
        super(v);

        if (v.LLA !== undefined) {
            // copy the array in v.LLA to this.LLA
            this.LLA = v.LLA.slice()
            // if there's a gui specified, the add GUI inputs
            if (v.gui) {
               const name = (v.desc ?? "Camera") + (v.key ? " ["+v.key+"]":"");
               this.guiLat = new CNodeGUIValue({
                   id: name + " Lat",
                   desc: name + " Lat",
                   value: this.LLA[0],
                   start: -90, end: 90, step: 0.01,
                   stepExplicit: false, // prevent snapping
                   onChange: (v) => {
                       // Get the text of the input to see if they pasted in Lat, Lon
                       // like 40.9096508,-74.0734146
                       // if so, then split it and set the values
                       const input = this.guiLat.guiEntry.$input.value;
                       const split = input.split(",");
                       if (split.length === 2) {
                           const lat = parseFloat(split[0]);
                           const lon = parseFloat(split[1]);
                           if (!isNaN(lat) && !isNaN(lon)) {
                               this.guiLat.guiEntry.$input.value = lat;
                               this.LLA[0] = lat;
                               this.LLA[1] = lon;
                               this.guiLon.value = lon;
                               this.recalculateCascade(0)
                               return;
                           }
                       }
                       this.LLA[0] = v;
                       this.recalculateCascade(0)
                   }
               }, v.gui)

               this.guiLon = new CNodeGUIValue({
                   id: name + " Lon",
                   desc: name + " Lon",
                   value: this.LLA[1],
                   start: -180, end: 180, step: 0.01,
                   stepExplicit: false, // prevent snapping
                   onChange: (v) => {
                       this.LLA[1] = v;
                       this.recalculateCascade(0)
                   }
                }, v.gui)

               this.guiAlt = new CNodeGUIValue({
                   id: name + " Alt (ft)",
                   desc: name + " Alt (ft)",
                   value: m2f(this.LLA[2]),
                   start: 0, end: 100000, step: 1,
                   stepExplicit: false, // prevent snapping
                   onChange: (v) => {
                       this.LLA[2] = f2m(v);
                       this.recalculateCascade(0)
                   }
                }, v.gui)

            }

            this.key = v.key;

        } else {
            // more customizable, so you can add your own sources or controls
            this.input("lat")
            this.input("lon")
            this.input("alt")
        }
        this.recalculate()
    }

    update() {
        if (this.key) {

            if (isKeyHeld(this.key.toLowerCase())) {
                const mainView = ViewMan.get("mainView")
                const cursorPos = mainView.cursorSprite.position.clone();
                // convert to LLA
                const ecef = EUSToECEF(cursorPos)
                const LLA = ECEFToLLAVD_Sphere(ecef)

                // we set the values in the UI nodes
                this.guiLat.value = LLA.x
                this.guiLon.value = LLA.y
                this.LLA[0] = LLA.x
                this.LLA[1] = LLA.y

                // if the shift key is held, then set the altitude to the ground + 2m
                if (isKeyHeld('Shift')) {
                    // get the ground altitude, buy first getting the cursor position, adjusted for height
                    const groundPoint = adjustHeightAboveGround(cursorPos, 2);
                    // converts the ground point to LLA
                    const groundPointLLA = EUSToLLA(groundPoint);
                    // so the altitude is in the Z component
                    const groundAlt = groundPointLLA.z;
                    this.guiAlt.value = groundAlt
                    this.LLA[2] = groundAlt
                }




                this.recalculateCascade(0);
                // we don't change the altitude, as we don't know it from the cursor
            }


        }
    }

    recalculate() {
    }

    // return vector3 EUS for the specified LLA (animateabel)
    getValueFrame(f) {
        if (this.LLA !== undefined) {
            return LLAToEUS(this.LLA[0], this.LLA[1], this.LLA[2])
        }
        const lat = this.in.lat.v(f)
        const lon = this.in.lon.v(f)
        const alt = this.in.alt.v(f)
        return LLAToEUS(lat, lon, alt)
    }


}

// an XYZ position node that can be defined by x, y, and z
// or a XYZ array of three values
// in the EUS space
// mostly for debugging
export class CNodePositionXYZ extends CNode {
    constructor(v) {
        super(v);

        if (v.XYZ !== undefined) {
            // copy the array in v.LLA to this.LLA
            this.XYZ = v.XYZ.slice()
        } else {

            this.input("x")
            this.input("y")
            this.input("z")
        }
        this.recalculate()
    }

    recalculate() {
    }

    getValueFrame(f) {
        if (this.XYZ !== undefined) {
            return V3(this.XYZ[0], this.XYZ[1], this.XYZ[2])
        }
        const x = this.in.lat.x(f)
        const y = this.in.lon.y(f)
        const z = this.in.alt.z(f)
        return V3(x, y, z)
    }


}


export function makePositionLLA(id, lat, lon, alt) {
    return new CNodePositionLLA({
        id: id,
        lat: lat, lon: lon, alt: alt
    })
}