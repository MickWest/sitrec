// CameraControls

import {
	Vector2,
	Vector3,
	Matrix4,
	Plane,
	Raycaster

} from '../../three.js/build/three.module.js';
import {degrees, f2m, radians, vdump} from "../utils";
import {DebugArrow, DebugArrowAB, intersectSphere2, V3} from "../threeExt";
import {mouseInViewOnly, mouseToCanvas, mouseToView, ViewMan} from "../nodes/CNodeView";
import {par} from "../par";
import {ECEFToLLAVD_Sphere, EUSToECEF, EUSToLLA, wgs84} from "../LLA-ECEF-ENU";
import {Sphere} from "three";
import {getLocalUpVector} from "../SphericalMath";
import {NodeMan, Sit} from "../Globals";
import {CNodeControllerPTZUI} from "../nodes/CNodeControllerPTZUI";

const STATE = {
	NONE: - 1,
	ROTATE: 0,
	DOLLY: 1,
	PAN: 2,
	TOUCH_ROTATE: 3,
	TOUCH_PAN: 4,
	TOUCH_DOLLY_PAN: 5,
	TOUCH_DOLLY_ROTATE: 6,
	DRAG: 7,
};



class CameraMapControls {
	constructor(camera, canvas, view) {
		this.camera = camera;
		this.canvas = canvas;
		this.view = view;
		this.enableZoom = true;
		this.zoomSpeed = 1;
		this.rotateSpeed = 0.5;
		this.target = new Vector3()
		this.targetIsTerrain = false;

		this.canvas.addEventListener( 'contextmenu', e => this.onContextMenu(e) );
		this.canvas.addEventListener( 'pointerdown', e => this.handleMouseDown(e) );
		this.canvas.addEventListener( 'pointerup', e => this.handleMouseUp(e) );
		this.canvas.addEventListener( 'pointermove', e => this.handleMouseMove(e) );
		this.canvas.addEventListener( 'wheel', e => this.handleMouseWheel(e) );

		this.mouseStart = new Vector2();
		this.mouseEnd = new Vector2();
		this.mouseDelta = new Vector2();

		this.button = 0

		this.state = STATE.NONE
		this.enabled = true;

	}

	update() {
		// maintained for backwards compatibility with other Three.js controls
	}


	onContextMenu( event ) {

//		console.log("onConrxt")

		if ( this.enabled === false ) return;

		event.preventDefault();

	}

	getPTZController() {
		const cameraNode = this.view.cameraNode	;

		// given the camera node, find the PTZ controller in the inputs
		// by inspecting the type of the input
		// then return the controller
		// if not found, return undefined
		//
		for (const key in cameraNode.inputs) {
			const input = cameraNode.inputs[key];
			// is it a CNodeControllerPTZ
			if (input instanceof CNodeControllerPTZUI) {
				return input;
			}
		}
		return undefined;

	}

	handleMouseWheel( event ) {

		if ( this.enabled === false || this.enableZoom === false || this.state !== STATE.NONE ) return;

		event.preventDefault();

		const ptzControls= this.getPTZController();

		if (ptzControls !== undefined) {
			ptzControls.fov += event.deltaY/10
			if (ptzControls.fov<0.1) ptzControls.fov = 0.1;
			if (ptzControls.fov>120) ptzControls.fov = 120;
		} else {

			var target2Camera = this.camera.position.clone().sub(this.target)
			var length = target2Camera.length()

			const zoomScale = Math.pow(0.95, this.zoomSpeed);
			if (event.deltaY < 0) {
				length *= zoomScale;

			} else if (event.deltaY > 0) {

				length /= zoomScale
			}
			target2Camera.normalize().multiplyScalar(length)
			this.camera.position.copy(this.target).add(target2Camera)


			var toCamera = this.camera.position.clone().sub(this.target)


			// A bit patchy
			// the max distance to the target assumes the target is in a good position on the ground
			// then it's different for globe vs. terrain
			// globe we assume a large far distance, so we can see it all
			// and we use 2.5 earth radii, so we can see satellites on the other side
			// terrain Sitches just use the far distance, so they still clip out. Could be imporved.

			var maxDistance;
			if (Sit.useGlobe) {
				maxDistance = this.camera.far - 2.5 * wgs84.RADIUS;
			} else {
				maxDistance = this.camera.far / 2 ;
			}
			if (maxDistance > 0 && toCamera.length() > maxDistance) {
				toCamera.normalize().multiplyScalar(maxDistance).add(this.target)
				this.camera.position.copy(toCamera)
			}

		}


		par.renderOne = true;
	}


	updateStateFromEvent(event) {
		switch (this.button) {
			case 0:
				// left button  = drag the world around
				this.state = STATE.DRAG;
				break;
			case 1:
				// center button = rotate camera about a point on the ground
				this.state = STATE.ROTATE;
				break;
			case 2:
				// right button = rotate camera without moving it
				this.state = STATE.PAN;
				break;
		}

		if (event.shiftKey) this.state = STATE.ROTATE;

		if (event.metaKey || event.ctrlKey) this.state = STATE.PAN;

		// if we have a PTZ UI controller, then all buttons just pan
		if (this.getPTZController() !== undefined ) this.state = STATE.PAN;


	}

	handleMouseDown(event) {
		if (!this.enabled) {
			this.state = STATE.NONE
			return;
		}
		if (!mouseInViewOnly(this.view,event.clientX, event.clientY)) return;
		console.log ("CameraMapControls Mouse DOWN, button = "+event.button)
		this.button = event.button;
		this.updateStateFromEvent(event)
		const [x, y] = mouseToView(this.view, event.clientX, event.clientY)
		this.mouseStart.set( x, y );
		this.canvas.setPointerCapture(event.pointerId)
		par.renderOne = true;
		this.view.cursorSprite.visible = true;

		const mainView = ViewMan.get("mainView")
		const cursorPos = mainView.cursorSprite.position.clone();
		// convert to LLA
		const ecef = EUSToECEF(cursorPos)
		const LLA = ECEFToLLAVD_Sphere(ecef)
		console.log("Cursor LLA: "+vdump(LLA));
		if (NodeMan.exists("cursorLLA")) {
			NodeMan.get("cursorLLA").changeLLA(LLA.x, LLA.y, LLA.z)
		} else {
			NodeMan.create("LLALabel", {id: "cursorLLA", text: "Cursor LLA",
				lat: LLA.x, lon: LLA.y, alt: LLA.z, size: 12, offsetX: 20, offsetY: 25, centerX:0, centerY:0})
		}


	}



	handleMouseUp(event) {
		NodeMan.disposeRemove("cursorLLA");
		this.state = STATE.NONE
		if (!this.enabled) return;
		this.canvas.releasePointerCapture(event.pointerId)

		// dump a camera location to the console
		var p = this.camera.position.clone()
		const v = new Vector3();
		v.setFromMatrixColumn(this.camera.matrixWorld,2);
		v.multiplyScalar(-1000)
		v.add(p)
		console.log( "startCameraPosition:"+ vdump(this.camera.position,2,'[',']')+","
		+ "\nstartCameraTarget:"+vdump(v,2,'[',']'))

		const posLLA = EUSToLLA(this.camera.position)
		const atLLA = EUSToLLA(v)

		console.log( "startCameraPositionLLA:"+ vdump(posLLA,6,'[',']')+","
			+ "\nstartCameraTargetLLA:"+vdump(atLLA,6,'[',']')+",")

		this.view.cursorSprite.visible = false;

	}

	handleMouseMove(event) {
		if (!this.enabled) {
			this.state = STATE.NONE
			return;
		}
		if (this.state === STATE.NONE) return;
	//	console.log ("CameraMapControls Mouse MOVE, with non-zero state, enabled = "+this.enabled)
		this.updateStateFromEvent(event)

		par.renderOne = true;

		const [x, y] = mouseToView(this.view, event.clientX, event.clientY)
		this.mouseEnd.set( x, y );

		if (this.mouseStart.equals(this.mouseEnd)) {
			console.warn("mouse motion with no actual motion. Retina issues? ")
			return;
		}

	//	this.mouseEnd.set( event.clientX, event.clientY );
		this.mouseDelta.subVectors( this.mouseEnd, this.mouseStart ).multiplyScalar( this.rotateSpeed );

//		console.log(x+","+y+","+vdump(this.mouseDelta))

		const ptzControls= this.getPTZController();

		
		switch (this.state) {

			case STATE.PAN:

				const xRotate = 2 * Math.PI * this.mouseDelta.x / this.view.heightPx / 4;
				const yRotate = 2 * Math.PI * this.mouseDelta.y / this.view.heightPx / 4

//				console.log("PAN: "+xRotate+","+yRotate)
				

				// if we have ptzControls in this view, then update them
				// not this is notdirectly equzalent to the 	this.camera.rotateY(xRotate), etc
				// likely due to the up vector.
				if (ptzControls !== undefined) {


					ptzControls.az -= degrees(xRotate) * ptzControls.fov / 45
					ptzControls.el += degrees(yRotate) * ptzControls.fov / 45

					if (ptzControls.az < -180) ptzControls.az+=360
					if (ptzControls.az >= 180) ptzControls.az-=360
					if (ptzControls.el <= -89) ptzControls.el = -89
					if (ptzControls.el >= 89) ptzControls.el = 89

				} else {


					this.camera.rotateY(xRotate);
					this.camera.rotateX(yRotate);

				}
				break;

			case STATE.ROTATE:
				// Here we want to rotate the camera
				// about a point in the gorund
				var xAxis = new Vector3()
				var yAxis = new Vector3()
				var zAxis = new Vector3()

				var oldMatrix = this.camera.matrix.clone()
				var oldPosition = this.camera.position.clone()
				this.camera.matrix.extractBasis(xAxis,yAxis,zAxis)

				const oldUp = yAxis

				// use this.canvas.heightx for both to keep it square
				this.rotateLeft( 2 * Math.PI * this.mouseDelta.x / this.view.heightPx);

//				console.log("Rotating up by "+(2 * Math.PI * this.mouseDelta.y / this.view.heightPx))
				this.rotateUp( 2 * Math.PI * this.mouseDelta.y / this.view.heightPx );


				this.camera.updateMatrix()
				this.camera.updateMatrixWorld(true)
				this.camera.matrix.extractBasis(xAxis,yAxis,zAxis)

				if (!Sit.useGlobe && yAxis.y <= 0.01) {
					this.camera.position.copy(oldPosition)
					this.camera.quaternion.setFromRotationMatrix(oldMatrix);
					this.camera.updateMatrix()
					this.camera.updateMatrixWorld()
				}


				if (!Sit.useGlobe) {
					this.camera.matrix.extractBasis(xAxis, yAxis, zAxis)

					// reset the up direction - note this can cause problems when roving over the globe, so maybe use something
					// more like a local up vector.
					//const up = new Vector3(0,1,0) // ??
					var pointInFront = this.camera.position.clone().sub(zAxis)
					this.camera.lookAt(pointInFront, oldUp)
				} else {
// 				 	this.camera.matrix.extractBasis(xAxis, yAxis, zAxis)
// 				 	const up = getLocalUpVector(this.target, wgs84.RADIUS)
// 				 	DebugArrow("Up Vector",up, this.target, 1000000,"#FFFFFF")
// 				 	var pointInFront = this.camera.position.clone().sub(zAxis)
// //				 	//this.camera.up = up;
//
// 					this.camera.up.lerp(up, 0.01);
//
// 					this.camera.lookAt(pointInFront)
				}



				break;



			case STATE.DRAG:
				// Dragging is done either on a local plane, or on the full globe
				// based on the value of useGlobe
				// if !useGlobe, then use the plane as before
				// if useGlobe then us the sphere, of this radius


				// make a plane at target height
				const dragPlane = new Plane(new Vector3(0,-1,0),this.target.y)
				var dragSphere;
				if (this.useGlobe) {
					dragSphere = new Sphere(new Vector3(0,-wgs84.RADIUS,0), wgs84.RADIUS)
				}


				// find intersection for start and end mouse positions
				const raycaster = new Raycaster();


				let width = this.view.widthPx
				let height = this.view.heightPx

				var startPointer = new Vector2(
					this.mouseStart.x/ width * 2 - 1,
					- this.mouseStart.y / height * 2 + 1
				)
				var endPointer = new Vector2(
					this.mouseEnd.x/ width * 2 - 1,
					- this.mouseEnd.y / height * 2 + 1
				)

//				console.log(par.frame + ": STATE.DRAG: Start: "+vdump(startPointer)+" End: "+vdump(endPointer))

				if (startPointer.x === endPointer.x && startPointer.y === endPointer.y)
					console.log("Drag with no motion")

				// find the intersection of the start and end rays with the plane
				// then see how much they have moved
				// the positions returned will be relative to the camera

				var start3D = new Vector3();
				var end3D = new Vector3();

				raycaster.setFromCamera(startPointer, this.camera)
				if (this.targetIsTerrain || !this.useGlobe) {
					if (!raycaster.ray.intersectPlane(dragPlane, start3D)) break;
				} else {
					if (!intersectSphere2(raycaster.ray, dragSphere, start3D)) break;
				}
				raycaster.setFromCamera(endPointer, this.camera)
				if (this.targetIsTerrain || !this.useGlobe) {
					if (!raycaster.ray.intersectPlane(dragPlane, end3D)) break;
				} else {
					if (!intersectSphere2(raycaster.ray, dragSphere, end3D)) break;
				}

			//	DebugArrowAB("mouseMovePan",start3D,end3D,0x00ffff,true,GlobalScene)

				// Panning is like dragging the ground in one direction, which means we move the camera in the other direction
				// hence the .sub here

				//var delta3D = end3D.clone().sub(start3D)
				//this.camera.position.sub(delta3D)

				const origin = V3(0, -wgs84.RADIUS, 0)
				const originToStart = start3D.clone().sub(origin)
				const originToEnd   = end3D.clone().sub(origin)

				// const originToStart = V3(-122483.52202405069,6375044.910254984,-87907.9147814633)
				// const originToEnd = V3(-122483.52202405069,6375044.910254984,-87907.9147814633)


				// we now have three points that define the plane of rotation
				// the origin, and the start and end point

				// calculate a vector perpendicular to the three
				const rotationAxis = new Vector3().crossVectors(originToStart, originToEnd).normalize();
				// find the angle we need to rotate:
				const odot = originToStart.dot(originToEnd)
				const lengthsMultiplied = (originToStart.length() * originToEnd.length())
				const oCos = odot / lengthsMultiplied

				let angle = -Math.acos( oCos);
				if (isNaN(angle)) {
					console.log("ToStart "+vdump(originToStart)+" ToEnd: "+vdump(originToEnd))
					console.log("ots "+originToStart.length() +"," + originToEnd.length())
					console.log("o: "+odot+","+lengthsMultiplied+" / = " + oCos)
					console.warn("NaN angle in Camera controls STATE.DRAG, patching to 0")
					angle = 0;
				};

				 // const rotationAxis = V3(0,1,0)
				 // const angle = radians(1)


				// DebugArrow("rotationAxis", rotationAxis, origin,7000000, "#00FFFF")
				// DebugArrowAB("Start", origin, start3D,"#FF0000", true,GlobalScene)
				// DebugArrowAB("End", origin, end3D,"#00FF00", true,GlobalScene)


				this.camera.position.sub(origin) 						// make position relative to the globe orgin

//				console.log("rotationAxis: "+vdump(rotationAxis)+" angle = "+angle)
				this.camera.rotateOnWorldAxis(rotationAxis,angle) 		// rotate the orientation only
				this.camera.position.applyAxisAngle(rotationAxis,angle) // rotate the position
//				console.log("Camera position "+ vdump(this.camera.position))

				this.camera.position.add(origin) 						// position back to EUS
				this.camera.updateMatrix();
				this.camera.updateMatrixWorld();


				break;


		}


		this.mouseStart.copy( this.mouseEnd );

	}

	// rotate the camera around the target, so we rotate
	rotateLeft(angle) {
		this.camera.position.sub(this.target) // make relative to the target
		//const up = new Vector3(0,1,0)
		const up = getLocalUpVector(this.target, wgs84.RADIUS)
		this.camera.position.applyAxisAngle(up,-angle) // rotate around origin (around target)
		this.camera.position.add(this.target) // back into world space
		this.camera.rotateOnWorldAxis(up,-angle) // rotate the camere as well, so target stays in same spot

	}

	// rotate the camera around the target, so we rotate
	rotateUp(angle) {
		this.camera.position.sub(this.target) // make relative to the target
		// need to get the local right vector
		var rotationMatrix = new Matrix4().extractRotation(this.camera.matrixWorld);
		var right = new Vector3(1, 0, 0).applyMatrix4(rotationMatrix).normalize();


		this.camera.position.applyAxisAngle(right,-angle) // rotate around origin (around target)
		this.camera.position.add(this.target) // back into world space
		this.camera.rotateOnWorldAxis(right,-angle) // rotate the camere as well, so target stays in same spot


	}



}



export {  CameraMapControls };
