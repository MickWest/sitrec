import {CNodeVideoView} from "./CNodeVideoView";
import {par} from "../par";
import {Sit} from "../Globals";
import {CVideoWebCodecData} from "./CNodeVideoWebCodec";
import {CNodeViewUI} from "./CNodeViewUI";
import {Rehoster} from "../CRehoster";

export class CNodeVideoWebCodecView extends CNodeVideoView {
    constructor(v) {
        super(v);
//      this.checkInputs(["zoom"])


        // Add an overlay view to show status (mostly errors)
        this.overlay = new CNodeViewUI({id: "videoOverlay", overlayView:this })
        this.overlay.ignoreMouseEvents();

        v.id = v.id + "_data"
        this.Video = new CVideoWebCodecData(v,
            this.loadedCallback.bind(this), this.errorCallback.bind(this))

        this.fileName = v.file;

        this.handlerFunction = this.handlerFunction.bind(this);
        this.onDropBound = this.onDrop.bind(this); // Bind and store the reference for removal later

        this.addLoadingMessage()

        this.addEventListeners();

    }

    addEventListeners() {
        this.div.addEventListener('dragenter', this.handlerFunction, false);
        this.div.addEventListener('dragleave', this.handlerFunction, false);
        this.div.addEventListener('dragover', this.handlerFunction, false);
        this.div.addEventListener('drop', this.onDropBound, false); // Use the bound reference
    }

    removeEventListeners() {
        this.div.removeEventListener('dragenter', this.handlerFunction, false);
        this.div.removeEventListener('dragleave', this.handlerFunction, false);
        this.div.removeEventListener('dragover', this.handlerFunction, false);
        this.div.removeEventListener('drop', this.onDropBound, false); // Remove using the same reference
    }

    addLoadingMessage() {
        this.overlay.addText("videoLoading", "LOADING", 50, 50, 5, "#f0f000")
    }

    removeText() {
        this.overlay.removeText("videoLoading")
        this.overlay.removeText("videoError")
        this.overlay.removeText("videoErrorName")
    }

    // just a stub to prevent stuff happening on drag events
    handlerFunction(event) {
        event.preventDefault()
    }


    stopStreaming() {
        this.removeText()
        par.frame = 0
        par.paused = false;
        this.Video.killWorkers()
        this.Video.flushEntireCache()
        Sit.frames = 0
        this.positioned = false;
    }

    newVideo(file) {
        Sit.frames = undefined; // need to recalculate this
        this.fileName = file;
        this.Video = new CVideoWebCodecData({id: this.id + "_data", file: file},
            this.loadedCallback.bind(this), this.errorCallback.bind(this))
        this.positioned = false;
        par.frame = 0;
        par.paused = false; // unpause, otherwise we see nothing.
        this.addLoadingMessage()

    }

    // for import or drag and drop files.
    uploadFile(file) {

        Sit.frames = undefined; // need to recalculate this
        this.fileName = file.name;

        this.stopStreaming()
        this.addLoadingMessage()
        this.Video = new CVideoWebCodecData({id: this.id + "_data", dropFile: file},
            this.loadedCallback.bind(this), this.errorCallback.bind(this))
        par.frame = 0;
        par.paused = false; // unpause, otherwise we see nothing.
    }

    loadedCallback() {
        this.removeText();
    }

    errorCallback() {
        this.Video.error = false;
        this.overlay.removeText("videoLoading")
        this.overlay.addText("videoError", "Error Loading", 50, 45, 5, "#f0f000", "center")
        this.overlay.addText("videoErrorName", this.fileName, 50, 55, 1.5, "#f0f000", "center")
    }

    requestAndLoadFile() {
        par.paused = true;
        var input = document.createElement('input');
        input.type = 'file';

        input.onchange = e => {
            var file = e.target.files[0];
            this.uploadFile(file)
            input.remove();
        }

        input.click();
    }

    onDrop(e) {
        e.preventDefault()
        console.log(e)
        let dt = e.dataTransfer
        let files = dt.files
        console.log("LOADING DROPPED FILE:" + files[0].name)
        //   ([...files]).forEach(this.uploadFile)
        this.uploadFile(files[0])
    }

    update(f) {

    }

    dispose() {

        // remove the event listeners, otherwise they stop the object being garbage collected
        this.removeEventListeners();

        super.dispose()
    }


}