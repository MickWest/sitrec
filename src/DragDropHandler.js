//////////////////////////////////////////////////////
///  DRAG AND DROP FILES?
import {addTracks} from "./TrackManager";
import {FileManager, NodeMan, setNewSitchText} from "./Globals";
import {SITREC_DEV_DOMAIN, SITREC_DOMAIN, SITREC_SERVER} from "../config";
import {getFileExtension, isSubdomain} from "./utils";
import {par} from "./par";
import {textSitchToObject} from "./RegisterSitches";

// The DragDropHandler is more like the local client file handler, with rehosting, and parsing
class CDragDropHandler {

    constructor() {
        this.dropAreas = [];
    }

    addDropArea(dropArea) {
        dropArea.addEventListener('dragenter', this.handlerFunction, false)
        dropArea.addEventListener('dragleave', this.handlerFunction, false)
        dropArea.addEventListener('dragover', this.handlerFunction, false)
        dropArea.addEventListener('drop', e => this.onDrop(e), false)
    }

    handlerFunction(event) {
        event.preventDefault()
    }

    onDrop(e) {
        e.preventDefault();
        let dt = e.dataTransfer;

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

    uploadDroppedFile(file) {
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
                this.parseResult(file.name, reader.result, null);
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
                this.parseResult(url, buffer, url)
            })
            .catch(error => {
                console.log('There was a problem with the fetch operation:', error.message);
            });
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
                    const fileExt = getFileExtension(x.filename);

                    // very rough figuring out what to do with it
                    // TODO: multiple TLEs, Videos, images.
                    if (FileManager.detectTLE(filename)) {

                        // remove any existing TLE (most likely the current Starlink, bout could be the last drag and drop file)
                        FileManager.deleteIf(file => file.isTLE);

                        fileManagerEntry.isTLE = true;
                        NodeMan.get("NightSkyNode").replaceTLE(x.parsed)
                    } else if (fileExt === "kml" || fileExt === "srt" || fileExt === "csv" || fileExt === "klv") {
                        addTracks([x.filename], true)
                    } else if (fileExt === "sitch.js") {
                        // x.parsed is a sitch text def
                        // make a copy of the string (as we might be removing all the files)
                        // and set it as the new sitch text
                        let copy = x.parsed.slice();
                        // if it's an arraybuffer, convert it to a sitch object
                        if (copy instanceof ArrayBuffer) {
                            const decoder = new TextDecoder('utf-8');
                            const decodedString = decoder.decode(copy);
                            copy = textSitchToObject(decodedString);
                        }
                        setNewSitchText(copy)
                    }
                }
                console.log("parseResult: DONE Parse " + filename)
                par.renderOne = true;
            })
    }
}

export const DragDropHandler = new CDragDropHandler();
