// CNodeSunlight.js - upates the global scene with the current sunlight
// based on the current date and time and the look camera
import {CNode} from "./CNode";
import {GlobalDateTimeNode, Globals, infoDiv, NodeMan} from "../Globals";
import {getCelestialDirection} from "../CelestialMath";
import {degrees} from "../utils";
import {getLocalUpVector, pointAltitude} from "../SphericalMath";
import {Color, Vector3} from "three";

// will exist as a singleton node: "theSun"
export class CNodeSunlight extends CNode {
    constructor(v) {
        super(v);

        this.sunIntensity = 3.0;
        this.ambientIntensity = 1.2;

        this.darkeningAngle = 10.0;
    }

    calculateSunAt(position, date) {
        if (date === undefined) {
            date = GlobalDateTimeNode.dateNow;
        }

        const result = {}

        const dir = getCelestialDirection("Sun", date, position);
        const sunPos = dir.clone().multiplyScalar(60000)
        result.sunPos = sunPos;

        // find the angle above or below the horizon
        const up = getLocalUpVector(position);

        const angle = 90-degrees(dir.angleTo(up));
        result.sunAngle = angle;

        let scale = brightnessOfSun(angle,this.darkeningAngle)

        // note, the intensity is in radians
        // so we multiply by PI (so 1.0 is full intensity)

        result.sunIntensity = this.sunIntensity * scale * Math.PI

        // scale the scattering ambient over 10 to -10 degrees
        let scaleScattering = this.sunScattering * brightnessOfSun(angle+this.darkeningAngle,this.darkeningAngle*2)

        if (this.ambientOnly) {
            result.ambientIntensity = (this.ambientIntensity) * Math.PI;
        } else {
            // ambient light is scattered light plus the fixed ambient light
            result.ambientIntensity = (this.sunIntensity * scaleScattering + this.ambientIntensity) * Math.PI;
        }
        //
        // infoDiv.innerHTML+= `<br><br>Sunlight: ${result.sunIntensity.toFixed(2)} Ambient: ${result.ambientIntensity.toFixed(2)}`
        // infoDiv.innerHTML+=`<br>Angle: ${angle.toFixed(2)}`
        // infoDiv.innerHTML+=`<br>Sun Scattering: ${this.sunScattering.toFixed(2)}`
        // infoDiv.innerHTML+=`<br>Scale: ${scale.toFixed(2)}`
        // infoDiv.innerHTML+=`<br>ScaleScattering: ${scaleScattering.toFixed(2)}`
        // infoDiv.innerHTML+=`<br>Darkening: ${this.darkeningAngle.toFixed(2)}`
        // infoDiv.innerHTML+=`<br>Position: ${position.x.toFixed(2)} ${position.y.toFixed(2)} ${position.z.toFixed(2)}`
        // infoDiv.innerHTML+=`<br>SunPos: ${sunPos.x.toFixed(2)} ${sunPos.y.toFixed(2)} ${sunPos.z.toFixed(2)}`
        // infoDiv.innerHTML+=`<br>Dir: ${dir.x.toFixed(2)} ${dir.y.toFixed(2)} ${dir.z.toFixed(2)}`
        // infoDiv.innerHTML+=`<br>Up: ${up.x.toFixed(2)} ${up.y.toFixed(2)} ${up.z.toFixed(2)}`
        //

        // calculate the total light in the sky
        // just a ballpark for how visible the stars should be.
        result.sunTotal = result.sunIntensity + result.ambientIntensity;


        return result;
    }


    calculateSkyBrightness(position, date) {
        if (!this.atmosphere) {
            return 0;
        }
        const sun = this.calculateSunAt(position, date)
        let sunTotal = sun.sunTotal / Math.PI;

        // attentuate by the square of the altitiude
        const alt = pointAltitude(position);
        const atten = Math.pow(0.5, alt/100000);
        sunTotal *= atten;
        return sunTotal;
    }

    calculateSkyColor(position, date) {

        const sunTotal = this.calculateSkyBrightness(position, date);

        const blue = new Vector3(0.53,0.81,0.92)
        blue.multiplyScalar(sunTotal)
        return new Color(blue.x, blue.y, blue.z)
    }

    // this is a simple function to calculate the opacity of the sky
    // i.e. how transparent the blu daylight sky should be to stars
    // most of the time it's 1.0 (daylight) or 0.0 (night)
    calculateSkyOpacity(position, date) {
        const skyBrightness = this.calculateSkyBrightness(position, date);
        const skyOpacity = Math.min(1.0, skyBrightness*2);
        return skyOpacity;
    }

    update(f) {
        if (Globals.sunLight) {
            //
            try {
                const date = GlobalDateTimeNode.dateNow;

                let camera;
                if (NodeMan.exists("lookCamera")) {
                    camera = NodeMan.get("lookCamera").camera;
                } else if (NodeMan.exists("mainCamera")) {
                    camera = NodeMan.get("mainCamera").camera;
                } else {
                    // some of the tool sitches have no camera, so we just return
//                    console.error("No camera found for sunlight")
                    return;
                }

                const sun = this.calculateSunAt(camera.position, date);

                Globals.sunLight.position.copy(sun.sunPos)
                Globals.sunAngle = sun.sunAngle;
                Globals.sunLight.intensity = sun.sunIntensity;
                Globals.ambientLight.intensity = sun.ambientIntensity;
                Globals.sunTotal = sun.sunTotal


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


