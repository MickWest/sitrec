import {CNodeVideoView} from "./CNodeVideoView";
import {par} from "../par";
import {FileManager, Sit} from "../Globals";
import {CNodeViewUI} from "./CNodeViewUI";

import {SITREC_APP} from "../configUtils";
import {CVideoWebCodecData} from "../CVideoWebCodecData";

export class CNodeVideoWebCodecView extends CNodeVideoView {
    constructor(v) {
        super(v);


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



    addDownloadButton() {
        this.removeDownloadButton()
        // make a URL from the name, adding


        // url is either absolute or relative
        // if absolte, then we just return it
        // if it's a relative URL, then we need to add the domain
        // and account for ../
        // a relative path would be something like
        // ../sitrec-videos/private/Area6-1x-speed-08-05-2023 0644UTC.mp4
        // and the root would be something like
        // https://www.metabunk.org/sitrec/
        function getAbsolutePath(url, root) {
            if (url.startsWith("http")) {
                return url;
            }
            if (url.startsWith("../")) {
                // trim the root to the second to last /
                let lastSlash = root.lastIndexOf("/", root.length - 2);
                root = root.slice(0, lastSlash + 1);
                return root + url.slice(3);
            }
            return root + url;
        }

        this.url = getAbsolutePath(this.fileName, SITREC_APP);


        // add a gui link to the file manager gui
        // this will allow the user to download the file
        // or delete it.
        // this will be removed when the node is disposed
        // so we don't need to worry about it.

        // Define an object to hold button functions
        const obj = {
            openURL: () => {
             //   window.open(this.url, '_blank');
                // we have a url to the video file and want to let the user download it
                // so we create a link and click it.
                // this will download the file.
                const link = document.createElement('a');

                // fix spaces etc in the url
                link.href = encodeURI(this.url);

                link.download = this.fileName;

                console.log("Downloading: " + link.href + " as " + link.download)

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);


            }
        };

        // Add a button to the GUI
        this.button = FileManager.guiFolder.add(obj, 'openURL').name('Download Video');
    }

    removeDownloadButton() {
        if (this.button) {
            this.button.destroy();
            this.button = undefined;
        }
    }




    // for import or drag and drop files.
    uploadFile(file) {

        this.fileName = file.name;

        this.stopStreaming()
        this.addLoadingMessage()
        this.disposeVideoData()
        this.videoData = new CVideoWebCodecData({id: this.id + "_data", dropFile: file},
            this.loadedCallback.bind(this), this.errorCallback.bind(this))
        par.frame = 0;
        par.paused = false; // unpause, otherwise we see nothing.
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


    dispose() {
        super.dispose()
        this.removeDownloadButton();
    }


}