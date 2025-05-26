// A node that returns a EUS vector position based on LLA input
// Can be defined by a lat, lon, and alt
// or a LLA array of three values
// Note that the altitude is in meters in the LLA array
// and in feet in the GUI
//
// Now with optional wind to adjust the position over time
import {ECEFToLLAVD_Sphere, EUSToECEF, EUSToLLA, LLAToEUS} from "../LLA-ECEF-ENU";
import {CNode} from "./CNode";
import {V3} from "../threeUtils";
import {CNodeGUIValue} from "./CNodeGUIValue";
import {isKeyHeld} from "../KeyBoardHandler";
import {adjustHeightAboveGround, altitudeAtLL} from "../threeExt";
import {assert} from "../assert";
import {ViewMan} from "../CViewManager";
import {EventManager} from "../CEventManager";
import {Globals, guiMenus, NodeMan, Sit} from "../Globals";

export class CNodePositionLLA extends CNode {
    constructor(v) {
        super(v);

        this.input("wind", true)
        this.frames = Sit.frames;
        this.useSitFrames = true; // use sit frames for the LLA

        if (v.LLA !== undefined) {
            // copy the array in v.LLA to this._LLA
            this._LLA = v.LLA.slice()
            // if there's a gui specified, the add GUI inputs
            if (v.gui) {
                 const id = (v.desc ?? "Camera") + (v.key ? " ["+v.key+"]":"");
                const name = (v.desc ?? "Cam") + (v.key ? " ["+v.key+"]":"");
               this.guiLat = new CNodeGUIValue({
                   id: id + " Lat",
                   desc: name + " Lat",
                   value: this._LLA[0],
                   start: -90, end: 90, step: 0.01,
                   stepExplicit: false, // prevent snapping
                   onChange: (v) => {
                       // Get the text of the input to see if they pasted in Lat, Lon
                       // like 40.9096508,-74.0734146
                       // if so, then split it and set the values
                       const input = this.guiLat.guiEntry.$input.value;
                       // strip off any degrees symbols
                       const inputNoDeg = input.replace(/°/g, "");
                       let split = inputNoDeg.split(",");
                       if (split.length === 1) {
                           split = inputNoDeg.split(" ");
                       }

                       if (split.length === 2) {
                           const lat = parseFloat(split[0]);
                           const lon = parseFloat(split[1]);
                           if (!isNaN(lat) && !isNaN(lon)) {
                               this.guiLat.guiEntry.$input.value = lat;
                               this._LLA[0] = lat;
                               this._LLA[1] = lon;
                               this.guiLon.value = lon;
                               this.recalculateCascade(0)
                               return;
                           }
                       }
                       this._LLA[0] = parseFloat(v);
                       this.recalculateCascade(0)

                   }
               }, v.gui)

               this.guiLon = new CNodeGUIValue({
                   id: id + " Lon",
                   desc: name + " Lon",
                   value: this._LLA[1],
                   start: -180, end: 180, step: 0.01,
                   stepExplicit: false, // prevent snapping
                   onChange: (v) => {
                       this._LLA[1] = v;
                       this.recalculateCascade(0)
                   }
                }, v.gui)

               this.guiAlt = new CNodeGUIValue({
                   id: id + " Alt (ft)",  // including the (ft) for historical reasons, so we have the same id as older saves
                   desc: name + " Alt",
                   value: 0, // don't set the altitude, as we want to set it with units
                   unitType: "small",
                   start: 0, end: 100000, step: 1,
               //    stepExplicit: false, // prevent snapping

                   elastic: true,
                   elasticMin: 1,
                   elasticMax: 100000000,

                   onChange: (v) => {
                       this.recalculateCascade(0)
                     //  this.updateAltituide();

                   }
                }, v.gui)
                this.guiAlt.setValueWithUnits(this._LLA[2], "metric", "small")

                // //makr them both elastic
                //
                //
                //
                // ////////////////////////////////////////////////////////////////////
                // // NEW FUN AGL!!!
                // this.guiAGL = new CNodeGUIValue({
                //     id: id + " AGL",  // including the (ft) for historical reasons, so we have the same id as older saves
                //     desc: name + " AGL",
                //     value: 0, // don't set the altitude, as we want to set it with units
                //     unitType: "small",
                //     start: 0, end: 10000, step: 1,
                //     stepExplicit: false, // prevent snapping
                //     onChange: (v) => {
                //         this.recalculateCascade(0)
                //     }
                // }, v.gui)
                //
                //
                // this.guiAlt.setValueWithUnits(this._LLA[2], "metric", "small")
                // this.updateAltituide();

                this.lookupString = "";
               const gui = guiMenus[v.gui];
               gui.add(this, "lookupString").name("Lookup").onFinishChange(() => {
                    // given a string like "Sacramento, CA"
                    // fetch the lat, lon, alt from Nominatim
                    if (this.lookupString.length > 0) {
                        const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(this.lookupString);
                        fetch(url)
                            .then(response => response.json())
                            .then(data => {
                                if (data.length > 0) {
                                    const item = data[0];
                                    this.guiLat.value = parseFloat(item.lat);
                                    this.guiLon.value = parseFloat(item.lon);
                                    this._LLA[0] = this.guiLat.value;
                                    this._LLA[1] = this.guiLon.value;
                                    // set the altitude to 0
                                    this._LLA[2] = 0;
                                    this.guiAlt.setValueWithUnits(this._LLA[2], "metric", "small", true)
                                    this.recalculateCascade(0);

                                    // try to get the altitude from Open-Metro
                                    const altUrl = `https://api.open-meteo.com/v1/elevation?latitude=${this.guiLat.value}&longitude=${this.guiLon.value}`;
                                    fetch(altUrl)
                                        .then(response => response.json())
                                        .then(altData => {
                                            if (altData.elevation !== undefined) {
                                                // add 2m to the elevation, as we want to be above ground
                                                this._LLA[2] = altData.elevation[0] + 2; // add 2m to the elevation
                                                this.guiAlt.setValueWithUnits(this._LLA[2], "metric", "small", true);
                                                this.recalculateCascade(0);

                                            } else {
                                                console.warn("No elevation data found for " + this.lookupString);
                                            }
                                        })
                                        .catch(error => console.error("Error fetching elevation: ", error));


                                } else {
                                    alert("No results found for " + this.lookupString);
                                }
                            })
                            .catch(error => console.error("Error fetching location: ", error));
                    }
                });

               // Add a "Go To" button to the GUI
                gui.add(this, "goTo").name("Go To the above position")

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

//     updateAltituide() {
//         const altitude = altitudeAtLL(this._LLA[0], this._LLA[1]);
//
//         // so we need to atually calculate the AGL, based on the terrain
//         // also need to adjust it when terrain elevations
//
// //        this.guiAGL.setValueWithUnits(altitude, "metric", "small")
//
//     }

    goTo() {
        NodeMan.get("mainCamera").goToPoint(this.EUS,100000,100);
    }

    update() {
        if (this.key) {

            if (isKeyHeld(this.key.toLowerCase())) {

                // don't do any more drag-and-drop triggering of positions
                // after we move the target or the camera
                Globals.sitchEstablished = true;

                const mainView = ViewMan.get("mainView")
                const cursorPos = mainView.cursorSprite.position.clone();
                // convert to LLA
                const ecef = EUSToECEF(cursorPos)
                const LLA = ECEFToLLAVD_Sphere(ecef)

                // we set the values in the UI nodes
                this.guiLat.value = LLA.x
                this.guiLon.value = LLA.y
                this._LLA[0] = LLA.x
                this._LLA[1] = LLA.y

                // if the shift key is held, then set the altitude to the ground + 2m
                if (isKeyHeld('Shift')) {
                    // get the ground altitude, buy first getting the cursor position, adjusted for height
                    const groundPoint = adjustHeightAboveGround(cursorPos, 2);
                    // converts the ground point to LLA
                    const groundPointLLA = EUSToLLA(groundPoint);
                    // so the altitude is in the Z component
                    const groundAlt = groundPointLLA.z;
                    this.guiAlt.setValueWithUnits(groundAlt, "metric", "small", true)
                }
                this.recalculateCascade(0);
                EventManager.dispatchEvent("PositionLLA.onChange."+this.id)
                // we don't change the altitude, as we don't know it from the cursor
            }


        }
    }

    recalculate() {
        if (this._LLA !== undefined) {
            this.EUS = LLAToEUS(this._LLA[0], this._LLA[1], this.guiAlt.getValueFrame(0))
        }
    }

    // return vector3 EUS for the specified LLA (animateabel)
    getValueFrame(f) {
        if (this._LLA !== undefined) {
            assert(this.guiAlt !== undefined, "CNodePositionLLA: no guiAlt defined")
       //     return LLAToEUS(this._LLA[0], this._LLA[1], this.guiAlt.getValueFrame(f))
            let pos = this.EUS.clone();
            if (this.in.wind) {
                const wind = this.in.wind.v0.multiplyScalar(f);
                // add the wind to the position
                pos.add(wind);
            }

            return pos
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

    setXYZ(x,y,z) {
        this.XYZ = [x,y,z]
    }

    getValueFrame(f) {
        if (this.XYZ !== undefined) {
            return V3(this.XYZ[0], this.XYZ[1], this.XYZ[2])
        }
        const x = this.in.x.v(f)
        const y = this.in.y.v(f)
        const z = this.in.z.v(f)
        return V3(x, y, z)
    }


}


export function makePositionLLA(id, lat, lon, alt) {
    return new CNodePositionLLA({
        id: id,
        lat: lat, lon: lon, alt: alt
    })
}