import {
    areArrayBuffersEqual, arrayBufferToString,
    assert,
    cleanCSVText,
    getFileExtension,
    isHttpOrHttps, stringToArrayBuffer,
    versionString
} from "./utils";
import JSZip from "./js/jszip";
import {parseSRT, parseXml} from "./KMLUtils";
import {SITREC_ROOT, SITREC_SERVER, isConsole} from "../config";
import {Rehoster} from "./CRehoster";
import {CManager} from "./CManager";
import {Globals, gui} from "./Globals";
import {DragDropHandler} from "./DragDropHandler";
import {parseAirdataCSV} from "./ParseAirdataCSV";
import {parseKLVFile, parseMISB1CSV} from "./MISBUtils";
// when running as a console app jQuery's $ is not available, so load just the csv plugin separately
import csv from "./js/jquery.csv.js";
import {asyncCheckLogin} from "./login";

// The file manager is a singleton that manages all the files
// it is a subclass of CManager, which is a simple class that manages a list of objects
// the FileManager adds the ability to load files from URLs, and to parse them
// it also adds the ability to rehost files, needed for the Celestrack proxy and for TLEs
// an KMLs, and other data files that are dragged in.
export class CFileManager extends CManager {
    constructor() {
        super()
        this.rawFiles = [];
        this.rehostedStarlink = false;

        if (!isConsole) {
            this.guiFolder = gui.addFolder("FileManager (User:" + Globals.userID + ")").perm().close();

            // custom sitches and rehosting only for logged-in users
            if (Globals.userID > 0) {
                this.guiFolder.add(this, "importFile").name("Rehost File").perm();
                this.guiFolder.add(this, "openDirectory").name("Open Local Sitch folder").perm();
            }

            let textSitches = [];
            fetch((SITREC_SERVER + "getsitches.php?get=myfiles"), {mode: 'cors'}).then(response => response.text()).then(data => {
                console.log("Local files: " + data)
                let localfiles = JSON.parse(data) // will give an array of local files
            })

            // if (Globals.userID > 0)
            //     this.permaButton = gui.add(this, "exportSitch").name("Export Custom Sitch").perm()
            // else {
            //     this.permaButton = gui.add(this, "loginAttempt").name("Permalink DISABLED (click to log in)")
            // }

        }
    }

    exportSitch() {
        //
    }

    loginAttempt(callback) {
        asyncCheckLogin().then(() => {
            if (Globals.userID > 0) {
                this.permaButton.name("Permalink")
                if (callback !== undefined)
                    callback();
                return ;
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
    }



    makeExportButton(object, functionName, name) {
        if (this.exportFolder === undefined)
            this.exportFolder = this.guiFolder.addFolder("Export").perm()

        return this.exportFolder.add(object, functionName).name(name);

    }

    async openDirectory() {
        try {
            // This will show the directory picker dialog.
            this.directoryHandle = await window.showDirectoryPicker();

            // You can now access the files in the directory.
            for await (const entry of this.directoryHandle.values()) {
                console.log(entry);
                // if it's a Sit????.js file, then load it like in importFile
                if (entry.name.startsWith("Sit") && entry.name.endsWith(".js")) {

                    if (this.localSitchEntry === undefined) {
                        this.guiFolder.add(this, "rehostSitch").name("Rehost Local Sitch").perm();
                    }

                    this.localSitchEntry = entry;
                    this.checkForNewLocalSitch();
                    break;
                }
            }

            // To retain the directory handle for future access, store it in IndexedDB or elsewhere.
        } catch (err) {
            console.error(err.name, err.message);
        }
    }

    async checkForNewLocalSitch() {

        // load the local sitch and see if it has changed
        const file = await this.localSitchEntry.getFile();
        this.localSitchBuffer = await file.arrayBuffer();
//        console.log("CHECKING CONTENTS OF Local Sitch " + file.name);

        if (this.lastLocalSitchBuffer === undefined ||
            !areArrayBuffersEqual(this.lastLocalSitchBuffer, this.localSitchBuffer)) {
            this.lastLocalSitchBuffer = this.localSitchBuffer;
            DragDropHandler.parseResult(file.name, this.localSitchBuffer);
        }

        setTimeout(() => this.checkForNewLocalSitch(), 500);
    }



    importFile() {
        // Create an input element
        const inputElement = document.createElement('input');

        // Set its type to 'file'
        inputElement.type = 'file';

        // Listen for changes on the input element
        inputElement.addEventListener('change', (event) => {
            // Get the selected file
            const file = event.target.files[0];

            // Create a FileReader to read the file
            const reader = new FileReader();

            // Listen for the 'load' event on the FileReader
            reader.addEventListener('load', () => {
                // When the file has been read, parse it as an asset
                Rehoster.rehostFile(file.name, reader.result).then(rehostResult => {
                   console.log("Imported File Rehosted as " + rehostResult);
                 //   DragDropHandler.parseResult(file.name, reader.result);
                    // display an alert with the new URL so the user can copy it
                    //alert(rehostResult);
                    createCustomModalWithCopy(rehostResult)();

                });

            });

            // Read the file as an array buffer (binary data)
            reader.readAsArrayBuffer(file);
        });

        // Trigger a click event on the input element
        inputElement.click();

    }


    rehostSitch() {
        // rehosting a sitch is done when we have a local sitch file
        // and (possibly) local assets that need to be rehosted
        // we can then rehost them all and then reload the sitch
        //
        // the sitch itself will be in this.localSitchBuffer
        // and any local assets will be in this.localAssets
        // we will need to rehost them all, and alter the sitch to point to the new URLs
        // in the Sit.file object

        let sitchString = arrayBufferToString(this.localSitchBuffer);

        // first rehost the files, so we can see what their new URLs are
        this.iterate( (key, parsed) => {
            const f = this.list[key];
            assert(f.staticURL !== undefined, "File " + key + " has undefined staticURL");
            if (f.staticURL === null) {
                Rehoster.rehostFile(f.filename, f.original).then((staticURL) => {
                    f.staticURL = staticURL;

                    // now replace the original filename in this.localSitchBuffer
                    // with the new URL, but only if it's in quotes
                    const rehostedURL = f.staticURL;
                    const rehostedFilename = f.filename;
                    const rehostedFilenameQuoted = '"' + rehostedFilename + '"';
                    const rehostedURLQuoted = '"' + rehostedURL + '"';
                    console.log ("replacing " + rehostedFilenameQuoted + " with " + rehostedURLQuoted)
                    sitchString = sitchString.replaceAll(rehostedFilenameQuoted, rehostedURLQuoted);
//                    console.log(sitchString)

                    // and again with single quotes, just in case
                    const rehostedFilenameSingleQuoted = "'" + rehostedFilename + "'";
                    const rehostedURLSingleQuoted = "'" + rehostedURL + "'";
                    sitchString = sitchString.replaceAll(rehostedFilenameSingleQuoted, rehostedURLSingleQuoted);
                })
            }
        })

        // wait for all the files to be rehosted
        // then rehost the sitch

        Rehoster.waitForAllRehosts().then(() => {
            this.localSitchBuffer = stringToArrayBuffer(sitchString);

            // all files have been rehosted, so now we can rehost the sitch
            Rehoster.rehostFile(this.localSitchEntry.name, this.localSitchBuffer).then((staticURL) => {
                console.log("Sitch rehosted as " + staticURL);

                // and make a URL that points to the new sitch
                let customLink = SITREC_ROOT + "?custom=" + staticURL;

                createCustomModalWithCopy(customLink)();
            })
        })

    }

    // general file asset loader, detect file type from extension and add to manager
    // returns a promise, which you can then await
    loadAsset(filename, id) {

        var dynamicLink = false;
        if (filename.startsWith("!")) {
            filename = filename.substring(1);
            dynamicLink = true;
        }

        // If we don't have an id, then the id used will be the filename
        // so see if already loaded
        if (id === undefined) {
            if (this.exists(filename)) {
                return Promise.resolve(this.get(filename));
            }
            id = filename; // Fallback to use filename as id if id is undefined
        }

        // if we are going to try to load it,
        assert(!this.exists(id), "Asset " + id + " already exists");

        // If it has no forward slash, then it's a local file
        // and will be in the this.directoryHandle folder
        if (!filename.includes("/")) {
            assert(this.directoryHandle !== undefined, "No directory handle for local file")
            return this.directoryHandle.getFileHandle(filename).then(fileHandle => {
                return fileHandle.getFile().then(file => {
                    return file.arrayBuffer().then(arrayBuffer => {
                        return this.parseAsset(filename, id, arrayBuffer).then(parsedAsset => {
                            // We now have a full parsed asset in a {filename: filename, parsed: parsed} structure
                            this.add(id, parsedAsset.parsed, arrayBuffer); // Add the loaded and parsed asset to the manager
                            this.list[id].dynamicLink = false;
                            this.list[id].staticURL = null; // indicates it has NOT been rehosted
                            this.list[id].filename = filename
                            return parsedAsset; // Return the asset for further chaining if necessary
                        });
                    });
                });
            });
        }

        // if not a local file, then it's a URL
        // either a dynamic link (like to the current Starlink TLE) or a static link
        // so fetch it and parse it

        var isUrl = isHttpOrHttps(filename);
        if (!isUrl) {
            // if it's not a url, then redirect to the data folder
            //filename = "./data/" + filename;
            filename = SITREC_ROOT + "data/" + filename;
        }

        Globals.parsing++;
        console.log(">>> loadAsset() Loading Started: " + filename+ " GlobPars=" + Globals.parsing + " id=" + id);


        var bufferPromise = null;
        if(!isUrl && isConsole) {
            // read the asset from the local filesystem if this is not running inside a browser
            bufferPromise = import('node:fs')
            .then(fs => {
                return fs.promises.readFile(filename);
            });
        } else {
            bufferPromise = fetch(filename + "?v=1" + versionString)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.arrayBuffer(); // Return the promise for the next then()
            })
        }

        var original = null;
        return bufferPromise
            .then(arrayBuffer => {
                // parseAsset always returns a promise
                console.log("<<< loadAsset() Loading Finished: " + filename + " id=" + id);

                //if (dynamicLink)
                // always store the original
                    original = arrayBuffer;
                //else
                //    original = null;

                const assetPromise = this.parseAsset(filename, id, arrayBuffer);
                return assetPromise;

            })
            .then(parsedAsset => {

                // if an array is returned, we just assume it's the first one
                // because we are adding by id here, not by filename
                // so if it's a zipped assest, it should only be one
                if (Array.isArray(parsedAsset)) {
                    assert(parsedAsset.length === 1, "Zipped IDed asset contains multiple files")
                    parsedAsset = parsedAsset[0]
                }

                //           console.log("Adding file with original = ", original)
                // We now have a full parsed asset in a {filename: filename, parsed: parsed} structure
                this.add(id, parsedAsset.parsed, original); // Add the loaded and parsed asset to the manager
                this.list[id].dynamicLink = dynamicLink;
                this.list[id].staticURL = null; // indicates it has not been rehosted
                if (isHttpOrHttps(filename) && !dynamicLink) {
                    // if it's a URL, and it's not a dynamic link, then we can store the URL as the static URL
                    // indicating we don't want to rehost this later.
                    this.list[id].staticURL = filename;
                }
                this.list[id].filename = filename
                if (id === "starLink") {
                    console.log("Flagging initial starlink file")
                    this.list[id].isTLE = true;
                }

                Globals.parsing--;
                console.log("<<< loadAsset() parsing Finished: " + filename + " GlobPars=" + Globals.parsing + " id=" + id);
                return parsedAsset; // Return the asset for further chaining if necessary
            })
            .catch(error => {
                Globals.parsing--;
                console.log('There was a problem with the fetch operation: ', error.message);
                throw error;
            });
    }


    detectTLE(filename) {
        const fileExt = getFileExtension(filename);
        const isTLE = (fileExt === "txt" || fileExt === "tle");
        return isTLE;
    }


    parseAsset(filename, id, buffer) {

        console.log("parseAsset(" + filename + "," + id + ",<buffer>)")
        // if it's a zip file, then we need to extract the file
        // and then parse that.

        // Check if the filename ends with .zip
        if (filename.endsWith('.zip') || filename.endsWith('.kmz')) {
            // Create a new instance of JSZip
            const zip = new JSZip();
            // Load the zip file
            return zip.loadAsync(buffer)
                .then(zipContents => {
                    // Create a promise for each file in the zip and store them in an array
                    const filePromises = Object.keys(zipContents.files).map(zipFilename => {
                        const zipEntry = zipContents.files[zipFilename];
                        // We only care about actual files (not directories)
                        if (!zipEntry.dir) {
                            // Get the ArrayBuffer of the unzipped file
                            return zipEntry.async('arraybuffer')
                                .then(unzippedBuffer => {
                                    // Recursively call parseAsset for each unzipped file
                                    return this.parseAsset(zipFilename, id, unzippedBuffer);
                                });
                        }
                    });
                    // Wait for all files to be processed
                    return Promise.all(filePromises);
                })
                .catch(error => {
                    console.error('Error unzipping the file:', error);
                });
        } else {


            // first check for loading via URL, which is things like the Celestrack proxy
            var fileExt = this.deriveExtension(filename);

            var parsed;
            var prom;

            const decoder = new TextDecoder("utf-8"); // replace "utf-8" with detected encoding

            // might not need this, as we can just use the fileExt
            let dataType = "unknown";


            switch (fileExt.toLowerCase()) {
                case "txt":
                    parsed = decoder.decode(buffer);
                    dataType = "text";
                    break;
                case "tle":
                    parsed = decoder.decode(buffer);
                    dataType = "tle";
                    break;
                case "dat": // for bsc5.dat, the bright star catalog
                    parsed = decoder.decode(buffer);
                    dataType = "dat";
                    break;
                case "klv":
                    parsed = parseKLVFile(buffer);
                    dataType = "klv";
                    break;
                case "jpg":
                case "jpeg":
                    prom = createImageFromArrayBuffer(buffer, 'image/jpeg')
                    dataType = "image";
                    break
                case "gif":
                    prom = createImageFromArrayBuffer(buffer, 'image/gif')
                    dataType = "image";
                    break
                case "png":
                    prom = createImageFromArrayBuffer(buffer, 'image/png')
                    dataType = "image";
                    break
                case "tif":
                case "tiff":
                    prom = createImageFromArrayBuffer(buffer, 'image/tiff')
                    dataType = "image";
                    break
                case "webp":
                    prom = createImageFromArrayBuffer(buffer, 'image/webp')
                    dataType = "image";
                    break
                case "heic":
                    dataType = "image";
                    prom = createImageFromArrayBuffer(buffer, 'image/heic')
                    break
                case "csv":
                    const buffer2 = cleanCSVText(buffer)
                    var text = decoder.decode(buffer);

                    parsed = csv.toArrays(text);
                    dataType = detectCSVType(parsed)
                    if (dataType === "Unknown") {
                        parsed.shift(); // remove the header, legacy file type handled in specific code
                    } else if (dataType === "Airdata") {
                        parsed = parseAirdataCSV(parsed);
                    } else if (dataType === "MISB1") {
                        parsed = parseMISB1CSV(parsed);
                    }
                    break;
                case "kml":
                case "ksv":
                    parsed = parseXml(decoder.decode(buffer));
                    dataType = "klm";
                    break;
                case "glb":             // 3D models in glTF binary format
                    dataType = "glb";
                    parsed = buffer;
                    break;
                case "bin":             // for binary files like BSC5 (the Yale Bright Star Catalog)
                    dataType = "bin";
                    parsed = buffer;
                    break;
                case "sitch.js":        // custom text sitch files
                    dataType = "sitch";
                    parsed = buffer;
                    break;
                case "srt": // SRT is a subtitle file, but is used by DJI drones to store per-frame coordinates.
                    dataType = "srt";
                    parsed = parseSRT(decoder.decode(buffer));
                    break;

                default:
                    // theoretically we could inspect the file contents and then reload it...
                    // but let's trust the extensions
                    //assert(0, "Unhandled extension " + fileExt + " for " + filename)
                    console.warn("Unhandled extension " + fileExt + " for " + filename)
                    return Promise.resolve({filename: filename, parsed: buffer, dataType: dataType});
            }

            console.log("parseAsset: DONE Parse " + filename)

            // if a promise then promise to wrap the result of that in a structure
            if (prom !== undefined) {
                return prom.then(parsed => {
                    return {
                        filename: filename, parsed: parsed
                    }
                })
            }

            // otherwise just return the results wrapped in a resolved promise
            return Promise.resolve({filename: filename, parsed: parsed});
        }
    }

    deriveExtension(filename) {
        var fileExt;
        if (filename.startsWith(SITREC_SERVER + "proxy.php")) {
            fileExt = "txt"
        } else {
            fileExt = getFileExtension(filename);
        }
        return fileExt
    }

    rehostDynamicLinks() {
        const rehostPromises = [];
        const todayDateStr = new Date().toISOString().split('T')[0];
        Object.keys(this.list).forEach(key => {
            const f = this.list[key];
            if (f.dynamicLink && !f.staticURL) {


                var rehostFilename = f.filename;

                // If we rehost a TLE file, then need to set the rehostedStarlink flag
                // first check for the special case of a "starLink" file
                // If we get here then that can only be the dynamic proxy version
                // so calculate a filename and rehost
                if (key === "starLink") {
                    this.rehostedStarlink = true;
                    rehostFilename = key + "-" + todayDateStr + "." + this.deriveExtension(f.filename)
                    console.log("this.rehostedStarlink set as REHOSTING starLink as " + rehostFilename)
                } else {
                    // if it's just a TLE, then we are still going to rehost a TLE
                    // but it will be one dragged in
                    // but can just use the filename as normal
                    if (f.isTLE) {
                        this.rehostedStarlink = true;
                        console.log("this.rehostedStarlink set as REHOSTING TLE " + rehostFilename)
                    }
                }

                console.log("Dynamic Rehost: " + rehostFilename)
                const rehostPromise = Rehoster.rehostFile(rehostFilename, f.original).then((staticURL) => {
                    console.log("AS PROMISED: " + staticURL)
                    f.staticURL = staticURL;
                })
                rehostPromises.push(rehostPromise)
            }
        })
        return Promise.all(rehostPromises);
    }

    disposeAll() {
        // delete all entries in this.rawFiles and this.list
        this.rawFiles = [];
        super.disposeAll()
    }

}

// we have to returna  promise as the Image loading is async,
// even when from a blob/URL
function createImageFromArrayBuffer(arrayBuffer, type) {
    return new Promise((resolve, reject) => {
        // Create a blob from the ArrayBuffer
        const blob = new Blob([arrayBuffer], {type: type});

        // Create an object URL for the blob
        const url = URL.createObjectURL(blob);

        // Create a new Image and set its source to the object URL
        const img = new Image();
        img.onload = () => {
            console.log("Done with " + url);
            // Release the object URL after the image has been loaded
            URL.revokeObjectURL(url);
            resolve(img); // Resolve the promise with the Image object
        };
        img.onerror = reject; // Reject the promise if there's an error loading the image
        img.src = url;
    });
}

// given a 2d CSV file, attempt to detect what type of file it is
// and the mappings of columns to data
export function detectCSVType(csv) {
    if (csv[0][0] === "time(millisecond)" && csv[0][1] === "datetime(utc)") {
        return "Airdata"
    } else if (csv[0][0] === "DPTS" && csv[0][1] === "Security:") {
        return "MISB1"
    }
    // not sure we need this warning, as some sitches have custom code to use
    // specific columns of CSV files.
//    console.warn("Unhandled CSV type detected.  Please add to detectCSVType() function.")
    return "Unknown";
}


export function createCustomModalWithCopy(url) {
    // Create the modal container
    const modal = document.createElement('div');
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.zIndex = '1';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.4)';

    // Create the modal content container
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#fefefe';
    modalContent.style.margin = '15% auto';
    modalContent.style.padding = '20px';
    modalContent.style.border = '1px solid #888';
    modalContent.style.width = '50%';

    // Create the close button
    const closeButton = document.createElement('span');
    closeButton.innerHTML = '&times;';
    closeButton.style.color = '#aaa';
    closeButton.style.float = 'right';
    closeButton.style.fontSize = '28px';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.cursor = 'pointer';

    // Close modal event and cleanup
    closeButton.onclick = function() {
        modal.style.display = 'none';
        // remove it from the DOM
        document.body.removeChild(modal);
        // remove the event listener
        closeButton.onclick = null;

    };

    // Append the close button to the modal content
    modalContent.appendChild(closeButton);

    // Create and append the URL text
    const urlText = document.createElement('p');
    urlText.textContent = url;
    modalContent.appendChild(urlText);

    // Create and append the Copy button
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy URL';
    copyButton.onclick = function() {
        navigator.clipboard.writeText(url).then(() => {
            console.log('URL copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    };

    modalContent.appendChild(copyButton);

    // Append the modal content to the modal
    modal.appendChild(modalContent);

    // Append the modal to the body
    document.body.appendChild(modal);

    // Function to display the modal
    const showModal = function() {
        modal.style.display = 'block';
    };

    // Return the showModal function to allow opening the modal
    return showModal;
}


