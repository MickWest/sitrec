import { Vector3} from "../../three.js/build/three.module";
import {gui, NodeMan, Sit, GlobalDateTimeNode, Globals, FileManager} from "../Globals";
import {par} from "../par";
import {CNodeViewUI} from "../nodes/CNodeViewUI";
import {AddTimeDisplayToUI} from "../UIHelpers";
import {ViewMan} from "../nodes/CNodeView";
import {DragDropHandler} from "../DragDropHandler";
import JSURL from "../js/jsurl"
import {MV3} from "../threeExt";
import {isLocal, SITREC_SERVER} from "../../config";
import {Rehoster} from "../CRehoster";
import {CNodeSwitch} from "../nodes/CNodeSwitch";
import {CNodeControllerManualPosition} from "../nodes/CNodeControllerVarious";
import {assert} from "../utils";
import {asyncCheckLogin} from "../login";


export const SitNightSky = {
    name: "nightsky",
    menuName: "Night Sky / Starlink",


    showDateTime: true, // opens the DateTime folder in the UI

    farClipLook: 80000000,



    files: {

        // This is a DYNAMIC link, i.e. it will change
        // so if we make a permalink, we need to rehost this
        // So in the file manager we'll need to store the raw file
        // not just the parsed file.
        // we flag it as dynamic by prepending a !
        starLink: "!"+SITREC_SERVER+"proxy.php?url=https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle",

    },

    units: "Imperial",

    fps: 30,
    frames: (10*60+50)*30,
    startTime: new Date().toISOString(),  // "2023-10-13T07:39:13.000Z",
    lookCamera: {
        fov: 10,
    },

    lat: 51.48,
    lon: -3.16,

    // with a ptz setup, add showGUI:true to allow changing it
    // then can set it to false once the settings are locked in
    ptz: {az: 6.2, el: 9.8, fov: 32, roll:0, showGUI: true},

    lookPosition: { fromLat: 51.48, fromLon: -3.16, fromAltFeet: 822, fromAltFeetMin: 0, fromAltFeetMax: 55000,},

    targetSpeedMax: 100,

    marks: [
        //       {LL: {lat:50.197944,lon:-5.428180}, width: 1, color:0xffff00},
    ],


    mainCamera: {
        far: 80000000,
        startCameraPosition: [2032347.51, 19437577.30, 23271391.24],
        startCameraTarget: [2032292.18, 19436849.64, 23270707.53],
    },

    targetSize: 500,

    videoFile: "../sitrec-videos/private/Area6-1x-speed-08-05-2023 0644UTC.mp4",

    mainView: {left: 0.0, top: 0, width: 0.5, height: 1, background: '#132d44'},
    lookView: {left: 0.5, top: 0, width: 0.5, height: 1,
        ptzControls:true, // flag so dragging the view around will alter the ptz controls
    },

    DisplayCameraFrustum: {radius: 500000, lineWeight: 1.0, color: "white"},


    nightSky: true,
    useGlobe: true,
    useDayNightGlobe: true,
    globeScale: 1,  // was defaulting to 0.99
    localLatLon: true,


    setup2: function () {


        const cameraSwitch = new CNodeSwitch({
            id: "cameraSwitch",
            desc: "Camera Motion",
            inputs: {
                "Manual Position": new CNodeControllerManualPosition ({
                    id: "manualController"
                }),
                // "XXX Position": new CNodeControllerManualPosition ({
                //     id: "manual2Controller"
                // }),

            }
        }, gui)

        // cameraSwitch.addOption("YYY Position", new CNodeControllerManualPosition ({
        //     id: "manual3Controller"
        // }))

        //cameraSwitch.removeOption("XXX Position")

        NodeMan.get("lookCamera").addControllerNode(cameraSwitch)

        const view = NodeMan.get("mainView");
        const viewLook = NodeMan.get("lookView");

        DragDropHandler.addDropArea(view.div);
        DragDropHandler.addDropArea(viewLook.div);

        var labelVideo = new CNodeViewUI({id: "labelVideo", overlayView: viewLook});
        AddTimeDisplayToUI(labelVideo, 50,96, 2.5, "#f0f000")


        const labelMainViewPVS = new CNodeViewUI({id: "labelMainViewPVS", overlayView: ViewMan.list.mainView.data});
        labelMainViewPVS.addText("videoLabelp1", "L = Lat/Lon from cursor",    10, 2, 1.5, "#f0f00080")
        labelMainViewPVS.addText("videoLabelp2", ";&' or [&] ' advance start time", 12, 4, 1.5, "#f0f00080")
        labelMainViewPVS.addText("videoLabelp3", "Drag and drop .txt or .tle files", 12, 6, 1.5, "#f0f00080")
        labelMainViewPVS.setVisible(true)

        par.validPct = 100;
        labelMainViewPVS.addText("videoLabelInRange", "xx",    92, 2, 1.5, "#f0f00080").update(function() {
            this.text = "In Range:" + par.validPct.toFixed(1) + "%"
        });

        if (Globals.userID > 0)
            this.permaButton = gui.add(this, "makeNightSkyURL").name("Permalink")
        else {
            this.permaButton = gui.add(this, "loginAttempt").name("Permalink DISABLED (click to log in)")

        }
    },


    loginAttempt: function() {
        asyncCheckLogin().then(() => {
            if (Globals.userID > 0) {
                this.permaButton.name("Permalink")
                return this.makeNightSkyURL();
            }

            // open the login URL in a new window
            // the redirect takes that tab to the main page
            window.open("https://www.metabunk.org/login?_xfRedirect=https://www.metabunk.org/sitrec/sitrecServer/successfullyLoggedIn.html  ", "_blank");

            // When the current window regains focus, we'll check if we are logged in
            // and if we are, we'll make the permalink
            window.addEventListener('focus', () => {
                asyncCheckLogin().then(() => {
                    if (Globals.userID > 0) {
                        // just change the button text
                        this.permaButton.name("Permalink")
               //         return this.makeNightSkyURL();
                    }
                });
            });

        })
    },

    makeNightSkyURL: function () {


        // first rehost the dynamic links, such as
        FileManager.rehostDynamicLinks().then(() => {

            // get the base of the URL (e.g. https://www.metabunk.org/sitrec/
            var url = window.location.href.split('?')[0];
            console.log(url)

            const mainCam = NodeMan.get("mainCamera").camera;

            var p = mainCam.position.clone()
            const v = new Vector3();
            v.setFromMatrixColumn(mainCam.matrixWorld, 2);
            v.multiplyScalar(-1000)
            v.add(p)

            var _q = mainCam.quaternion.clone();
            var q = {x: _q.x, y: _q.y, z: _q.z, w: _q.w}

            const nightSkyNode = NodeMan.get("NightSkyNode");

            const lookPTZ = NodeMan.get("lookCameraPTZ");
            assert(lookPTZ !== undefined, "lookCameraPTZ not found");

            const savePar = {
                olat: Sit.lat,
                olon: Sit.lon,
                lat: NodeMan.get("cameraLat").value,
                lon: NodeMan.get("cameraLon").value,
                alt: NodeMan.get("cameraAlt").value,
                startTime: Sit.startTime,
                az: lookPTZ.az,
                el: lookPTZ.el,
                fov: lookPTZ.fov,
                roll: lookPTZ.roll,
                p: p,
                //       v:v,
                u: mainCam.up,
                q: q,
                f: par.frame,
                pd: par.paused,
                ssa: nightSkyNode.showSunArrows,
                sfr: nightSkyNode.showFlareRegion,
                ssn: nightSkyNode.showSatelliteNames,
            }

            if (Sit.simSpeed !== 1) {
                savePar.spd = Sit.simSpeed;
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

        const lookPTZ = NodeMan.get("lookCameraPTZ");
        assert(lookPTZ !== undefined, "lookCameraPTZ not found");

        lookPTZ.az = p.az;
        lookPTZ.el = p.el;
        lookPTZ.fov = p.fov;
        lookPTZ.roll = p.roll ?? 0;
        lookPTZ.refresh();
        NodeMan.get("cameraLat").value = p.lat;
        NodeMan.get("cameraLon").value = p.lon;
        NodeMan.get("cameraAlt").value = p.alt;
        NodeMan.get("cameraLat").recalculateCascade() // manual update

        const mainCam = NodeMan.get("mainCamera").camera;
        mainCam.up.copy(MV3(p.u));
        mainCam.position.copy(MV3(p.p));
        // We (had) to use _x, _y, etc, as q is not a quaternion, it's just an object from the serialization
        // so it lacks the accessor methods to get x,y,z,w, but has members _x, _y, _z, _w
        mainCam.quaternion.set(p.q.x, p.q.y, p.q.z, p.q.w)
        mainCam.updateMatrixWorld();
        //mainCam.lookAt(MV3(p.v));

        par.frame = p.f;
        par.paused = p.pd;

        Sit.startTime = p.startTime;
        GlobalDateTimeNode.populateStartTimeFromUTCString(Sit.startTime)

        const nightSkyNode = NodeMan.get("NightSkyNode");
        if (p.ssa !== undefined) {
            nightSkyNode.showSunArrows = p.ssa;
            nightSkyNode.showFlareRegion = p.sfr;
            nightSkyNode.showSatelliteNames = p.ssn
            nightSkyNode.sunArrowGroup.visible = nightSkyNode.showSunArrows;
            nightSkyNode.flareRegionGroup.visible = nightSkyNode.showFlareRegion;
            nightSkyNode.satelliteTextGroup.visible = nightSkyNode.showSatelliteNames;
        }

        // Sim Speed
        if (p.spd !== undefined) {
            Sit.simSpeed = p.spd;
        }

        if (p.rehostedFiles !== undefined) {
           // Rehoster.rehostedFiles = p.rehostedFiles;
            /// we need a list of used URLs that are not in the sitch
            for (const url of p.rehostedFiles) {
                DragDropHandler.uploadURL(url)
            }
        }

        // ANY NEW  should be checked to see if they exist, for backwards compatibility.

        // we do a par.renderOne to ensure the initial display looks good if we are paused.
        par.renderOne = true;
    },

    update: function(frame) {

    },
}

var oldURL = "";


