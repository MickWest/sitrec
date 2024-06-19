import {CNode3DObject} from "./CNode3DObject";


export class CNode3DSphere extends CNode3DObject {
    constructor(v) {
        v.geometry = "sphere";
        v.radius = 0.5
        v.widthSegments = 20
        v.heightSegments = 20

        super(v);
    }


}


// legacy class using the new CNode3DSphere, and adding the functionality that was in CNode3DTarget
export class CNodeDisplayTargetSphere extends CNode3DSphere {
    constructor(v) {
        super(v);
        this.input("track");
    }

    update(f) {
        this.group.position.copy(this.in.track.p(f))
    }

}



