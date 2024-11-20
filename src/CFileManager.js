import {
    areArrayBuffersEqual,
    arrayBufferToString, checkForModding,
    cleanCSVText, disableAllInput, enableAllInput,
    getFileExtension,
    isHttpOrHttps,
    stringToArrayBuffer,
    versionString
} from "./utils";
import JSZip from "./js/jszip";
import {parseSRT, parseXml} from "./KMLUtils";
import {isConsole, SITREC_ROOT, SITREC_SERVER} from "../config";
import {CRehoster} from "./CRehoster";
import {CManager} from "./CManager";
import {Globals, guiMenus, NodeMan, setNewSitchObject, Sit} from "./Globals";
import {DragDropHandler} from "./DragDropHandler";
import {parseAirdataCSV} from "./ParseAirdataCSV";
import {parseKLVFile, parseMISB1CSV} from "./MISBUtils";
// when running as a console app jQuery's $ is not available, so load just the csv plugin separately
import csv from "./js/jquery.csv.js";
import {asyncCheckLogin} from "./login";
import {par} from "./par";
import {assert} from "./assert.js";
import {writeToClipboard} from "./urlUtils";
import {CustomManager} from "./CustomSupport";
import {textSitchToObject} from "./RegisterSitches";
import {addOptionToGUIMenu, removeOptionFromGUIMenu} from "./lil-gui-extras";


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

        this.rehoster = new CRehoster();

        if (!isConsole) {
            this.guiFolder = guiMenus.file;

            // custom sitches and rehosting only for logged-in users
            if (Globals.userID > 0) {
                this.guiFolder.add(this, "saveSitch").name("Save").perm();
                this.guiFolder.add(this, "saveSitchAs").name("Save As").perm();
                this.guiFolder.add(this, "saveWithPermalink").name("Save with Permalink").perm();
                this.guiFolder.add(this, "importFile").name("Import File").perm();
                this.guiFolder.add(this, "rehostFile").name("Rehost File").perm();
                this.guiFolder.add(this, "openDirectory").name("Open Local Sitch folder").perm();
            }

            // get the list of files saved on the server
            // this is basically a list of the folders in the user's directory
            let textSitches = [];
            fetch((SITREC_SERVER + "getsitches.php?get=myfiles"), {mode: 'cors'}).then(response => response.text()).then(data => {
                console.log("Local files: " + data)
                this.userSaves = JSON.parse(data) // will give an array of local files
                // add a "-" to the start of the userSaves array, so we can have a blank entry
                this.userSaves.unshift("-");

                // add a selector for loading a file
                this.loadName = this.userSaves[0];
                this.guiLoad = this.guiFolder.add(this, "loadName", this.userSaves).name("Load").perm().onChange((value) => {
                    this.loadSavedFile(value)
                }).moveAfter("Save with Permalink");

                this.deleteName = this.userSaves[0];
                this.guiDelete = this.guiFolder.add(this, "deleteName", this.userSaves).name("Delete").perm().onChange((value) => {
                    this.deleteSitch(value)
                }).moveAfter("Load");

            })

        }
    }


    // getVersions returns a promise that resolves to an array of versions of a sitch
    // which it gets from the server via getsitches.php
    getVersions(name) {
        return fetch((SITREC_SERVER + "getsitches.php?get=versions&name="+name), {mode: 'cors'}).then(response => response.text()).then(data => {
            console.log("versions: " + data)
            this.versions = JSON.parse(data) // will give an array of local files
            console.log("Parsed Versions url \n" + this.versions[0].url)
            return this.versions;
        })
    }


    // unimlemented
    deleteSitch(value) {
        // get confirmation from the user
        if (!confirm("Are you sure you want to delete " + value + " from the server?")) {
            return;
        }


        console.log("Staring to deletet " + value + " from the server");
        this.rehoster.deleteFilePromise(value).then(() => {
            console.log("Deleted " + value)
            this.deleteName = "-";
            if (this.loadName === value) {
                this.loadName = "-";
            }
            // the remove calls will also update the GUI
            // to account for the "-" selection
            removeOptionFromGUIMenu(this.guiLoad, value);
            removeOptionFromGUIMenu(this.guiDelete, value);
        });

    }


    // given a name, load the most recent version of that sitch
    // from the server (user specific)
    loadSavedFile(name) {
        this.loadName = name;
        console.log("Load Local File")
        console.log(this.loadName);

        if (this.loadName === "-") {
            return;
        }

        this.getVersions(this.loadName).then((versions) => {
            // the last version is the most recent
            const latestVersion = versions[versions.length - 1].url;
            console.log("Loading " + name + " version " + latestVersion)

            this.loadURL = latestVersion;
            /// load the file, convert to an object, and call setNewSitchObject with it.
            fetch(latestVersion).then(response => response.arrayBuffer()).then(data => {
                console.log("Loaded " + name + " version " + latestVersion)

                const decoder = new TextDecoder('utf-8');
                const decodedString = decoder.decode(data);

                let sitchObject = textSitchToObject(decodedString);

                sitchObject = checkForModding(sitchObject);


                setNewSitchObject(sitchObject);
            })
        })
    }


    // Returns a promise that resolves to the name of the sitch
    // input by the user
    inputSitchName() {
        return new Promise((resolve, reject) => {
            const sitchName = prompt("Enter a name for the sitch", Sit.sitchName);
            if (sitchName !== null) {
                Sit.sitchName = sitchName;
                // will need to check if the sitch already exists
                // server side, and if so, ask if they want to overwrite
                console.log("Sitch name set to " + Sit.sitchName)
                resolve();
            } else {
                reject();
            }
        })
    }


    // The "Save" button on the file menu.
    // if there's no name, then input a name
    // if there is a name, then use that.

    // Returns a promise that resolves when the sitch is saved
    saveSitch() {
        if (Sit.sitchName === undefined) {
            return this.inputSitchName().then(() => {
                return this.saveSitchNamed(Sit.sitchName);  // return the Promise here
            }).then(() => {
                addOptionToGUIMenu(this.guiLoad, Sit.sitchName);
                addOptionToGUIMenu(this.guiDelete, Sit.sitchName);
            }).catch((error) => {
                console.log("Failed to input sitch name:", error);
            });
        } else {
            return this.saveSitchNamed(Sit.sitchName);  // return the Promise here
        }
    }

    // The "Save with Permalink" button on the file menu.
    // saves the sitch, and then gets the permalink
    // and displays it in a modal dialog
    saveWithPermalink() {
        return this.saveSitch().then(() => {
            // Wait until the custom link is fully set before calling getPermalink
            return CustomManager.getPermalink();
        }).catch((error) => {
            console.log("Error in saving with permalink:", error);
        });
    }

    // The "Save As" button on the file menu.
    // just delete the current sitch name, and then call saveSitch,
    // which will force a new name
    saveSitchAs() {
        Sit.sitchName = undefined;
        return this.saveSitch();
    }

    // given a name, save at version to that
    saveSitchNamed(sitchName) {

        // and then save the sitch to the server where it will be versioned by data in a folder named for this sitch, for this user
        console.log("Saving sitch as " + sitchName)
        // get date and time into a string, so long as you don't save more than one a second
        // then this will be unique
        const todayDateStr = new Date().toISOString().split('T')[0];
        const todayTimeStr = new Date().toISOString().split('T')[1].split('.')[0];
        const todayDateTimeStr = todayDateStr + "_" + todayTimeStr;
        // strip out - and : so it's a valid filename (leave the underscore)
        const todayDateTimeFilename = todayDateTimeStr.replaceAll("-", "").replaceAll(":", "");
        console.log("Unique date time string: " + todayDateTimeFilename)

        const oldPaused = par.paused;
        par.paused = true;
        disableAllInput("SAVING");

        return CustomManager.serialize(sitchName, todayDateTimeFilename).then((serialized) => {
            this.guiFolder.close();
            par.paused = oldPaused
            enableAllInput();
        })

    }




    exportSitch() {
        //
    }

    // a file is unhosted if it's flagged as a dynamic link, and has no static URL
    isUnhosted(id) {
        const f = this.list[id];
        assert(f, `Checking unhosted on missing file, id =${id}`);
        return (f.dynamicLink && !f.staticURL);
    }

    loginAttempt(callback, button = this.permaButton, rename = "Permalink", color="#FFFFFF") {
        asyncCheckLogin().then(() => {
            if (Globals.userID > 0) {
                button.name(rename).setLabelColor(color)
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
                        button.name(rename).setLabelColor(color)
                        //         return this.makeNightSkyURL();
                    }
                });
            });

        })
    }



    makeExportButton(object, functionName, name) {
        if (this.exportFolder === undefined) {
            this.exportFolder = this.guiFolder.addFolder("Export").perm().close();
        }

      //  console.error("ADDING EXPORT BUTTON FOR "+object.id+" with function "+functionName+ "and name "+name)


        return this.exportFolder.add(object, functionName).name(name);

    }

    removeExportButton(object) {
        if (this.exportFolder !== undefined) {
            if (object.exportButtons !== undefined) {
        //        console.error("Removing export button for " + object.id)
                for (let i = 0; i < object.exportButtons.length; i++) {
                    object.exportButtons[i].destroy();
                }
                object.exportButtons = undefined;

            }
        }
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



    loadLocalFile(parse = false) {
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
                // When the file has been read, parse it as an asset or rehost it
                if (parse) {
                      DragDropHandler.parseResult(file.name, reader.result);
                } else {
                    this.rehoster.rehostFile(file.name, reader.result).then(rehostResult => {
                        console.log("Imported File Rehosted as " + rehostResult);
                        // display an alert with the new URL so the user can copy it
                        //alert(rehostResult);
                        createCustomModalWithCopy(rehostResult)();

                    });
                }

            });

            // Read the file as an array buffer (binary data)
            reader.readAsArrayBuffer(file);
        });

        // Trigger a click event on the input element
        inputElement.click();

    }

    rehostFile() {
        this.loadLocalFile(false)
    }

    importFile() {
        this.loadLocalFile(true)
    }


    // this is DEPRECATED, as all it does is rehost a sitch file
    // with no mods.  It's been replaced by CustomSupport::serialize()
    // which will do the same thing, but also serialize the modifications
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
                this.rehoster.rehostFile(f.filename, f.original).then((staticURL) => {
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

        this.rehoster.waitForAllRehosts().then(() => {
            this.localSitchBuffer = stringToArrayBuffer(sitchString);

            // all files have been rehosted, so now we can rehost the sitch
            this.rehoster.rehostFile(this.localSitchEntry.name, this.localSitchBuffer).then((staticURL) => {
                console.log("Sitch rehosted as " + staticURL);

                // and make a URL that points to the new sitch
                let customLink = SITREC_ROOT + "?custom=" + staticURL;

                createCustomModalWithCopy(customLink)();
            })
        })

    }

    // general file asset loader, detect file type from extension and add to manager
    // returns a promise, which you can then await or .then
    loadAsset(filename, id) {

        // if it starts with data/ then strip that off
        if (filename.startsWith("data/")) {
            filename = filename.substring(5);
        }

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

        if (this.exists(id)) {
          //  return Promise.resolve(this.list[id]);
            return Promise.resolve({filename: filename, parsed: this.list[id].data})

        }

        // might be loading a file that's already been loaded but using a different ID
        // so check the existing files, and make a new entry if so. Flag it as a duplicate
        // so we can handle it later
        // to find it we need to iterate over the files, and check the filename, not the id
        // as the id might be different

        // should we strip off "./" from the start, or just fix them in the original data <<<< HEY, FIX THIS

        var duplicate = false;
        this.iterate( (key, parsed) => {
            const f = this.list[key];
            if (f.filename === filename) {
                duplicate = true;
                console.error("Duplicate file " + filename + " found as existing id: " + key + " new id requested:" + id)
            }
        });


        // // if we are going to try to load it,
        // assert(!this.exists(id), "Asset " + id + " already exists");

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
                // so if it's a zipped asset, it should only be one
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
                case "json": //
                    dataType = "json";
                    parsed = JSON.parse(decoder.decode(buffer))
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
        } else if (filename.startsWith(SITREC_SERVER + "proxyStarlink.php")) {
            fileExt = "txt"
        } else {
            fileExt = getFileExtension(filename);
        }
        return fileExt
    }

    rehostDynamicLinks(rehostVideo = false) {
        const rehostPromises = [];
        const todayDateStr = new Date().toISOString().split('T')[0];

        // first check for video rehosting
        if (rehostVideo) {
            // is there a video? if so we add it directly, so, like terrain, it starts loading normally
            if (NodeMan.exists("video")) {
                const videoNode = NodeMan.get("video")
                if (videoNode.Video !== undefined) {
                    const rehostFilename = videoNode.fileName;
                    const videoDroppedData = videoNode.Video.videoDroppedData;

                    if (videoDroppedData !== undefined) {
                        // do we also needs something similar for URLs?

                        // // start rehosting
                        rehostPromises.push(this.rehoster.rehostFile(rehostFilename, videoDroppedData).then((staticURL) => {
                            console.log("VIDEO REHOSTED AS PROMISED: " + staticURL)
                            videoNode.staticURL = staticURL;
                        }))
                    }
                }
            }
        }


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
                const rehostPromise = this.rehoster.rehostFile(rehostFilename, f.original).then((staticURL) => {
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

// we have to return a promise as the Image loading is async,
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
        // The DPTS and Security: columns are the first two columns of the MISB1 CSV sample header used for misb2 test sitch
        // not sure if this is actually common
        return "MISB1"
    }

    // a MISB file will have a header row with the column names
    // and one of them will be "Sensor Latitude"
    // so return true if "Sensor Latitude" is in the first row
    // also return true for "SensorLatitude" as we want to allow the headers to be the tag ids as well as the full tag names
    if (csv[0].includes("Sensor Latitude") || csv[0].includes("SensorLatitude")) {
        return "MISB1";
    }


    // only give an error warning for custom, as some sitches have custom code to use
    // specific columns of CSV files.
    if (Sit.isCustom) {
        console.error("Unhandled CSV type detected.  Please add to detectCSVType() function.")
    }
    return "Unknown";
}


export function createCustomModalWithCopy(url) {
    // Create the modal container
    const modal = document.createElement('div');
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.zIndex = '10001';
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

    function closeModal() {
        modal.style.display = 'none';
        // remove it from the DOM
        document.body.removeChild(modal);
        // remove the event listener
        closeButton.onclick = null;
    }

    // Close modal event and cleanup
    closeButton.onclick = function() {
        closeModal();
    };

    // Append the close button to the modal content
    modalContent.appendChild(closeButton);

    // Create and append the URL text
    const urlText = document.createElement('p');
    urlText.textContent = url;
    modalContent.appendChild(urlText);

    function addModalButton(text, onClick) {
        // Create and append the Copy button
        const button = document.createElement('button');
        button.textContent = text;
        button.onclick = onClick;
        button.style.margin = '5px';
        modalContent.appendChild(button);
    }


    addModalButton('Copy URL', function() {
        writeToClipboard(url)
        closeModal()
    });

    addModalButton('Copy & Open', function() {
        writeToClipboard(url)
        closeModal();
        par.paused = true;
        // Open this url in a new tab
        window.open(url, '_blank');
    });




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


/**
 * Waits until Globals.parsing becomes zero.
 */
export async function waitForParsingToComplete() {
    DragDropHandler.checkDropQueue();
    console.log("Waiting for parsing to complete... Globals.parsing = " + Globals.parsing);
    // Use a Promise to wait
    await new Promise((resolve, reject) => {
        // Function to check the value of Globals.parsing
        function checkParsing() {
            if (Globals.parsing === 0) {
                console.log("DONE: Globals.parsing = " + Globals.parsing);
                resolve(); // Resolve the promise if Globals.parsing is 0
            } else {
                // If not 0, wait a bit and then check again
                setTimeout(checkParsing, 100); // Check every 100ms, adjust as needed
                console.log("Still Checking, Globals.parsing = " + Globals.parsing)
            }
        }

        // Start checking
        checkParsing();
    });
    console.log("Parsing complete!");
}