// a simple container for a sprites
import {radians} from "../utils";
import {BufferAttribute, BufferGeometry, Color, Frustum, Matrix4, Points, Ray, Sphere, Vector3} from "three";
import {NodeMan, Sit} from "../Globals";
import {CNodeSpriteGroup} from "./CNodeSpriteGroup";
import {assert} from "../assert";
import {DebugArrow} from "../threeExt";

class CFlowOrb {
    constructor(v) {
        this.position = v.position ?? new Vector3();
        this.lifeTime = v.lifeTime ?? 1000;
        this.startDistance = v.startDistance ?? 1000;
        this.awayDistance = 0;


        const colorHex = Math.random() * 0x808080 + 0x808080;
        this.color = new Color(colorHex);


    }

    reset(lookVector, camera, inside = false, index) {


        // given a lookVector and a camera, set the position of the sprite
        // to be  given distance from the lookVector
        // and then the corner of the frustum, roated by a random angle (0..2PI)
        // but OUTSIDE the frustum of the camera
        const centerPos = camera.position.clone().add(lookVector.clone().multiplyScalar(this.startDistance));
        const frustumHeight = Math.tan(radians(camera.fov) / 2) * this.startDistance;
        const frustumWidth = frustumHeight * camera.aspect;
        const angle = Math.random() * Math.PI * 2;
//        const up = camera.up;
        // right is the cross product of up and lookVector
//        const right = up.clone().cross(lookVector);

        var right = new Vector3()
        var up = new Vector3()
        var zAxis = new Vector3()
        camera.matrix.extractBasis(right, up, zAxis)


        // get newpos as the offset from the center line
        // (i.e. not yet a point)
        const newPos = up.clone().multiplyScalar(frustumHeight).add(right.clone().multiplyScalar(frustumWidth));
//        const newPos = right.clone().multiplyScalar(frustumWidth) //.add(right.clone().multiplyScalar(frustumWidth));

        if (inside) {
            // random position inside and outside the frustum
            newPos.multiplyScalar(2 * Math.random());
        } else {
            // random position outside the frustum (but close)
            newPos.multiplyScalar(1 + Math.random());
        }

        // rotate newPos around lookVector by angle
        newPos.applyAxisAngle(lookVector, angle);

        // and add the center position to get the world point
        newPos.add(centerPos);

        //   DebugArrowAB("sprite" + index, centerPos, newPos, 0xff0000);

        this.position = newPos;
//        this.lifeTime = 10000
        this.lifeTime = 100 + 500 * Math.random();

        // get the distance from the look vector ray
        const ray = new Ray(camera.position, lookVector);
        this.awayDistance = Math.sqrt(ray.distanceSqToPoint(this.position));


    }
}

export class CNodeFlowOrbs extends CNodeSpriteGroup {

    constructor(v) {
        super(v);

        // generally this is going to be a lookCamera thing
        const cameraNode = NodeMan.get(v.camera ?? "lookCamera")
        this.cameraNode = cameraNode;
        this.camera = this.cameraNode.camera;

        this.near = v.near ?? 100;
        this.far = v.far ?? 1000;

        this.oldNear = this.near;
        this.oldFar = this.far;

        // wind is an input, but changng wind will not change the sprites
        // on the existing frame
        // so we don't need to watch it
        this.wind = v.wind;
        if (this.wind)
            this.wind = NodeMan.get(this.wind);

        this.lastCameraPosition = this.camera.position.clone();
        this.lastFrame = 0;


        const lookVector = new Vector3();
        this.camera.getWorldDirection(lookVector);


        // create all the sprites
        this.orbs = [];
        for (let i = 0; i < this.nSprites; i++) {
            this.orbs.push(new CFlowOrb({
                position: new Vector3(0, 0, 0),
                startDistance: this.randomDistance(), // initial distance from camera
            }));
            this.orbs[i].reset(lookVector, this.camera, true, i);  // initial reset is inside the frustum
        }


        this.oldNSprites = this.nSprites;
        this.gui.add(this, "nSprites", 1, 2000, 1).name("Number").onChange(() => {

            const lookVector = new Vector3();
            this.camera.getWorldDirection(lookVector);

            if (this.nSprites < this.oldNSprites) {
                // remove the last ones
                this.orbs.splice(this.nSprites);
            } else if (this.nSprites > this.oldNSprites) {
                // add new ones
                for (let i = this.oldNSprites; i < this.nSprites; i++) {
                    const newSprite = new CFlowOrb({startDistance: this.randomDistance()});
                    newSprite.reset(lookVector, this.camera, true, i);
                    this.orbs.push(newSprite);
                }
            }
            // recreate the positions array
            this.positions = new Float32Array(this.nSprites * 3);
            // and set the positions
            for (let i = 0; i < this.nSprites; i++) {
                this.positions[i * 3] = this.orbs[i].position.x;
                this.positions[i * 3 + 1] = this.orbs[i].position.y;
                this.positions[i * 3 + 2] = this.orbs[i].position.z;
            }

            // and sizes
            this.sizes = new Float32Array(this.nSprites);
            for (let i = 0; i < this.nSprites; i++) {
                this.sizes[i] = this.size;
            }

            // and colors
            this.colors = new Float32Array(this.nSprites * 3);
            for (let i = 0; i < this.nSprites; i++) {
                const color = this.orbs[i].color;
                this.colors[i * 3] = color.r;
                this.colors[i * 3 + 1] = color.g;
                this.colors[i * 3 + 2] = color.b;
            }

            // recreate the geometry
            this.geometry.dispose();
            this.geometry = new BufferGeometry();

            // update the attributes
            this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
            this.geometry.setAttribute('color', new BufferAttribute(this.colors, 3));
            this.geometry.setAttribute('size', new BufferAttribute(this.sizes, 1));


            this.geometry.computeBoundingBox();
            this.geometry.computeBoundingSphere();

            this.geometry.attributes.position.needsUpdate = true;

            // dispose the old sprites
            this.group.remove(this.sprites);


            this.sprites = new Points(this.geometry, this.material);
            this.sprites.updateMatrix();
            this.sprites.updateMatrixWorld();

            this.group.add(this.sprites);

            this.oldNSprites = this.nSprites;



        }).elastic(100, 2000);

        // add near ad far sliders
        this.gui.add(this, "near", 1, 1000, 1).listen().name("Near").onChange(() => {
            if (this.far <= this.near) {
                this.far = this.near + 10;
            }
            this.adjustNearFar()
        }).elastic(10, 100000);

        // same for far
        this.gui.add(this, "far", 100, 10000, 1).listen().name("Far").onChange(() => {
            if (this.far <= this.near) {
                this.near = this.far - 10;
            }
            this.adjustNearFar()
        }).elastic(100, 100000);



    }

    randomDistance() {
        return this.near + (this.far-this.near) * Math.random();
    }


    adjustDistance(d) {
        return this.near + (d - this.oldNear) * (this.far - this.near) / (this.oldFar - this.oldNear);
    }

    adjustNearFar() {
        // we are adjusting distances from the range oldNear..oldFar to newNear..newFar
        // so we need to adjust the startDistance of each sprite
        // so that the distance from the camera is the same
        // the equation is
        // newStartDistance = near + (oldStartDistance-oldNear) * (newFar - newNear) / (oldFar - oldNear)



        for (let i = 0; i < this.nSprites; i++) {
          //  this.orbs[i].startDistance = this.adjustDistance(this.orbs[i].startDistance);

            // do ensure a consistent even distribution of distances
            // we randomize the next start distance
            this.orbs[i].startDistance = this.randomDistance();

        }

        // now adjust all the distance along the look vector
        const lookVector = new Vector3();
        this.camera.getWorldDirection(lookVector);
        for (let i = 0; i < this.nSprites; i++) {
            // get the vector from the camera to the sprite
            const v = this.orbs[i].position.clone().sub(this.camera.position);
            // devolve in into parallel and perpendicular components
            const parallel = v.clone().projectOnVector(lookVector);
            const perpendicular = v.clone().sub(parallel);
            // get and scale the original parallel component
            const oldParallel = parallel.length();
            const newParallel = this.adjustDistance(oldParallel);
            // adjust the parallel component
            parallel.normalize().multiplyScalar(newParallel);
            // and add the perpendicular component
            this.orbs[i].position = this.camera.position.clone().add(parallel).add(perpendicular);
        }


        this.oldFar = this.far;
        this.oldNear = this.near;
    }


    update(frame) {
        
        const deltaFrames = frame - this.lastFrame;
        this.lastFrame = frame;
        
        
        if (!this.visible) {
            return;
        }

        let inside = false;
        // see if the camera has moved significantly (>1km)
        if (this.camera.position.distanceTo(this.lastCameraPosition) > 1000) {
            console.log("camera has moved significantly, resetting all d = " + this.camera.position.distanceTo(this.lastCameraPosition));
            inside = true;
        }
        this.lastCameraPosition = this.camera.position.clone();

        // get the camera look vector
        const lookVector = new Vector3();
        this.camera.getWorldDirection(lookVector);

        const ray = new Ray(this.camera.position, lookVector);

        let wind = new Vector3();
        if (this.wind) {
            wind = this.wind.v0.clone().multiplyScalar(deltaFrames);
        }

        const frustum = new Frustum();
        const matrix = new Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(matrix);


        // update the sprite positions if needed
        for (let i = 0; i < this.nSprites; i++) {
            const orb = this.orbs[i];

            assert(orb instanceof CFlowOrb, "Sprite is not a CFlowOrb, i=" + i)

            // Add wind vector to the sprite position
            // this is a one frame update
            orb.position.add(wind);

            // find the distance of the sprite from the look vector
            const distance = Math.sqrt(ray.distanceSqToPoint(orb.position));

            // test if it is inside the camera frustum
            const sphere = new Sphere(orb.position, this.size/2);

            if (frustum.intersectsSphere(sphere)) {
                //orb.lifeTime = 5000 + 1000 * Math.random(); // patch
            } else {
                // if the orb is moving away from the centerline
                // then decrement time by the frame time
                // and check for reset
                if (deltaFrames !== 0 && distance > orb.awayDistance) {
                    orb.lifeTime -= 1000 / Sit.fps;
                }

                // if inside is set them the camera has moved a lot
                // so we immediately reset everything to inside the frustum
                if (orb.lifeTime < 0 || inside) {
                    console.log("resetting sprite as time is up")
                    orb.reset(lookVector, this.camera, inside, i);
                }
            }

            // // if it's moving too far away, reset it
            // if (distance > orb.awayDistance + 10 || inside) {
            //     orb.reset(lookVector, this.camera, inside, i);
            // }


            orb.awayDistance = distance;
        }

        // now set all the positions in the geometry
        for (let i = 0; i < this.nSprites; i++) {
            const orb = this.orbs[i];
            this.positions[i * 3] = orb.position.x;
            this.positions[i * 3 + 1] = orb.position.y;
            this.positions[i * 3 + 2] = orb.position.z;
        }

        // need bounding box and sphere for view culling
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();

        // and flag the geometry as changed
        this.geometry.attributes.position.needsUpdate = true;

    }
}