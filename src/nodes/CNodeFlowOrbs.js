// a simple container for a sprites
import {radians} from "../utils";
import {BufferAttribute, BufferGeometry, Color, Frustum, Matrix4, Points, Ray, Sphere, Vector3} from "three";
import {NodeMan, Sit} from "../Globals";
import {CNodeSpriteGroup} from "./CNodeSpriteGroup";
import {assert} from "../assert";
import {DebugArrow, removeDebugArrow} from "../threeExt";
import * as LAYER from "../LayerMasks";
import {altitudeAboveSphere, getLocalDownVector, pointOnSphereBelow} from "../SphericalMath";

class CFlowOrb {
    constructor(v) {
        this.position = v.position ?? new Vector3();
        this.lifeTime = v.lifeTime ?? 1000;
        this.startDistance = v.startDistance ?? 1000;
        this.awayDistance = 0;


        const colorHex = Math.random() * 0x808080 + 0x808080;
        this.color = new Color(colorHex);


    }

}

export class CNodeFlowOrbs extends CNodeSpriteGroup {

    constructor(v) {
        super(v);

        // generally this is going to be a lookCamera thing
        const cameraNode = NodeMan.get(v.camera ?? "lookCamera")
        this.cameraNode = cameraNode;
        this.camera = this.cameraNode.camera;

        this.spreadMethods = ["Range", "Altitude"];
        this.spreadMethod = v.spreadMethod ?? "Range"

        this.near = v.near ?? 100;
        this.far = v.far ?? 1000;

        this.colorMethods = ["Random", "User", "Hue From Altitude", "Hue From Distance"];

        this.colorMethod = v.colorMethod ?? "Random";
        this.userColor = v.userColor ?? "#FFFFFF";
        this.hueAltitudeMax = v.hueAltitudeMax ?? 10000;

        this.oldNear = this.near;
        this.oldFar = this.far;

        this.numArrows = 100;

        // wind is an input, but changng wind will not change the sprites
        // on the existing frame
        // so we don't need to watch it
        this.wind = v.wind;
        if (this.wind)
            this.wind = NodeMan.get(this.wind);

        this.lastCameraPosition = this.camera.position.clone();
        this.lastFrame = 0;

        this.initializeSprites();

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
                    const newOrb = new CFlowOrb({startDistance: this.randomDistance()});
                    this.resetOrb(newOrb, lookVector, this.camera, true, i);
                    this.orbs.push(newOrb);
                }
            }

            this.rebuildSprites();

            assert(this.nSprites === this.orbs.length, "nSprites and orbs array length mismatch. nSprites=" + this.nSprites + " orbs.length=" + this.orbs.length);

            this.oldNSprites = this.nSprites;


        }).elastic(100, 2000, true);

        this.gui.add(this, "spreadMethod", this.spreadMethods).name("Spread Method").onChange(() => {
            this.initializeSprites();
            this.updateColors();
            if (this.spreadMethod === "Altitude") {
                this.farSlider.name("High (m)");
                this.nearSlider.name("Low (m)");
                }
            else {
                this.farSlider.name("Far (m)");
                this.nearSlider.name("Near (m)");
            }
        })

        // add near and far sliders
        this.nearSlider = this.gui.add(this, "near", 1, 1000, 1).listen().name("Near (m)").onChange(() => {
            if (this.far <= this.near) {
                this.far = this.near + 10;
            }
            this.adjustNearFar()
        }).elastic(10, 100000, true);

        // same for far
        this.farSlider = this.gui.add(this, "far", 100, 10000, 1).listen().name("Far (m)").onChange(() => {
            if (this.far <= this.near) {
                this.near = this.far - 10;
            }
            this.adjustNearFar()
        }).elastic(1000, 100000, true);


        this.gui.add(this, "colorMethod", this.colorMethods).name("Color Method").onChange(() => {
            this.updateColors();
        })


        this.gui.addColor(this, "userColor").name("User Color").onChange(() => {
            this.updateColors();
        })

        this.gui.add(this, "hueAltitudeMax", 100, 10000, 1).name("Hue Range").onChange(() => {
            this.rebuildSprites();
            this.updateColors();
        }).elastic(1000, 100000)


        this.windWhilePaused = v.windWhilePaused ?? false;
        this.gui.add(this, "windWhilePaused").name("Wind While Paused");

        this.rebuildSprites();

    }


    resetOrb(orb, lookVector, camera, inside = false, index) {

        // given a lookVector and a camera, set the position of the sprite
        // to be  given distance from the lookVector
        // and then the corner of the frustum, roated by a random angle (0..2PI)
        // but OUTSIDE the frustum of the camera
        const centerPos = camera.position.clone().add(lookVector.clone().multiplyScalar(orb.startDistance));
        const frustumHeight = Math.tan(radians(camera.fov) / 2) * orb.startDistance;
        const frustumWidth = frustumHeight * camera.aspect;
        const angle = Math.random() * Math.PI * 2;

        var right = new Vector3()
        var up = new Vector3()
        var zAxis = new Vector3()
        camera.matrix.extractBasis(right, up, zAxis)

        // get newpos as the offset from the center line
        // (i.e. not yet a point)
        let newPos = up.clone().multiplyScalar(frustumHeight).add(right.clone().multiplyScalar(frustumWidth));

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


        // TODO - fixe this to only with the altitude spread method
        // and igure out why the altitiude seems to be wrong
        // like it's far=30000 and not reacing the ground'
        // what units???? need to show them???


        if (this.spreadMethod === "Altitude") {
            // if using the altitude spread method, then we need to adjust the altitude
            // to fix it to the altitide of the center position
            const centerAltitude = altitudeAboveSphere(centerPos);
            newPos = pointOnSphereBelow(newPos, centerAltitude);
        }

        orb.position = newPos;
        orb.lifeTime = 100 + 500 * Math.random();

        // get the distance from the look vector ray
        const ray = new Ray(camera.position, lookVector);
        orb.awayDistance = Math.sqrt(ray.distanceSqToPoint(orb.position));


    }



    initializeSprites() {
        const lookVector = new Vector3();
        this.camera.getWorldDirection(lookVector);


        // create all the sprites

        this.orbs = [];
        for (let i = 0; i < this.nSprites; i++) {
            this.orbs.push(new CFlowOrb({
                position: new Vector3(0, 0, 0),
                startDistance: this.randomDistance(), // initial distance from camera
            }));
            this.resetOrb(this.orbs[i], lookVector, this.camera, true, i);  // initial reset is inside the frustum
        }
    }

    rebuildWindArrows() {
        // get the wind direction
        if (this.wind && this.wind.v0.length() > 0) {
            const wind = this.wind.v0.clone();
            const windSpeed = wind.length();
            // create or update
            for (let i = 0; i < Math.min(this.numArrows, this.nSprites); i++) {
                const orb = this.orbs[i];
                DebugArrow("orb_" + i, wind, orb.position, this.size * 2 + windSpeed, 0xFFFF00, true, this.group, 20, LAYER.MASK_LOOKRENDER);
            }

            // any extra arrows we remove
            for (let i=this.nSprites; i<this.numArrows;i++) {
                removeDebugArrow("orb_"+i);
            }
            this.hasArrows = true;

        } else {
            if (this.hasArrows) {
                // any extra arrows we remove
                for (let i = 0; i < this.numArrows; i++) {
                    removeDebugArrow("orb_" + i);
                }
            }
        }
    }


    rebuildSprites()
    {
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

        this.updateColors()
        this.updateColorsAttribute()

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
    }


    updateColorsAttribute() {
        for (let i = 0; i < this.nSprites; i++) {
            const orb = this.orbs[i];
            assert(orb instanceof CFlowOrb, "Setting color, but Sprite is not a CFlowOrb, i=" + i)
            assert(orb.color instanceof Color, "Setting color, but Sprite color is not a Color, i=" + i)
            const color = orb.color;
            this.colors[i * 3] = color.r;
            this.colors[i * 3 + 1] = color.g;
            this.colors[i * 3 + 2] = color.b;
        }
        this.geometry.attributes.color.needsUpdate = true;
    }

    updateColors() {
        for (let i = 0; i < this.nSprites; i++) {
            const orb = this.orbs[i];
            let color;

            if (this.colorMethod === "Random") {
                const colorHex = Math.random() * 0x808080 + 0x808080;
                color = new Color(colorHex);
            } else if (this.colorMethod === "User") {
                color = new Color(this.userColor)
            } else if (this.colorMethod === "Hue From Altitude") {
                const hue = altitudeAboveSphere(orb.position) / this.hueAltitudeMax;
                color = new Color().setHSL(hue, 1, 0.5);
            } else if (this.colorMethod === "Hue From Distance") {
                const distance = orb.position.distanceTo(this.camera.position);
                const hue = distance / this.hueAltitudeMax;
                color = new Color().setHSL(hue, 1, 0.5);
            }


            orb.color = color;
        }

        this.updateColorsAttribute();

    }

    // get the near and far values
    // if the spread method is altitude, then the near and far are adjusted to
    // the the distance along the look vector that matches the altitude (from seal level)
    getNearFar() {
        let near = this.near
        let far = this.far
        if (this.spreadMethod === "Altitude") {
            const lookVector = new Vector3();
            this.camera.getWorldDirection(lookVector);
            const down = getLocalDownVector(this.camera.position);
            const altitude = altitudeAboveSphere(this.camera.position);

            // in the altitude spread method, near and far are ABSOLUTE altitudes
            // (i.e. meters above the ground)
            // so to convert hem to distances along the look vector
            // we need to convert them to distances along the down vector
            // note that they are flipped, as "near" is a distance from sea level

            const nearDown = altitude - far;
            const farDown = altitude - near;


            const scale = 1 / Math.abs(down.dot(lookVector))

            near = nearDown * scale;
            far = farDown * scale;
        }
        return {near, far}
    }

    // get a random distance along the look vector
    // using the scaled near and far values
    randomDistance() {
        const {near, far} = this.getNearFar();
        return near + (far-near) * Math.random();
    }

    adjustDistance(d) {
        const {near, far} = this.getNearFar();
        return near + (d - this.oldNear) * (far - near) / (this.oldFar - this.oldNear);
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


        const {near, far} = this.getNearFar();
        this.oldFar = far;
        this.oldNear = near;
    }


    update(frame) {
        
        let deltaFrames = frame - this.lastFrame;
        this.lastFrame = frame;


        if (deltaFrames === 0 && this.windWhilePaused) {
            deltaFrames = 1;
        }
        
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


        let didReset = false;

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
                    this.resetOrb(orb, lookVector, this.camera, inside, i);
                    didReset = true;
                }
            }

            // // if it's moving too far away, reset it
            // if (distance > orb.awayDistance + 10 || inside) {
            //     this.resetOrb(orb, lookVector, this.camera, inside, i);
            // }


            orb.awayDistance = distance;
        }

        // if any sprite was reset it might change altitude
        // so we need to rebuild the colors if we are using altitude for color
        if (didReset && this.colorMethod === "Hue From Altitude") {
            this.updateColors();
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


        this.rebuildWindArrows();

    }
}