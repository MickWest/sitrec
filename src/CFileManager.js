import {assert, cleanCSVTex, cleanCSVText, getFileExtension, isHttpOrHttps, versionString} from "./utils";
import JSZip from "./js/jszip";
import {parseSRT, parseXml} from "./KMLUtils";
import {SITREC_SERVER} from "../config";
import {Rehoster} from "./CRehoster";
import {CManager} from "./CManager";
import {gui} from "./Globals";
import {DragDropHandler} from "./DragDropHandler";
import {parseAirdataCSV} from "./ParseAirdataCSV";
import {parseMISB1CSV} from "./MISBUtils";

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

        this.guiFolder = gui.addFolder("FileManager").perm();

        this.guiFolder.add(this, "importFile").name("Import File").perm();


        let textSitches = [];
        fetch((SITREC_SERVER+"getsitches.php?get=myfiles"), {mode: 'cors'}).then(response => response.text()).then(data => {
            console.log("Local files: " + data)
            let localfiles = JSON.parse(data) // will give an array of local files
        })


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
             //   this.parseAsset(file.name, file.name, reader.result)

                // do we want to always rehost?

                Rehoster.rehostFile(file.name, reader.result).then(rehostResult => {
                   console.log("Imported File Rehosted as " + rehostResult);
                    DragDropHandler.parseResult(file.name, reader.result);
                });

            });

            // Read the file as an array buffer (binary data)
            reader.readAsArrayBuffer(file);
        });

        // Trigger a click event on the input element
        inputElement.click();

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

        // if it's not a url, then redirect to the data folder
        if (!isHttpOrHttps(filename)) {
            filename = "./data/" + filename;
        }

        var original = null;

        console.log(">>> loadAsset() Loading Started: " + filename);
        return fetch(filename + "?v=1" + versionString)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.arrayBuffer(); // Return the promise for the next then()
            })
            .then(arrayBuffer => {
                // parseAsset always returns a promise
                console.log("<<< loadAsset() Loading Finished: " + filename + " id=" + id);

                if (dynamicLink)
                    original = arrayBuffer;
                else
                    original = null;

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
                this.list[id].filename = filename
                if (id === "starLink") {
                    console.log("Flagging initial starlink file")
                    this.list[id].isTLE = true;
                }

                return parsedAsset; // Return the asset for further chaining if necessary
            })
            .catch(error => {
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
            switch (fileExt.toLowerCase()) {
                case "txt":
                case "tle":
                case "dat": // for bsc5.dat, the bright star catalog
                    parsed = decoder.decode(buffer);
                    break;
                case "jpg":
                case "jpeg":
                    prom = createImageFromArrayBuffer(buffer, 'image/jpeg')
                    break
                case "gif":
                    prom = createImageFromArrayBuffer(buffer, 'image/gif')
                    break
                case "png":
                    prom = createImageFromArrayBuffer(buffer, 'image/png')
                    break
                case "tif":
                case "tiff":
                    prom = createImageFromArrayBuffer(buffer, 'image/tiff')
                    break
                case "webp":
                    prom = createImageFromArrayBuffer(buffer, 'image/webp')
                    break
                case "heic":
                    prom = createImageFromArrayBuffer(buffer, 'image/heic')
                    break
                case "csv":
                    const buffer2 = cleanCSVText(buffer)
                    var text = decoder.decode(buffer);

                    parsed = $.csv.toArrays(text);
                    const type = detectCSVType(parsed)
                    if (type === "Unknown") {
                        parsed.shift(); // remove the header, legacy file type handled in specific code
                    } else if (type === "Airdata") {
                        parsed = parseAirdataCSV(parsed);
                    } else if (type === "MISB1") {
                        parsed = parseMISB1CSV(parsed);
                    }
                    break;
                case "kml":
                case "ksv":
                    parsed = parseXml(decoder.decode(buffer));

                    break;
                case "glb":             // 3D models in glTF binary format
                case "bin":             // for binary files like BSC5 (the Yale Bright Star Catalog)
                case "sitch.js":        // custom text sitch files
                    parsed = buffer;
                    break;
                case "srt": // SRT is a subtitle file, but is used by DJI drones to store per-frame coordinates.
                    parsed = parseSRT(decoder.decode(buffer));

                    break;

                default:
                    // theoretically we could inspect the file contents and then reload it...
                    // but let's trust the extensions
                    //assert(0, "Unhandled extension " + fileExt + " for " + filename)
                    console.warn("Unhandled extension " + fileExt + " for " + filename)
                    return Promise.resolve({filename: filename, parsed: null});
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
    console.warn("Unhandled CSV type detected.  Please add to detectCSVType() function.")
    return "Unknown";
}

