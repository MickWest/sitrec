import {SetupGUIFrames} from "../JetGUI";
import {CNodeView3D} from "../nodes/CNodeView3D";
import {Color} from "../../three.js/build/three.module";
import {addDefaultLights} from "../lighting";
import {Sit} from "../Globals";

export const SitDume = {
    name: "dume",
    menuName: "Pt Dume -> Mt Jacinto",


    azSlider:false,
    jetStuff:false,
    animated:false,

    fps: 29.97,
    frames: 7027,

    lookFOV: 10,
    // Pt Dume view

    // TODO - need better way of specifying tiles, maybe LOD
    terrain: {lat:  34.001856, lon:-118.806196, zoom:9, nTiles:8},

    fromLat: 34.001241, // point dume
    fromLon:-118.806459,

    fromAlt: 140,
    fromAltMin: 0,
    fromAltMax: 1000,

//    fromAlt: new CNodeGUIValue({id:"cameraAlt", value: 500, start:0, end:50000, step:1, desc:"Camera Altitude"},gui),
    toLat: 33.814029,
    toLon: -116.679419,
    toAlt: 3302.2,

    flattening: true,

    // A-10 Bird
    //terrain: {  lat:  31.556097, lon: -109.275521, zoom: 15, nTiles:6 },

    startCameraPosition: [-43094.29665986946,3824.242926331847,422.4154566350642],
    startCameraTarget: [-42114.354308866445,3638.0780342768676,351.31256163886894],


    setup2: function() {
        SetupGUIFrames()



        const view = new CNodeView3D({
            id: "mainView",
            left: 0.0, top: 0, width: 0.5, height: 1,
            fov: 50,
            doubleClickFullScreen: true,
            background: new Color().setRGB(0.53, 0.81, 0.92),
            camera: this.mainCamera,

        })
        view.addOrbitControls(this.renderer);

        const viewLook = new CNodeView3D({
            id: "lookView",
            //     draggable:true,resizable:true,
            left: 0.5, top: 0, width: 0.5, height: 1,
            fov: 50,
            camera: this.lookCamera,
            doubleClickFullScreen: true,
            background: new Color().setRGB(0.53, 0.81, 0.92),
        })
        //     viewLook.camera = this.lookCamera;
        viewLook.addOrbitControls(this.renderer);


        addDefaultLights(Sit.brightness)

    },

}
