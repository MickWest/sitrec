import {Globals, guiMenus, NodeMan, Sit} from "../Globals";
import {AmbientLight, DirectionalLight} from "three";
import {GlobalScene} from "../LocalFrame";
import {CNode} from "./CNode";
import {assert} from "../assert";

export class CNodeLighting extends CNode {
    constructor(v) {
        super(v);

        this.ambientIntensity = v.ambientIntensity ?? 0.8;
        this.sunIntensity = v.sunIntensity ?? 3.0;
        this.ambientOnly = v.ambientOnly ?? false;

        this.gui = guiMenus.lighting;

        this.addGUIValue("ambientIntensity", 0, 2, 0.01, "Ambient Intensity");
        this.addGUIValue("sunIntensity", 0, 2, 0.01, "Sun Intensity");
        this.addGUIBoolean("ambientOnly", "Ambient Only");


        Globals.ambientLight = new AmbientLight(0xFFFFFF, Sit.ambientLight);
        GlobalScene.add(Globals.ambientLight);

        // then sunlight is direct light
        Globals.sunLight = new DirectionalLight(0xFFFFFF, 3);
        Globals.sunLight.position.set(5,0,0);  // sun is along the X axis
        GlobalScene.add(Globals.sunLight);

        this.recalculate();

    }


    // for serialization, we don't need to do anything with the variables that were added with addGUIValue (hence addSimpleSerial)
    modSerialize() {
        return {...super.modSerialize()}
    }

    modDeserialize(v) {
        super.modDeserialize(v);
        this.recalculate();
    }


    recalculate() {
        let sunIntensity = this.sunIntensity;
        if (this.ambientOnly)   {
            sunIntensity = 0;
        }

        // if there's a sunlight node, then that's managing the lights
        // so we pass the values to it
        if (NodeMan.exists("theSun")) {
            const sunNode = NodeMan.get("theSun");
            sunNode.ambientIntensity = this.ambientIntensity;
            sunNode.sunIntensity = sunIntensity;
            sunNode.ambientOnly = this.ambientOnly;

        } else {
            // otherwise we manage the lights directly
            Globals.ambientLight.intensity = this.ambientIntensity;
            Globals.sunLight.intensity = sunIntensity;
        }
    }

}