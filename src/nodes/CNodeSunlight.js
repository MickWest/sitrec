// CNodeSunlight.js - upates the global scene with the current sunlight
// based on the current date and time
import {CNode} from "./CNode";
import {GlobalDateTimeNode, Globals} from "../Globals";
import {V3} from "../threeUtils";
import {getCelestialDirection} from "../CelestialMath";
import {degrees} from "../utils";

// will exist as a singleton node: "theSun"
export class CNodeSunlight extends CNode {
    constructor(v) {
        super(v);

        this.sunIntensity = 3.0;
        this.ambientIntensity = 1.2;

        this.darkeningAngle = 8.0;
    }

    update(f) {
        if (Globals.sunLight) {
            //
            try {
                const date = GlobalDateTimeNode.dateNow;
                const dir = getCelestialDirection("Sun", date, V3(0, 0, 0));
                const sunPos = dir.clone().multiplyScalar(60000)
                Globals.sunLight.position.copy(sunPos)

                // find the angle above or below the horizon
                const angle = degrees(Math.asin(dir.y));

                let scale = brightnessOfSun(angle,this.darkeningAngle)

                // note, the intensity is in radians
                // so we multiply by PI (so 1.0 is full intensity)

                Globals.sunLight.intensity = this.sunIntensity * scale * Math.PI

                // scale the ambient over 10 to -10 degrees
                let scaleAmbient = brightnessOfSun(angle+this.darkeningAngle,this.darkeningAngle*2)

                let baseAmbient = 0.5; // fraction of ambient light that is always on
                scaleAmbient = baseAmbient + (1-baseAmbient) * scaleAmbient;

                if (this.ambientOnly) {
                    scaleAmbient = 1.0;
                }

                scaleAmbient *= Math.PI;

                Globals.ambientLight.intensity = this.ambientIntensity * scaleAmbient;

                // calculate the total light in the sky
                // just a ballpark for how visible the stars should be.
                Globals.sunTotal = Globals.sunLight.intensity + Globals.ambientLight.intensity;


            } catch (e) {
                console.error("Sunlight error", e)
                debugger;
            }
        }

    }

}

function brightnessOfSun(angle,dropRegion) {
    const maxBrightness = 1.0;  // Maximum brightness at zenith

    if (angle < 0) {
        return 0;  // Sun is below the horizon
    } else if (angle > 90) {
        return maxBrightness;  // Cap the brightness at zenith
    }

    if (angle > dropRegion) {
        return maxBrightness;
    } else {
        // Calculate the drop-off for angles below 10 degrees
        let theta = angle * (Math.PI / 180);
        let dropOffFactor = Math.cos(theta) * Math.pow((angle / dropRegion), 2);
        return maxBrightness * dropOffFactor;
    }
}


