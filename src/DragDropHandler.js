//////////////////////////////////////////////////////
///  DRAG AND DROP FILES?
import {addTracks} from "./TrackManager";
import {FileManager, Globals, NodeMan, setNewSitchObject, Sit} from "./Globals";
import {cos, getFileExtension, isSubdomain, radians} from "./utils";
import {par} from "./par";
import {textSitchToObject} from "./RegisterSitches";
import {ModelFiles} from "./nodes/CNode3DObject";
import {LLAToEUS} from "./LLA-ECEF-ENU";
import {getLocalSouthVector, getLocalUpVector} from "./SphericalMath";
import {SITREC_DEV_DOMAIN, SITREC_DOMAIN} from "./configUtils";
import {doesKMLContainTrack, extractKMLObjects} from "./KMLUtils";
import {assert} from "./assert";
import {MISB} from "./MISBUtils";
import {findColumn} from "./ParseUtils";

// The DragDropHandler is more like the local client file handler, with rehosting, and parsing
class CDragDropHandler {

    constructor() {
        this.dropAreas = [];
        this.dropQueue = []; // Queue for dropped files that need parsing
    }

    addDropArea() {
        if (this.dropZone !== undefined) {
            console.warn("DropZone already exists");
            return;
        }
        this.dropZone = document.createElement('div');
        const dropZone = this.dropZone;
        dropZone.style.position = 'fixed';
        dropZone.style.top = '0';
        dropZone.style.left = '0';
        dropZone.style.width = '100vw';
        dropZone.style.height = '100vh';
        dropZone.style.display = 'flex';
        dropZone.style.justifyContent = 'center';
        dropZone.style.alignItems = 'center';
        dropZone.style.fontSize = '48px';
        dropZone.style.color = '#fff';
        dropZone.style.transition = 'background-color 0.2s, opacity 5s';
        dropZone.style.pointerEvents = 'none';
        dropZone.style.zIndex = '9999'; // High z-index to overlay other elements
        dropZone.innerHTML = 'DROP FILES <br>OR URLS<br>HERE';

        if (!Sit.initialDropZoneAnimation || Globals.fixedFrame !== undefined) {
            dropZone.style.visibility = 'hidden'; // Initially hidden
        }
        // 10px red border
        dropZone.style.border = '2px solid red';
        dropZone.style.boxSizing = 'border-box';


        document.body.appendChild(dropZone);

        // make it transition over 2 seconds from visible to invisible
        requestAnimationFrame(() => {
            dropZone.style.opacity = '0';
        })

        function handleDragOver(event) {
            event.preventDefault(); // Necessary to allow a drop
        }

        document.body.addEventListener('dragenter', (event) => {
            this.showDropZone();
        });

        document.body.addEventListener('dragover', handleDragOver);

        document.body.addEventListener('dragleave', (event) => {
            // Hide only if the cursor leaves the document
            if (event.relatedTarget === null) {
                this.hideDropZone();
            }
        });

        document.body.addEventListener('drop', this.onDrop.bind(this));
    }

    showDropZone(message) {
        if (message !== undefined) {
            this.dropZone.innerHTML = message;
        }
        this.dropZone.style.opacity = '1';
        this.dropZone.style.transition = 'background-color 0.2s, opacity 0.2s';
        this.dropZone.style.visibility = 'visible';
        this.dropZone.style.backgroundColor = 'rgba(0,0,0,0.5)';
        this.dropZone.style.pointerEvents = 'all'; // Enable pointer events when showing
    }

    hideDropZone() {
        this.dropZone.style.visibility = 'hidden';
        this.dropZone.style.backgroundColor = 'transparent';
        this.dropZone.style.pointerEvents = 'none'; // Disable pointer events when hidden
    }

    handlerFunction(event) {
        event.preventDefault()
    }

    onDrop(e) {
        this.dropQueue = [];
        e.preventDefault();
        this.hideDropZone();
        // we defer the checkDrop to a check in the main loop
        // to simplify debugging.
        const dt = e.dataTransfer;

        // If files were dragged and dropped
        if (dt.files && dt.files.length > 0) {
            console.log("LOADING DROPPED FILE:" + dt.files[0].name);
            for (const file of dt.files) {
                this.uploadDroppedFile(file, file.name);
            }
        }
// If a plain text snippet or URL was dragged and dropped
        else {
            let url = dt.getData('text/plain');
            if (url) {
                console.log("LOADING DROPPED text:" + url);
                // check if it's not a valid URL
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    this.uploadText(url);
                } else {

                    this.uploadURL(url);
                }
            }
        }
    }


    uploadDroppedFile(file) {
        // if it's a video file, that's handled differently
        // as we might (in the future) want to stream it
        if (file.type.startsWith("video")) {
            console.log("Loading dropped video file: " + file.name);
            if (!NodeMan.exists("video")) {
                console.warn("No video node found to load video file");
                return;
            }
            NodeMan.get("video").uploadFile(file);
            return;
        }

        console.log("")
        console.log("##############################################################")
        console.log("### Uploading dropped file: " + file.name)

        // otherwise we load and then parse the file with the FileManager
        // and then decide what to do with it based on the file extension

        let promise = new Promise((resolve, reject) => {
            let reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onloadend = () => {
                this.queueResult(file.name, reader.result, null);
            };
        });

        return promise;
    }



    async uploadURL(url) {
        // Check if the URL is from the same domain we are hosting on
        // later we might support other domains, and load them via proxy
        const urlObject = new URL(url);
        if (!isSubdomain(urlObject.hostname, SITREC_DOMAIN)
              && !isSubdomain(urlObject.hostname, SITREC_DEV_DOMAIN)
              && !isSubdomain(urlObject.hostname, "amazonaws.com")
              ) {
            // console.warn('The provided URL ' + urlObject.hostname +' is not from ' + SITREC_DOMAIN + " or " + SITREC_DEV_DOMAIN + "or amazonaws.com");

            // for non-local URLS, we check for info in the URL itself, like a lat, lon, alt location

            let lat, lon;
            let alt = 30000;    // default altitude (meters)

            const mainCamera = NodeMan.get("mainCamera").camera;

            // check from Google Maps URLs, and extract the location
            if (urlObject.hostname === "www.google.com" && urlObject.pathname.startsWith("/maps")) {

                // example URL from Google Maps
                // https://www.google.com/maps/place/Santa+Monica,+CA/@33.9948301,-118.4615695,67a,35y,116.89h,8.32t/data

                // first get the string after the @ from the string url, and split it by the comma
                const afterAt = url.split("@")[1].split("/data")[0];
                const parts = afterAt.split(",");
                if (parts.length > 1) {
                    const lat = parseFloat(parts[0]);
                    const lon = parseFloat(parts[1]);


                    // if part[2] ends in "m" or "a" then it's the vertical span of the map
                    // from that we can work out the altitude
                    if (parts[2].endsWith("m") || parts[2].endsWith("a")) {
                        const span = parseFloat(parts[2].slice(0, -1));
                        // given the camera Vertical FOV, we can work out the altitude
                        const vFOV = mainCamera.fov * Math.PI / 180;
                        alt = span / 2 / Math.tan(vFOV / 2);
                    }

                    console.log("Google Maps URL detected, extracting location: " + lat + ", " + lon, " Altitude: " + alt);

                }
            }


            // ADSBx example URL
            // https://globe.adsbexchange.com/?replay=2024-12-30-23:54&lat=39.948&lon=-73.938&zoom=11.8
            if (urlObject.hostname === "globe.adsbexchange.com") {
                lat = parseFloat(urlObject.searchParams.get("lat"));
                lon = parseFloat(urlObject.searchParams.get("lon"));
                let zoom = parseFloat(urlObject.searchParams.get("zoom"));

                // convert zoom to altitude
                // by first converting it to a tile size in meters
                let circumference = 40075000*cos(radians(lat));
                let span = circumference/Math.pow(2,zoom-1)
                const vFOV = mainCamera.fov * Math.PI / 180;
                alt = span / 2 / Math.tan(vFOV / 2);

            }

            // FR24 example URL
            // https://www.flightradar24.com/38.73,-120.56/9
            if (urlObject.hostname === "www.flightradar24.com") {
                let latlon = urlObject.pathname.split("/")[1];
                lat = parseFloat(latlon.split(",")[0]);
                lon = parseFloat(latlon.split(",")[1]);
                let zoom = parseFloat(urlObject.pathname.split("/")[2]);

                // convert zoom to altitude
                // by first converting it to a tile size in meters
                let circumference = 40075000*cos(radians(lat));
                let span = circumference/Math.pow(2,zoom-1)
                const vFOV = mainCamera.fov * Math.PI / 180;
                alt = span / 2 / Math.tan(vFOV / 2);
            }




            if (lat !== undefined && lon !== undefined) {
                this.droppedLLA(lat, lon, alt)
            }

            return;
        }

        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.arrayBuffer();
            })
            .then(buffer => {
                console.log(`Fetched ${url} successfully, queueing result for parsing`)
                this.queueResult(url, buffer, url)
            })
            .catch(error => {
                console.log('There was a problem with the fetch operation:', error.message);
            });
    }

    // dragged in a text snippet
    // check if it's a lat, lon, alt or just a lat, lon
    // 38.73,-120.56,100000 , or 38.73,-120.56
    uploadText(text) {
        // most likely LL or LLA
        const numbers = text.split(/[\s,]+/).map(parseFloat);
        if (numbers.length === 2) {
            // it's a lat, lon
            this.droppedLLA(numbers[0], numbers[1], 0);
        } else
        if (numbers.length === 3) {
            // it's a lat, lon, alt
            this.droppedLLA(numbers[0], numbers[1], numbers[2]);
        } else {
            console.log("Unhandled text snippet: " + text);
        }
    }


    droppedLLA(lat, lon, alt) {
        const mainCamera = NodeMan.get("mainCamera").camera;
        const camPos = LLAToEUS(lat, lon, alt);

        const target = LLAToEUS(lat, lon, 0);

        const up = getLocalUpVector(camPos);
        const south = getLocalSouthVector(camPos);
        camPos.add(south.clone().multiplyScalar(100)); // move camera 100 meter south, just so we orient norht

        // set the position to the target
        mainCamera.position.copy(camPos);
        // Set up to local up
        mainCamera.up.copy(up);
        // and look at the track point
        mainCamera.lookAt(target);
    }

    // Add a loaded file to the drop queue for later parsing
    // we do this from within the dragDropHandler event handler,
    // so we can control when the parsing happens in the event loop
    // and make it easier to debug (PHPStorm tends to break on debugging async event calls)
    // @param {string} filename - The name of the file
    // @param {ArrayBuffer} result - The raw file data
    // @param {string|null} newStaticURL - The static URL for the file, if applicable
    queueResult(filename, result, newStaticURL) {
        this.dropQueue.push({filename: filename, result: result, newStaticURL: newStaticURL});
    }

    // If there are loaded files in the queue, then parse them
    // this is called from the main loop
    // to allow for debugging
    checkDropQueue() {
        while (this.dropQueue.length > 0) {
            const drop = this.dropQueue.shift();
            this.parseResult(drop.filename, drop.result, drop.newStaticURL);
        }
    }


    // a raw arraybuffer (result) has been loaded
    // parse the asset
    // and then handle the parsed file
    // @param {string} filename - The name of the file
    // @param {ArrayBuffer} result - The raw file data
    // @param {string|null} newStaticURL - The static URL for the file, if applicable
    parseResult(filename, result, newStaticURL) {
        FileManager.parseAsset(filename, filename, result)
            .then(parsedResult => {
                
                // Rehosting would be complicated with multiple results. Ignored for now.
                // Maybe we need a FILE manager and an ASSET manager
                // we'll rehost files, not assets

                // parsing an asset file can return a single result,
                // or an array of one or more results (like with a zip file)
                // for simplicity, if it's a single result we wrap it in an array
                if (!Array.isArray(parsedResult))
                    parsedResult = [parsedResult]

                for (const x of parsedResult) {
                    FileManager.remove(x.filename); // allow reloading.
                    FileManager.add(x.filename, x.parsed, result)
                    const fileManagerEntry = FileManager.list[x.filename];
                    fileManagerEntry.dynamicLink = true;
                    fileManagerEntry.filename = x.filename;
                    fileManagerEntry.staticURL = newStaticURL;
                    fileManagerEntry.dataType = x.dataType;

                    const parsedFile = x.parsed;
                    const filename = x.filename;

                    NodeMan.suspendRecalculate()
                    this.handleParsedFile(filename, parsedFile);
                    NodeMan.unsuspendRecalculate();

                }
                console.log("parseResult: DONE Parse " + filename)
                par.renderOne = true;
            })
    }

    // handle the parsed file
    // this is where we decide what to do with the file
    // based on the file extension and the data type
    // @param {string} filename - The name of the file
    // @param {ArrayBuffer} parsedFile - The parsed file data (from parseResult)
    handleParsedFile(filename, parsedFile) {

        const fileManagerEntry = FileManager.list[filename];

        const fileExt = getFileExtension(filename);

        if (filename.split('.').length === 1) {
            console.warn("Skipping handleParseFile, as no file extension for " + filename+" assuming it's an ID");
            return;
        }

        // if it's a CSV, the first check if it contails AZ and EL
        // if it does, then we want to send it to the customAzElController node
        if (fileExt === "csv") {
            const azCol = findColumn(parsedFile, "Az", true);
            const elCol = findColumn(parsedFile, "El", true);
            const zoomCol = findColumn(parsedFile, "Zoom", true);

            // strip the first row
            // as it's the header
            // and we don't want to send it to the customAzElController
            parsedFile = parsedFile.slice(1);

            if (azCol !== -1 || elCol !== -1 || zoomCol !== -1) {
                // it's a CSV with az and el
                // so we want to send it to the customAzElController node

                const azElController = NodeMan.get("customAzElController", false)
                if (azElController) {
                    azElController.setAzFile(parsedFile, azCol );
                    azElController.recalculate();
                }
            }
            return;
        }


        // very rough figuring out what to do with it
        // TODO: multiple TLEs, Videos, images.
        if (FileManager.detectTLE(filename)) {

            // remove any existing TLE (most likely the current Starlink, bout could be the last drag and drop file)
            FileManager.deleteIf(file => file.isTLE);

            fileManagerEntry.isTLE = true;
            NodeMan.get("NightSkyNode").replaceTLE(parsedFile)
        } else {
            let isATrack = false;
            let isASitch = false;
            if (fileManagerEntry.dataType === "json" || fileExt === "kml" || fileExt === "srt" || fileExt === "csv" || fileExt === "klv") {
                isATrack = true;
            }

            // kml files might not contain a track
            if (fileExt === "kml") {
                isATrack = doesKMLContainTrack(parsedFile)
            }


            if (fileManagerEntry.dataType === "sitch") {
                isASitch = true;
            }

            if (isATrack) {
                addTracks([filename], true)
                if (fileExt === "kml") {
                    console.log("KML file detected, adding anything else in the file")
                    extractKMLObjects(parsedFile)
                }
                return
            } else if (isASitch) {
                // parsedFile is a sitch text def
                // make a copy of the string (as we might be removing all the files)
                // and set it as the new sitch text
                let copy = parsedFile.slice();
                // if it's an arraybuffer, convert it to a sitch object
                if (copy instanceof ArrayBuffer) {
                    const decoder = new TextDecoder('utf-8');
                    const decodedString = decoder.decode(copy);
                    copy = textSitchToObject(decodedString);
                }
                setNewSitchObject(copy)
                return;
            } else if (fileExt === "glb") {
                // it's a model, so we can replace the model used in targetModel
                // we have filename, and we can just set
                ModelFiles[filename] = {file: filename};
                if (NodeMan.exists("targetObject")) {
                    const target = NodeMan.get("targetObject");
                    target.modelOrGeometry = "model"
                    target.selectModel = filename;
                    target.rebuild();
                    // woudl also need to add it to the gui
                }
                return;


            }

            if (fileExt === "kml") {
                console.log("KML file detected, adding anything else in the file")
                extractKMLObjects(parsedFile)
                return;
            }

            // is it an image?
            if (fileExt === "jpg" || fileExt === "jpeg" || fileExt === "png" || fileExt === "gif") {
                // it's an image, so we want to make a video that's a single frame
                if (!NodeMan.exists("video")) {
                    console.warn("No video node found to load video file");
                    return;
                }
                NodeMan.get("video").makeImageVideo(filename, parsedFile, true);
                return;
            }

            console.warn("Unhandled file type: " + fileExt + " for " + filename);


        }
    }



}

export const DragDropHandler = new CDragDropHandler();
