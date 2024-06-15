//////////////////////////////////////////////////////
///  DRAG AND DROP FILES?
import {addTracks} from "./TrackManager";
import {FileManager, NodeMan, setNewSitchText} from "./Globals";
import {SITREC_DEV_DOMAIN, SITREC_DOMAIN} from "../config";
import {getFileExtension, isSubdomain} from "./utils";
import {par} from "./par";
import {textSitchToObject} from "./RegisterSitches";

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
        dropZone.style.fontSize = '24px';
        dropZone.style.color = '#fff';
        dropZone.style.transition = 'background-color 0.2s';
        dropZone.style.pointerEvents = 'none';
        dropZone.style.zIndex = '9999'; // High z-index to overlay other elements
        dropZone.innerHTML = 'DROP FILES HERE';
        dropZone.style.visibility = 'hidden'; // Initially hidden

        document.body.appendChild(dropZone);

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

    showDropZone() {
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
// If a URL was dragged and dropped
        else {
            let url = dt.getData('text/plain');
            if (url) {
                console.log("LOADING DROPPED URL:" + url);
                this.uploadURL(url);

            }
        }
    }


    // If there are loaded files in the queue, then parse them
    checkDropQueue() {
        while (this.dropQueue.length > 0) {
            const drop = this.dropQueue.shift();
            this.parseResult(drop.filename, drop.result, drop.newStaticURL);
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

        console.log("### Uploading dropped file: " + file.name)

        // otherwise we load and then parse the file with the FileManager
        // and then decide what to do with it based on the file extension

        let promise = new Promise((resolve, reject) => {
            let reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onloadend = () => {
               // // console.log("Started rehost of dropped file"+file.name)
               //  Rehoster.rehostFile(file.name, reader.result).then(rehostResult => {
               //      console.log("Rehosted as " + rehostResult);
               //      resolve(rehostResult); // Resolve the promise
               //  }).catch(error => {
               //      console.warn("Unable to rehost file, error = " + error);
               //      reject(error); // Reject the promise
               //  });
               //  //console.log("Started PARSE of dropped file"+file.name)

                // parsing the result will happen BEFORE the rehost
                this.queueResult(file.name, reader.result, null);
            };
        });

        return promise;
    }



    uploadURL(url) {
        // Check if the URL is from the same domain we are hosting on
        // later we might support other domains, and load them via proxy
        const urlObject = new URL(url);
          if (!isSubdomain(urlObject.hostname, SITREC_DOMAIN)
              && !isSubdomain(urlObject.hostname, SITREC_DEV_DOMAIN)
              && !isSubdomain(urlObject.hostname, "amazonaws.com")
              )   {
            console.warn('The provided URL ' + urlObject.hostname +' is not from ' + SITREC_DOMAIN + " or " + SITREC_DEV_DOMAIN + "or amazonaws.com");
            return;
        }
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.arrayBuffer();
            })
            .then(buffer => {
                this.queueResult(url, buffer, url)
            })
            .catch(error => {
                console.log('There was a problem with the fetch operation:', error.message);
            });
    }


    queueResult(filename, result, newStaticURL) {
        this.dropQueue.push({filename: filename, result: result, newStaticURL: newStaticURL});
    }

    // a raw arraybuffer (result) has been loaded
    // parse the asset
    parseResult(filename, result, newStaticURL) {
        console.log("Parsing result of dropped file: " + filename)
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

                    this.handleParsedFile(filename, parsedFile);

                }
                console.log("parseResult: DONE Parse " + filename)
                par.renderOne = true;
            })
    }

    handleParsedFile(filename, parsedFile) {

        const fileManagerEntry = FileManager.list[filename];

        const fileExt = getFileExtension(filename);
        // very rough figuring out what to do with it
        // TODO: multiple TLEs, Videos, images.
        if (FileManager.detectTLE(filename)) {

            // remove any existing TLE (most likely the current Starlink, bout could be the last drag and drop file)
            FileManager.deleteIf(file => file.isTLE);

            fileManagerEntry.isTLE = true;
            NodeMan.get("NightSkyNode").replaceTLE(parsedFile)
        } else if (fileExt === "kml" || fileExt === "srt" || fileExt === "csv" || fileExt === "klv") {
            addTracks([filename], true)
        } else if (fileExt === "sitch.js") {
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
            setNewSitchText(copy)
        }
    }



}

export const DragDropHandler = new CDragDropHandler();
