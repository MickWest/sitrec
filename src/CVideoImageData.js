import {CVideoData} from "./CVideoData";
import {assert} from "./assert";

export class CVideoImageData extends CVideoData {
    constructor(v, loadedCallback, errorCallback) {
        super(v, loadedCallback, errorCallback);
        assert(v.img, "CVideoImageData: img is undefined");
        this.img = v.img
        this.width = this.img.width;
        this.height = this.img.height;
        loadedCallback();
    }

    getImage(frame) {
        return this.img;
    }
}