// Wrapper for Three.js Sky object

import {Sky} from "three/addons/objects/Sky.js";
import {MathUtils, Scene, Vector3} from "three";
import GUI from "../js/lil-gui.esm";
import {CNode3DGroup} from "./CNode3DGroup";
import {GlobalDateTimeNode, guiMenus} from "../Globals";
import {getCelestialDirection} from "../CelestialMath";
import {V3} from "../threeUtils";
import {degrees} from "../utils";
import {GlobalDaySkyScene, GlobalNightSkyScene, setupDaySkyScene, setupNightSkyScene} from "../LocalFrame";

export class CNodeDaySky extends CNode3DGroup {
    constructor(v) {
        super(v);

        if (GlobalDaySkyScene === undefined) {
            setupDaySkyScene(new Scene())
        }

        this.initSky(GlobalDaySkyScene)

    }

    // TODO
    // - re-implement the exposure parameter
    // - get stars visible at night (draw order)
    // - render sun and moon with correct position
    // - extract sun color from sky for sun light color
    // - combine with distance fog/haze


    update(f) {
        super.update(f);

        // get the sun dir
        const date = GlobalDateTimeNode.dateNow;
        const dir = getCelestialDirection("Sun", date, V3(0, 0, 0));
        this.effectController.elevation = degrees(Math.asin(dir.y));
        this.effectController.azimuth = degrees(Math.atan2(dir.x, dir.z));
        this.guiChanged();
    }


    initSky(scene, renderer) {

        // Add Sky
        this.sky = new Sky();
        this.sky.scale.setScalar(45000000);
        scene.add(this.sky);

        this.sun = new Vector3();

        /// GUI

        this.effectController = {
            turbidity: 10,
            rayleigh: 3,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.7,
            elevation: 2,
            azimuth: 180,
            // MICK - probably need a global "exposure" value
            exposure: 0.5, // renderer.toneMappingExposure
        };


        this.gui = guiMenus.lighting.addFolder("Daylight Sky");

        this.gui.add(this.effectController, 'turbidity', 0.0, 20.0, 0.1).onChange(()=>{this.guiChanged()});
        this.gui.add(this.effectController, 'rayleigh', 0.0, 4, 0.001).onChange(()=>{this.guiChanged()});
        this.gui.add(this.effectController, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(()=>{this.guiChanged()});
        this.gui.add(this.effectController, 'mieDirectionalG', 0.0, 1, 0.001).onChange(()=>{this.guiChanged()});
        this.gui.add(this.effectController, 'elevation', 0, 90, 0.1).onChange(()=>{this.guiChanged()}).listen();
        this.gui.add(this.effectController, 'azimuth', -180, 180, 0.1).onChange(()=>{this.guiChanged()}).listen();
        this.gui.add(this.effectController, 'exposure', 0, 1, 0.0001).listen();
        this.guiChanged();

    }

    guiChanged() {

        const uniforms = this.sky.material.uniforms;
        uniforms['turbidity'].value = this.effectController.turbidity;
        uniforms['rayleigh'].value = this.effectController.rayleigh;
        uniforms['mieCoefficient'].value = this.effectController.mieCoefficient;
        uniforms['mieDirectionalG'].value = this.effectController.mieDirectionalG;

        const phi = MathUtils.degToRad(90 - this.effectController.elevation);
        const theta = MathUtils.degToRad(this.effectController.azimuth);

        this.sun.setFromSphericalCoords(1, phi, theta);

        uniforms['sunPosition'].value.copy(this.sun);

        // MICK - probably need a global "exposure" value
        //   renderer.toneMappingExposure = effectController.exposure;

    }


}


