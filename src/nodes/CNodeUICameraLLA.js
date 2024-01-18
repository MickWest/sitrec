import {GlobalPTZ, NodeMan} from "../Globals";
import {CNode} from "./CNode";
import {LLAToEUS, LLAToEUSMAP, LLAToEUSMAPGlobe, RLLAToECEFV_Sphere, wgs84} from "../LLA-ECEF-ENU";
import {metersFromMiles, radians, assert, vdump, f2m} from "../utils";
import {Sit} from "../Globals";
import {DebugArrowAB} from "../threeExt";
import {GlobalScene} from "../LocalFrame";
import {CNodeController} from "./CNodeController";

export class CNodeControllerUICameraLLA extends CNodeController {
    constructor(v) {
        super(v);
   //     this.input("camera")
        this.input("fromLat",true)
        this.input("fromLon",true)
        this.input("fromAltFeet",true)
        this.input("toLat",true)
        this.input("toLon",true)
        this.input("toAlt",true)
//        this.input("camera")
        this.input("radiusMiles")
        this.update(0) // immediately move to first position
    }

    apply(f, cameraNode) {

        const camera = cameraNode.camera;

        var radius = metersFromMiles(this.in.radiusMiles.v0)
        assert(!Number.isNaN(radius),"Radius NaN")

        // The world isn't actually getting bigger.
        // it's just flattening, so we need to use map x,z coordinates, then adjust for drop

        // so originECEF needs to be wgs84
        Sit.originECEF = RLLAToECEFV_Sphere(radians(Sit.lat),radians(Sit.lon),0,wgs84.RADIUS)
        assert(!Number.isNaN(Sit.originECEF.x),"Sit.originECEF NaN")

        var from,to;

  //      console.log(Sit.lat+","+Sit.lon+" r= " + r)
        if (this.in.fromLat && !Sit.ignoreFromLat) {  // TODO - TEMP FLAG PATCH for PVS14
            from = LLAToEUSMAPGlobe(
                this.in.fromLat.v(f),
                this.in.fromLon.v(f),
                f2m(this.in.fromAltFeet.v(f)),
                radius
            )
            camera.position.copy(from)
            assert(!Number.isNaN(camera.position.x),"camera.position.x NaN")

        }
        if (this.in.toLat) {
            to = LLAToEUSMAP(this.in.toLat.v(f),
                this.in.toLon.v(f),
                this.in.toAlt.v(f),
                radius
            )
            camera.lookAt(to)
        }

    //    DebugArrowAB("Lookat", from,to, 0xff00ff,true,GlobalScene)

    }

    recalculate(f) {

        // patch refresh any ptz controls, as lat/lon have changed
        if (GlobalPTZ !== undefined) {
            GlobalPTZ.refresh();
        }

      //  this.update(f)
    }
}
