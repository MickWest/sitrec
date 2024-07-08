// CNodeSunlight.js - upates the global scene with the current sunlight
// based on the current date and time and the look camera
import {CNode} from "./CNode";
import {GlobalDateTimeNode, Globals, NodeMan} from "../Globals";
import {V3} from "../threeUtils";
import {getCelestialDirection} from "../CelestialMath";
import {degrees} from "../utils";
import {getLocalUpVector} from "../SphericalMath";

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

                const lookCamera = NodeMan.get("lookCamera").camera;

                const dir = getCelestialDirection("Sun", date, lookCamera.position);
                const sunPos = dir.clone().multiplyScalar(60000)
                Globals.sunLight.position.copy(sunPos)

                // find the angle above or below the horizon
                const up = getLocalUpVector(lookCamera.position);
                const angle = 90-degrees(dir.angleTo(up));
                Globals.sunAngle = angle;

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

// a simple model of the brightness of the sun
// as a function of the angle above the horizon
// and the angle at which the sun starts to drop off
// the drop region is the angle at which the sun starts to drop off
// the brightness is 1.0 at zenith, and 0.25 at the horizon
// the drop off is a cosine squared function
// whene the sun goes below the horizon, the brightness drops to 0 over 0.5 degrees (angular diameter of the sun)
// This is not perfect as it does not take into account atmospheric refraction or topology

function brightnessOfSun(angle,dropRegion) {
    const maxBrightness = 1.0;  // Maximum brightness at zenith
    const minBrightness = 0.25;  // Minimum brightness at horizon

    if (angle < 0) {
        if (angle < -0.5) {
            return 0;  // Sun is below the horizon, shadow over 0.5 degrees
        } else {
            return minBrightness * (0.5+angle)/0.5;  // Sun is below the horizon, shadow over 0.5 degrees
        }
    } else if (angle > 90) {
        return maxBrightness;  // Cap the brightness at zenith
    }

    if (angle > dropRegion) {
        return maxBrightness;
    } else {
        // Calculate the drop-off for angles below 10 degrees
        let theta = angle * (Math.PI / 180);
        let dropOffFactor = Math.cos(theta) * Math.pow((angle / dropRegion), 2);
        return minBrightness + (maxBrightness - minBrightness) * dropOffFactor;
    }
}


