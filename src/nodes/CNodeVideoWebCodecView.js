import {CNodeVideoView} from "./CNodeVideoView";
import {par} from "../par";
import {Sit} from "../Globals";
import {CVideoWebCodecData} from "./CNodeVideoWebCodec";
import {CNodeViewUI} from "./CNodeViewUI";

export class CNodeVideoWebCodecView extends CNodeVideoView {
    constructor(v) {
        super(v);
        //this.checkInputs(["zoom"])

        this.input("zoom", true); // zoom input is optional

        // if it's an overlay view then we don't need to add the overlay UI view
        if (!v.overlayView) {
            // Add an overlay view to show status (mostly errors)
            this.overlay = new CNodeViewUI({id: this.id+"_videoOverlay", overlayView: this})
            this.overlay.ignoreMouseEvents();
        }

        v.id = v.id + "_data"

        if (v.file === undefined) {
            this.addNoVideoMessage()
        } else {
            this.addLoadingMessage();
            this.Video = new CVideoWebCodecData(v,
                this.loadedCallback.bind(this), this.errorCallback.bind(this))
        }
        this.fileName = v.file;

        this.handlerFunction = this.handlerFunction.bind(this);
        this.onDropBound = this.onDrop.bind(this); // Bind and store the reference for removal later

    }

    toSerializeCNodeVideoCodecView = ["fileName"]

    modSerialize() {
        return {
            ...super.modSerialize(),
            ...this.simpleSerialize(this.toSerializeCNodeVideoCodecView)

        }
    }

    modDeserialize(v) {
        super.modDeserialize(v)
        this.simpleDeserialize(v, this.toSerializeCNodeVideoCodecView)
        this.positioned = true;
    }




    addLoadingMessage() {
        if (this.overlay)
            this.overlay.addText("videoLoading", "LOADING", 50, 50, 5, "#f0f000")
    }

    addNoVideoMessage() {
        if (this.overlay)
            this.overlay.addText("videoNo", "DROP VIDEO HERE", 50, 50, 5, "#f0f000")
    }

    removeText() {
        if (this.overlay) {
            this.overlay.removeText("videoLoading")
            this.overlay.removeText("videoError")
            this.overlay.removeText("videoErrorName")
            this.overlay.removeText("videoNo")
        }
    }

    // just a stub to prevent stuff happening on drag events
    handlerFunction(event) {
        event.preventDefault()
    }


    stopStreaming() {
        this.removeText()
        par.frame = 0
        par.paused = false;
        if (this.Video) {
            this.Video.killWorkers()
            this.Video.flushEntireCache()
            this.Video = undefined;
        }
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
        // if we loaded from a mod or custom
        // then we might want to set the frame nubmer

        if (Sit.pars !== undefined && Sit.pars.frame !== undefined) {
            par.frame = Sit.pars.frame;
        }


    }

    errorCallback() {
        this.Video.error = false;
        if (this.overlay) {
            this.overlay.removeText("videoLoading")
            this.overlay.addText("videoError", "Error Loading", 50, 45, 5, "#f0f000", "center")
            this.overlay.addText("videoErrorName", this.fileName, 50, 55, 1.5, "#f0f000", "center")
        }
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
        super.dispose()
    }


}