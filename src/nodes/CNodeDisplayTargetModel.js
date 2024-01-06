// fiddly temporary class to handle the jet target
import {GLTFLoader} from "../../three.js/examples/jsm/loaders/GLTFLoader";
import {CNode3DTarget} from "./CNode3DTarget";
import {gui} from "../Globals";
import {V3} from "../threeExt";

import {Matrix4} from "../../three.js/build/three.module";

import {trackAcceleration, trackVelocity} from "./CNode";
import {FileManager} from "../CFileManager";


// By default it will create a model from the file tagged "TargetObjectFile"
// or you can passa "TargetObjectFile" member in the input structure (v, here)
export class CNodeDisplayTargetModel extends CNode3DTarget {
    constructor(v) {
        super(v);

        this.input("track")
        this.optionalInputs(["wind", "airTrack"])

        this.tiltType = v.tiltType ?? "velocity"

        const data = FileManager.get(v.TargetObjectFile ?? "TargetObjectFile")

        const loader = new GLTFLoader()
          loader.parse(data, "", (gltf2) => {
            this.model = gltf2.scene //.getObjectByName('FA-18F')
            this.model.scale.setScalar(1);
            this.model.visible = true
            this.group.add(this.model)
        })


        // This ia specific to the flying saucer
        if (this.tiltType !== "velocity") {
            gui.add(this,"tiltType",{
                axialPush:"axialPush",
                axialPull:"axialPull",
                frontPointing:"frontPointing",
                frontPointingAir:"frontPointingAir",
                bottomPointing:"bottomPointing",
                bottomPointingAir:"bottomPointingAir",
            }).name("saucer tilt type")
                .listen(()=>{par.renderOne = true})
        }

    }

    update(f) {
        super.update(f)
        if (this.model != undefined) {
            if (f >= 0) {

                var next = this.in.track.p(f + 1)

                // if we have a wind vector then subtract that to get the nose heading
                if (this.in.wind !== undefined) {
                    next.sub(this.in.wind.v(f))
                }

                this.model.lookAt(next)

                var pos = this.in.track.p(f);
                var next = this.in.track.p(f + 1)

                switch (this.tiltType.toLowerCase()) {
                    case "velocity":

                        break;
                    case "axialpush":
                    case "axialpull":
                        // In Lazarian thrust, the vertical axis is aligned in the net force vector,
                        // including gravity.
                        // so a saucer tilts in the direction it is going in
                        // like a helicopter

                        if (f > this.frames - 4)
                            f = this.frames - 4;

                       // this.model.quaternion.identity()
                        this.model.updateMatrix()
                        this.model.updateMatrixWorld()

                        var accelerationDir = trackAcceleration(this.in.track, f)

                        if (this.tiltType === "axialPull")
                            accelerationDir.negate()

                        const gravity = V3(0, -9.81 / this.fps / this.fps, 0) // 9.81 is per sercond, so divide by fps^2 to get per frame
                        accelerationDir.sub(gravity) // add in a force opposite gravity
                        this.pointBottomAt(pos, pos.clone().add(accelerationDir))


                        break;
                    case "bottompointing":
                        this.pointBottomAt(pos, next)
                        break;

                    case "bottompointingair":
                        var from = this.in.airTrack.p(f)
                        var to = this.in.airTrack.p(f + 1)
                        var fwdAir = to.sub(from);
                        next = pos.clone().add(fwdAir)
                        this.pointBottomAt(pos, next)
                        break;

                    case "frontpointing":
                        this.model.lookAt(next)
                        this.model.updateMatrix()
                        this.model.updateMatrixWorld()
                        break;

                    case "frontpointingair":

                        var from = this.in.airTrack.p(f)
                        var to = this.in.airTrack.p(f + 1)
                        var fwdAir = to.sub(from);
                        next = pos.clone().add(fwdAir)


                        this.model.lookAt(next)
                        this.model.updateMatrix()
                        this.model.updateMatrixWorld()
                        break;

                }

            }
        }
        this.recalculate() // every frame so scale is correct after the jet loads

    }


    pointBottomAt(pos, next)
    {

        // we just use the point at function, and then change axis order to y,z,x
        this.model.lookAt(next)
        this.model.updateMatrix()
        this.model.updateMatrixWorld()

        // debug only
        var direction = next.clone().sub(pos)
        direction.normalize()
        direction.multiplyScalar(300)
  //      DebugArrow("pointing", direction, pos.clone(), 300, "#ff00ff")


        var _x = V3()
        var _y = V3()
        var _z = V3()
        this.model.matrix.extractBasis(_x, _y, _z)
        _x.normalize()
        _y.normalize()
        _z.normalize()
   //     DebugArrow("saucer X", _x, pos.clone(), 300, "#ff0000")
   //     DebugArrow("saucer Y", _y, pos.clone(), 300, "#00FF00")
   //    DebugArrow("saucer Z", _z, pos.clone(), 300, "#0000FF")


        var m = new Matrix4()
//      m.makeBasis(_x, _y, _z)
        m.makeBasis(_y, _z, _x)    // z goes into the y slot


        this.model.quaternion.setFromRotationMatrix(m);

        // the local matrix is composed from position, quaternion, and scale.
        // the world matrix is the parent's world matrix multipled by this local matrix

        // not sure if this finalization is needed.
        this.model.updateMatrix()
        this.model.updateMatrixWorld()
    }


    recalculate() {
        super.recalculate()
        this.propagateLayerMask()

    }

}

