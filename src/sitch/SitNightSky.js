import {Color, Vector3} from "../../three.js/build/three.module";
import {GlobalPTZ, gui, mainCamera, NodeMan, setMainCamera, Sit} from "../Globals";
import {CNodeView3D} from "../nodes/CNodeView3D";
import {CNodeGUIValue} from "../nodes/CNodeGUIValue";

import {SetupGUIFrames} from "../JetGUI";
import {initKeyboard, isKeyHeld} from "../KeyBoardHandler";
import {addDefaultLights} from "../lighting";
import {par} from "../par";
import {CNodeViewUI} from "../nodes/CNodeViewUI";
import {AddTimeDisplayToUI} from "../UIHelpers";
import {CNodeVideoWebCodecView} from "../nodes/CNodeVideoWebCodec";
import {GlobalDateTimeNode} from "../nodes/CNodeDateTime";
import {ViewMan} from "../nodes/CNodeView";
import {DragDropHandler} from "../DragDropHandler";
import JSURL from "../js/jsurl"
import {MV3} from "../threeExt";
import {isLocal, SITREC_SERVER} from "../../config";
import {FileManager} from "../CManager";
import {Rehoster} from "../CRehoster";
import {CNodeCameraControllerManualPosition} from "../nodes/CNodeCamera";
import {CNodeSwitch} from "../nodes/CNodeSwitch";


export const SitNightSky = {
    name: "nightsky",
    menuName: "Night Sky",

    azSlider: false,
    jetStuff: false,
    animated: true,
    nightSky: true,
    useGlobe: true,
    useDayNightGlobe: true,
    globeScale: 1,  // was defaulting to 0.99
    displayFrustum: true,
    frustumRadius: 500000,
    localLatLon: true,  // TODO - implement getting local - see code in CSituation.js, line 162

    showDateTime: true, // opens the DateTime folder in the UI

    farClip:    80000000,
    farClipNAR: 80000000,



    files: {

        // This is a DYNAMIC link, i.e. it will change
        // so if we make a permalink, we need to rehost this
        // So in the file manager we'll need to store the raw file
        // not just the parsed file.
        // we flag it as dynamic by prepending a !
        starLink: "!"+SITREC_SERVER+"proxy.php?url=https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle",

    },

    bigUnits: "Miles",

    fps: 30,
    frames: (10*60+50)*30,
    startTime: new Date().toISOString(),  // "2023-10-13T07:39:13.000Z",
    lookFOV: 10,


//    terrain: {lat: 36.208582, lon: -115.984598, zoom: 12, nTiles: 8},
  //terrain: {lat: 51.48, lon: -3.16, zoom: 12, nTiles: 8},

    lat: 51.48,
    lon: -3.16,

    fromLat: 51.48,
    fromLon: -3.16,

    fromAlt: 822,
    fromAltMin: 0,
    fromAltMax: 55000,

    // with a ptz setup, add showGUI:true to allow changing it
    // then can set it to false once the settings are locked in
    ptz: {az: 6.2, el: 9.8, fov: 32, showGUI: true},


    targetSpeedMax: 100,

    marks: [
        //       {LL: {lat:50.197944,lon:-5.428180}, width: 1, color:0xffff00},
    ],


    startCameraPosition:[2032347.51,19437577.30,23271391.24],
    startCameraTarget:[2032292.18,19436849.64,23270707.53],

    targetSize: 500,

    videoFile: "../sitrec-videos/private/Area6-1x-speed-08-05-2023 0644UTC.mp4",
//    syncVideoZoom: true,

    // overrides for video viewport
    videoView: {left: 0.5, top: 0, height: 0.5, width: -16 / 9 },

    setup2: function () {

        SetupGUIFrames()
        initKeyboard()

   //     addKMLTracks(["KMLTarget1", "KMLTarget2", "KMLTarget3"])

        // const ia = new CNodeImage({
        //     id: "ImageEditorView",
        //     filename: 'threePlanes',
        //     smooth: new CNodeGUIValue({id: "smooth", value: 20, start: 1, end: 200, step: 1, desc: "Filter"}, gui),
        //     draggable: true, resizable: true,
        //     left: 0.5, top: 0, width: -1280 / 714, height: 0.5,
        // })


        const view = new CNodeView3D({
            id: "mainView",
            left: 0.0, top: 0, width: 0.5, height: 1,
            draggable: false, resizable: false,
            fov: 50,
            doubleClickFullScreen: false,
            background: new Color('#132d44'),
            camera: this.mainCamera,
        })
        view.addOrbitControls(this.renderer);

        const viewLook = new CNodeView3D({
            id: "lookView",
            draggable: true, resizable: true,
            left: 0.5, top: 0, width: 0.5, height: 1,
            fov: 50,
            camera: this.lookCamera,
            doubleClickFullScreen: false,
            shiftDrag:true,
            freeAspect:true,
            background: new Color('#132d44'),
            ptzControls:true, // flag so dragging the view around will alter the ptz controls
        })
        //     viewLook.camera = this.lookCamera;
        viewLook.addOrbitControls(this.renderer);

//        NodeMan.get("lookCamera").addController("ManualPosition",{id:"manualController"})

        const cameraSwitch = new CNodeSwitch({
            id: "cameraSwitch",
            desc: "Camera Motion",
            inputs: {
                "Manual Position": new CNodeCameraControllerManualPosition ({
                    id: "manualController"
                }),
                // "XXX Position": new CNodeCameraControllerManualPosition ({
                //     id: "manual2Controller"
                // }),

            }
        }, gui)

        // cameraSwitch.addOption("YYY Position", new CNodeCameraControllerManualPosition ({
        //     id: "manual3Controller"
        // }))

        //cameraSwitch.removeOption("XXX Position")


        NodeMan.get("lookCamera").addControllerNode(cameraSwitch)

        DragDropHandler.addDropArea(view.div);
        DragDropHandler.addDropArea(viewLook.div);

        var labelVideo = new CNodeViewUI({id: "labelVideo", overlayView: viewLook});
        AddTimeDisplayToUI(labelVideo, 50,96, 2.5, "#f0f000")

        gui.add(par, 'mainFOV', 0.35, 150, 0.01).onChange(value => {
            this.mainCamera.fov = value
            this.mainCamera.updateProjectionMatrix()
        }).listen().name("Main FOV")

        addDefaultLights(Sit.brightness)

        setMainCamera(this.mainCamera)

        const lableMainViewPVS = new CNodeViewUI({id: "lableMainViewPVS", overlayView: ViewMan.list.mainView.data});
        lableMainViewPVS.addText("videoLablep1", "L = Lat/Lon from cursor",    10, 2, 1.5, "#f0f00080")
        lableMainViewPVS.addText("videoLablep2", ";&' or [&] ' advance start time", 12, 4, 1.5, "#f0f00080")
        lableMainViewPVS.addText("videoLablep3", "Drag and drop .txt or .tle files", 12, 6, 1.5, "#f0f00080")
        lableMainViewPVS.setVisible(true)

        gui.add(this, "makeNightSkyURL").name("Permalink")

    },

    makeNightSkyURL: function () {

        // first rehost the dynamic links, such as
        FileManager.rehostDynamicLinks().then(() => {


            // get the base of the URL (e.g. https://www.metabunk.org/sitrec/
            var url = window.location.href.split('?')[0];
            console.log(url)

            var p = mainCamera.position.clone()
            const v = new Vector3();
            v.setFromMatrixColumn(mainCamera.matrixWorld, 2);
            v.multiplyScalar(-1000)
            v.add(p)

            var _q = mainCamera.quaternion.clone();
            var q = {x: _q.x, y: _q.y, z: _q.z, w: _q.w}


            const nightSkyNode = NodeMan.get("NightSkyNode");

            const savePar = {
                olat: Sit.lat,
                olon: Sit.lon,
                lat: NodeMan.get("cameraLat").value,
                lon: NodeMan.get("cameraLon").value,
                alt: NodeMan.get("cameraAlt").value,
                startTime: Sit.startTime,
                az: GlobalPTZ.az,
                el: GlobalPTZ.el,
                fov: GlobalPTZ.fov,
                roll: GlobalPTZ.roll,
                p: p,
                //       v:v,
                u: mainCamera.up,
                q: q,
                f: par.frame,
                pd: par.paused,
                ssa: nightSkyNode.showSunArrows,
                sfr: nightSkyNode.showFlareRegion,
                ssn: nightSkyNode.showSatelliteNames,
            }

            // Wait just in case a file is still uploading
            // unlikely, but possible with a slow connection and.or large file
            Rehoster.waitForAllRehosts().then(() => {

                var rehostedFiles = []

                Object.keys(FileManager.list).forEach(key => {
                    const f = FileManager.list[key];
                    if (f.dynamicLink) {
                        rehostedFiles.push(f.staticURL)
                    }
                })


                savePar.rehostedFiles = rehostedFiles;
                savePar.rhs = FileManager.rehostedStarlink;


                // const JSONSave = JSON.stringify(savePar, null, 4)
                // console.log (JSONSave)

                const encodedURL = JSURL.stringify(savePar) + "_" // adding an underscore as twitter does not like trailing parenthsese
                console.log(encodedURL)

                // and add that to the base URL
                url += "?sitch=" + Sit.name + "&data=" + encodedURL;


                if (isLocal) {
                    // if it's different to the URL we have now
                    if (oldURL.localeCompare(url) != 0) {
                        // then push the current state, so we can go back
                        window.history.pushState({}, null, url);
                        oldURL = "" + url;
                    }
                } else {

// Assuming original_url is the URL you want to shorten

// URL-encode the original URL
                    var encoded_url = encodeURIComponent(url);

// Construct the URL for the PHP shortener
                    var shortenerUrl = SITREC_SERVER + "shortener.php?url=" + encoded_url;

// Fetch the shortened URL
                    fetch(shortenerUrl)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Network response was not ok: ' + response.statusText);
                            }
                            return response.text();
                        })
                        .then(shortenedUrl => {
                            // If the shortened URL is different from the current one
                            if (oldURL.localeCompare(shortenedUrl) !== 0) {
                                // Push the new state to the browser history
                                window.history.pushState({}, null, "https://" + shortenedUrl);
                                oldURL = "" + shortenedUrl;

                                console.log(shortenedUrl);
                            }
                        })
                        .catch(error => {
                            console.error("Error fetching shortened URL:", error);
                            // Some error, or not logged in
                            if (oldURL.localeCompare(url) != 0) {
                                // then push the current state, so we can go back
                                window.history.pushState({}, null, url);
                                oldURL = "" + url;
                            }
                        });

                }
            })
        })
    },

    parseURLDataBeforeSetup(data) {
        console.log("PARSING (BEFORE): "+data)
        const p = JSURL.parse(data)

        if (p.olat !== undefined) {
            Sit.lat = p.olat;
            Sit.lon = p.olon;
        } else {
            // for backwards compatibility, we just use the default lat/lon
            // somewhere in Wales
        }

    },

    parseURLDataAfterSetup(data) {
        console.log("PARSING (AFTER): "+data)
        const p = JSURL.parse(data)

        GlobalPTZ.az = p.az;
        GlobalPTZ.el = p.el;
        GlobalPTZ.fov = p.fov;
        GlobalPTZ.roll = p.roll;
        GlobalPTZ.refresh();
        NodeMan.get("cameraLat").value = p.lat;
        NodeMan.get("cameraLon").value = p.lon;
        NodeMan.get("cameraAlt").value = p.alt;
        NodeMan.get("cameraLat").recalculateCascade() // manual update

        mainCamera.up.copy(MV3(p.u));
        mainCamera.position.copy(MV3(p.p));
        // We (had) to use _x, _y, etc, as q is not a quaternion, it's just an object from the serialization
        // so it lacks the accessor methods to get x,y,z,w, but has members _x, _y, _z, _w
        mainCamera.quaternion.set(p.q.x, p.q.y, p.q.z, p.q.w)
        mainCamera.updateMatrixWorld();
        //mainCamera.lookAt(MV3(p.v));

        par.frame = p.f;
        par.paused = p.pd;

        Sit.startTime = p.startTime;
        GlobalDateTimeNode.populateFromUTCString(Sit.startTime)

        const nightSkyNode = NodeMan.get("NightSkyNode");
        if (p.ssa !== undefined) {
            nightSkyNode.showSunArrows = p.ssa;
            nightSkyNode.showFlareRegion = p.sfr;
            nightSkyNode.showSatelliteNames = p.ssn
            nightSkyNode.sunArrowGroup.visible = nightSkyNode.showSunArrows;
            nightSkyNode.flareRegionGroup.visible = nightSkyNode.showFlareRegion;
            nightSkyNode.satelliteTextGroup.visible = nightSkyNode.showSatelliteNames;
        }

        if (p.rehostedFiles !== undefined) {
           // Rehoster.rehostedFiles = p.rehostedFiles;
            /// we need a list of used URLs that are not in the sitch
            for (const url of p.rehostedFiles) {
                DragDropHandler.uploadURL(url)
            }
        }

        // ANY NEW parameters should be checked to see if they exist, for backwards compatibility.

        GlobalPTZ.refresh();
        // we do a par.renderOne to ensure the initial display looks good if we are paused.
        par.renderOne = true;
    },

    update: function(frame) {

    },
}

var oldURL = "";


