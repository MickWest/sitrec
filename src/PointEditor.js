import {TransformControls} from "three/addons/controls/TransformControls.js";
import {
    BoxGeometry,
    Line3,
    Mesh,
    MeshLambertMaterial,
    Raycaster,
    Vector2,
    Vector3
} from "three";
import {vdump} from "./utils"
import {par} from "./par";
import {mouseInViewOnly, mouseToViewNormalized, ViewMan} from "./nodes/CNodeView";
import {EUSToLLA, LLAToEUS, LLAVToEUS} from "./LLA-ECEF-ENU";
import {assert} from "./assert.js";
import {MV3, V3} from "./threeUtils";

// base class for curve editors
// has a list of positions that are the control points

class CurvePoint {
    constructor(position, frame) {

    }

}

// TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO
// TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO
// TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO
// TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO
// note there's two classes that need the data extracting from them
// and remember the point array is tied to the point editor object
// maybe should update it by copying? then re-update on moves
// the PointEditorData does not currently change the positions
// so that should work
// OR we can leave it as references
// either way we have to handle:
// 1 - initial setup
// 2 - movin6 points
// 3 - adding and removing points
// 4 - data acess and calculations
// Seems like all of 4 should be seperated out into a pure data model
// and the mirroring should work..
// export class PointEditorData {
//     constructor(initialPoints) {
//

//     }
//
//
//
// }

export class PointEditor {
    constructor(_scene, _camera, _renderer, controls, onChange, initialPoints, isLLA=false) {

        this.splineHelperObjects = [];  // the objects that are the control points
        this.frameNumbers = []          // matching frame numbers
        this.positions = [];            // positions of the above

        this.scene = _scene
        this.camera = _camera
        this.renderer = _renderer
        this.onChange = onChange   // external callback for when spline is changed

        this.raycaster = new Raycaster();         // for picking
        this.pointer = new Vector2();
        this.onUpPosition = new Vector2();       // mouse position when up
        this.onDownPosition = new Vector2();      // and down

        this.minimumPoints  = 2;
        this.numPoints = 0;

        // this.geometry is the object used as a control point on the curve
        // in this case it's a cube. Defaults to 20m
        // might be better to have its size view dependent
        // as it gets lost now, and is too big close up
        this.geometry = new BoxGeometry( 20, 20, 20 );

        // a TransformControl is an interactive object that you can attach to
        // another object to move it around the world
        // here it's attached to control points when we mouse over them
        this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControl.addEventListener('change', () => this.render);
        this.transformControl.addEventListener('dragging-changed', function (event) {
            controls.enabled = !event.value;
        });
        this.scene.add(this.transformControl);

        document.addEventListener('pointerdown', event => this.onPointerDown(event));
        document.addEventListener('pointerup', event => this.onPointerUp(event));
        document.addEventListener('pointermove', event => this.onPointerMove(event));



        this.transformControl.addEventListener('objectChange',  () => {

            // object moved
            // so do any snapping

            this.snapPointByIndex(this.editingIndex)

            this.updatePointEditorGraphics();
            if (this.onChange) this.onChange();
        });


//        this.data = new PointEditorData(initialPoints);
        if (!isLLA) {
            // legacy, allow EUS points (deprecated, as it bnreaks when map origin changes)
            this.load(initialPoints)
        } else {
            // convert from LLA to EUS, accounting for any new map coordinate system
            const LLAPoints = []
            for (let i = 0; i < initialPoints.length; i++) {
                const frame = initialPoints[i][0]
                const lla = LLAToEUS(initialPoints[i][1],initialPoints[i][2],initialPoints[i][3])
                LLAPoints.push ([frame,lla.x,lla.y,lla.z])
            }
            console.log(LLAPoints)
            this.load(LLAPoints)
        }
        this.setEnable(false)
    }

    // set up a set of points
    load(new_positions, LLA = false) {

        // This first two things just make the this.positions array the same length
        // as the new_positions array
        // this is done so the reference passed to new THREE.CatmullRomCurve3 is unchanged
        // (which would not be the case if we created a new array)
        while (new_positions.length > this.positions.length) {
            this.addPoint();
        }

        while (new_positions.length < this.positions.length) {
            this.removePoint();
        }

        for (let i = 0; i < this.positions.length; i++) {
            //   this.positions[i].copy(new_positions[i]);
            this.frameNumbers[i] = new_positions[i][0]
            this.positions[i].x = new_positions[i][1]
            this.positions[i].y = new_positions[i][2]
            this.positions[i].z = new_positions[i][3]
        }

    }

    snapPointByIndex(i) {
        const editingObject = this.splineHelperObjects[i];
        //      editingObject.position.y = 500;
        if (this.snapCamera != undefined) {
            // Snap to a LOS between the snapCamera track and the snapTarget Track
            var editingFrame = this.frameNumbers[i]
            var cameraPos = this.snapCamera.p(editingFrame)
            var targetPos = this.snapTarget.p(editingFrame)
            var los = new Line3(cameraPos,targetPos)
            var clamped = V3();
            los.closestPointToPoint(editingObject.position, false, clamped) // false means we can extend the LOS

            // note we need to COPY the position, as the object position is shared by both
            // the helper object, and the Point Editor positions[] array.
            // OR do we? is't it by reference?
            editingObject.position.copy(clamped)
        }
    }

    updateSnapping() {
//        console.log("updateSnapping")

        for (let i = 0; i < this.numPoints; i++) {
            this.snapPointByIndex(i)
        }

    }


    setEnable(enable) {
        this.enable = enable;
        for (let i = 0; i < this.numPoints; i++) {
            const p = this.splineHelperObjects[i].visible = this.enable;
        }
        if (!this.enable) {
            this.transformControl.detach()
        }
    }


    // Given a hight and a camera track, adjust all the points up vertically by "height"
    // but keep them on the LOS (i.e. move towards the camera)
    adjustUp(height, cameraTrack) {
        for (let i = 0; i < this.positions.length; i++) {
            let frame = this.frameNumbers[i]
            let cameraPos = cameraTrack.p(frame)
            let toCamera = cameraPos.clone().sub(this.positions[i]).normalize()
            let scale = height/toCamera.y;
            toCamera.multiplyScalar(scale)
            this.positions[i].add(toCamera)
        }
    }




    onPointerDown(event) {

        if (!this.enable) return;

        this.onDownPosition.x = event.clientX;
        this.onDownPosition.y = event.clientY;


        // right click on point to delete it
        if (event.button == 2) {
            // TODO - ADJUST FOR VIEW, not full screen
            this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.pointer, this.camera);
            const intersects = this.raycaster.intersectObjects(this.splineHelperObjects, false);
            if (intersects.length > 0) {

                const object = intersects[0].object;

                if (object === this.transformControl.object) {
                    this.transformControl.detach();
                }

                var index = this.splineHelperObjects.findIndex(ob => ob === object)
                assert (index !== -1, "Can't find object to destroy!!")

                this.scene.remove(object);

                // remove one entry from all the
                this.frameNumbers.splice(index, 1)
                this.positions.splice(index, 1)
                this.splineHelperObjects.splice(index, 1)
                this.updatePointEditorGraphics()
                this.numPoints--;

                this.dirty = true;

            }


        }

    }


    onPointerUp(event) {
        if (!this.enable) return;

        this.onUpPosition.x = event.clientX;
        this.onUpPosition.y = event.clientY;

        if (this.onDownPosition.distanceTo(this.onUpPosition) === 0) this.transformControl.detach();
        this.exportSpline()
    }

    onPointerMove(event) {
        if (!this.enable) return;

        //this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        //this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

        var view = ViewMan.get("mainView")

        if (mouseInViewOnly(view, event.clientX , event.clientY))
        {
            const [px, py] = mouseToViewNormalized(view, event.clientX, event.clientY)
            this.pointer.x = px;
            this.pointer.y = py;

            this.raycaster.setFromCamera(this.pointer, this.camera);
            const intersects = this.raycaster.intersectObjects(this.splineHelperObjects, false);
            if (intersects.length > 0) {


                const object = intersects[0].object;

                // find the index of the splineHelperObjects entry we are editing
                this.editingIndex = this.splineHelperObjects.findIndex((ob) => {
                    return ob === object
                })


                if (object !== this.transformControl.object) {
                    this.transformControl.attach(object);
                }
            }
        }
    }


    addPoint() {
        // here's the crux of this refactoring issue
        // the positions in the curve are stored in a simple array of Vector3s: this.positions
        // but they are references to the position vectors in point editor objects
        // intrinsically tying the data to the UI
        // the UI can modify these positions
        this.numPoints++;
        this.positions.push(this.addPointEditorObject().position);
        this.frameNumbers.push(-1)
        this.dirty = true;
    }


    removePoint() {

        if (this.numPoints <= this.minimumPoints) {
            return;
        }

        const point = this.splineHelperObjects.pop();
        this.numPoints--;
        this.positions.pop();
        this.frameNumbers.pop()

        if (this.transformControl.object === point) this.transformControl.detach();
        this.scene.remove(point);

      //  this.updatePointEditorGraphics();
      //  if (this.onChange) this.onChange();

    }


    exportSpline() {

        let strplace = [];

        for (let i = 0; i < this.numPoints; i++) {
            const p = this.splineHelperObjects[i].position;
            strplace.push(`[${this.frameNumbers[i]}, ${p.x}, ${p.y}, ${p.z}]`);
        }
        console.log(strplace.join(',\n'));
        console.log("LLA----------------------------------->");
        strplace = [];
        for (let i = 0; i < this.numPoints; i++) {
            const p = EUSToLLA(this.splineHelperObjects[i].position);
            strplace.push(`[${this.frameNumbers[i]}, ${p.x}, ${p.y}, ${p.z}]`);
        }
        console.log(strplace.join(',\n'));

    }

    makePointEditorObject(position) {

        const material = new MeshLambertMaterial({color: Math.random() * 0xffffff});
        const object = new Mesh(this.geometry, material);

        if (position) {

            object.position.copy(position);

        } else {

            object.position.x = Math.random() * 1000 - 500;
            object.position.y = Math.random() * 600;
            object.position.z = Math.random() * 800 - 400;

        }

        object.castShadow = true;
        object.receiveShadow = true;
        this.scene.add(object);

        return object;
    }

    addPointEditorObject(position) {
        const object = this.makePointEditorObject(position)
        this.splineHelperObjects.push(object);
        return object;
    }

    getLength(frames) {
        // just add the sum of the linear lengths of the segments. frames is ignored
        var len = 0;
        for (var i=0;i<this.numPoints-1;i++) {
            len += this.positions[i+1].clone().sub(this.positions[i]).length()
        }
        return len
    }


    // get value at t (parametric input, 0..1) into the vector point
    // spline editors will override with a more complex one to get points
    // along a curve, but here we can just interpolate between the points
    getPoint(t,point) {
        // first find point A and B such that t is between the
        var a = Math.floor(t * (this.numPoints-1))
        if (t >= 1.0) a = this.numPoints - 2; // exception for t =1
        const b = a + 1 // b is always just the bext point
        const f = (t * (this.numPoints-1)-a) // fraction within the segment a-b

    //    console.log("t:"+t+" np-1:" + (this.numPoints-1) +" a:"+a+" b:"+b+" f:"+f)
        //now simply interpolate.
        point.copy(this.positions[b])
        point.sub(this.positions[a])
        point.multiplyScalar(f)
        point.add(this.positions[a])
    }

    // given a frame number, find the matching value for t (i.e how far along the curve
    getPointFrame(f) {
        var point;
        point = new Vector3()
        // frameNumbers is an array of the frame number that each control point is at
        // it's on greater that the number of segments.
        assert(this.frameNumbers.length > 0, "Can't work with zero frame in a spline")
        if (this.frameNumbers.length === 1) {
            point.copy(this.positions[0])
            return point
        }
        // this is the index of the last control point
        // i.e. the last fencepost
        const lastIndex = this.frameNumbers.length - 1
        // If outside the bounds of the curve, the just use the end point
        // might be good to extrapolate. But better to have values at frame 0
        // and the last frame.
        if (f<this.frameNumbers[0] ) f = this.frameNumbers[0]
        if (f>this.frameNumbers[lastIndex] ) f = this.frameNumbers[lastIndex]

        const numFramesCovered = this.frameNumbers[lastIndex] - this.frameNumbers[0]
        var segment = 0
        var t = 0;
        const tPerSegment = 1/lastIndex;
        while (segment<lastIndex
        && (f < this.frameNumbers[segment] || f > this.frameNumbers[segment+1])) {
            segment++
            t += tPerSegment
        }
        if (segment === lastIndex) {
            t = 1.0;
        } else {
            // t is the value of t at the start of this segment
            // t + tPerSegment will be the value at the end.
            // so need to add the fraction of tPerSegment that we are into this segment.
            t = t + (tPerSegment * (f - this.frameNumbers[segment]) / (this.frameNumbers[segment+1] - this.frameNumbers[segment]))

        }
//        if (f===3015)
//            console.log("f:"+f+", t:"+t)
        this.getPoint(t,point)
        //console.log("f:"+f+", t:"+t+" -> "+vdump(point,2))
        return point;

    }


    // find the first point that has a frame equal to, or less than this frame
    // and either it's the last frame, or the next frame is higher
    // replace it if the same frame,
    // insert after if a lower frame
    // need to update all of:
    // - framesNumbers
    // - positions (Which is an array of REFERENCES to the positions in the splineHelperObjects
    // - splineHelperObjects
    // They are separate arrays as the code needs an array of objects for collision detection
    // and an array of positions for the spline code
    insertPoint(frame, position) {

        assert(this.frameNumbers.length == this.positions.length)
        assert(this.frameNumbers.length == this.splineHelperObjects.length)
        assert(this.frameNumbers.length === this.numPoints)

        // make the helper object we are going to add ahead of time
        // the position are references to this
        const object = this.makePointEditorObject(position)

        if (this.frameNumbers.length === 0 || this.frameNumbers[0] > frame) {
            // nothing there, or first frame has a higher value than this one
            // so we push to the head of the array
            this.frameNumbers.splice(0,0,frame)
            this.positions.splice(0,0,object.position)
            this.splineHelperObjects.splice(0,0,object)
            this.numPoints++;
        } else {

            // at this point we know that we have:
            // - at least one point
            // - with a frame number less than
            var insertPoint = 0;
            while (!(insertPoint === this.frameNumbers.length - 1)
            && !(this.frameNumbers[insertPoint] <= frame && this.frameNumbers[insertPoint + 1] > frame)) {
                insertPoint++
            }
            console.log("Insert at " + insertPoint)

            // if the SAME frame number, then replace
            if (this.frameNumbers[insertPoint] === frame) {
                this.scene.remove(this.splineHelperObjects[insertPoint])
                this.positions[insertPoint] = object.position
                this.splineHelperObjects[insertPoint] = object;
            } else {
                // otherwise, insert after this position
                this.frameNumbers.splice(insertPoint + 1, 0, frame)
                this.positions.splice(insertPoint + 1, 0, object.position)
                this.splineHelperObjects.splice(insertPoint + 1, 0, object)
                this.numPoints++
            }
        }
        this.updatePointEditorGraphics()
    }


    updatePointEditorGraphics() {

        // extend it with something like updating a spline, or set of lines
        // or whatever you are controlling with the points
        // which you can also do with the onChange callBack if you want to
        // construct an object rather than derive a new class.

       // console.log("+++ Set Editor DIRTY here")
        this.dirty = true;
        par.renderOne = true;

    }

}