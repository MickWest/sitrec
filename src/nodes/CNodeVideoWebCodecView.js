import {CNodeVideoView} from "./CNodeVideoView";
import {par} from "../par";
import {Sit} from "../Globals";
import {CVideoWebCodecData} from "./CNodeVideoWebCodec";
import {CNodeViewUI} from "./CNodeViewUI";

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

        let dropArea = this.div

        dropArea.addEventListener('dragenter', this.handlerFunction, false)
        dropArea.addEventListener('dragleave', this.handlerFunction, false)
        dropArea.addEventListener('dragover', this.handlerFunction, false)
        dropArea.addEventListener('drop', e => this.onDrop(e), false)

        this.addLoadingMessage()

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

    uploadFile(file) {

        this.fileName = "file"

        this.stopStreaming()
        this.addLoadingMessage()
        this.Video = new CVideoWebCodecData({id: this.id + "_data", dropFile: file},
            this.loadedCallback.bind(this), this.errorCallback.bind(this))

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


}