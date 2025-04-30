import {CVideoData} from "./CVideoData";
import {versionString} from "./utils";

export class CFramesVideoData extends CVideoData {
    constructor(v) {
        super(v)

        this.tinyName = v.tinyName;
        this.fullName = v.fullName;
    }

    update() {
        // calculate the loaded percentage
        let count = 0;
        for (let f = 0; f < this.frames; f++) {
            if (this.imageCache[f] !== undefined && this.imageCache[f] !== null && this.imageCache[f].width > 0) {
                count++;

                this.width = this.imageCache[f].width
                this.height = this.imageCache[f].height
            }
        }
        this.videoPercentLoaded = Math.floor(100 * count / this.frames);


        if (!this.startedLoadingTiny && this.tinyName !== undefined) {
            this.startedLoadingTiny = true

            for (let i = 0; i < this.frames; i++) {
                this.imageCacheTiny[i].src = this.tinyName(i) + "?v=1" + versionString
            }
        }

        if (!this.startedLoadingFull) {

            // see if waiting for tiny
            if (this.tinyName !== undefined) {
                let count = 0;
                for (let f = 0; f < this.frames; f++) {
                    if (this.imageCacheTiny[f].width > 0) {
                        count++;
                    }
                }
                if (count === this.frames) {
                    this.startedLoadingFull = true;
                }
            } else {
                this.startedLoadingFull = true;
            }

            if (this.startedLoadingFull) {
                for (let i = 0; i < this.frames; i++) {
                    this.imageCache[i].src = this.fullName(i) + "?v=1" + versionString
                }
            }
        }
    }

    getImage(frame) {
        let image = this.imageCache[frame];

        if ((image == undefined || image.width == 0) && this.tinyName !== undefined)
            image = this.imageCacheTiny[frame];
        if (image === undefined || image.width === 0)
            image = null;
        return image;
    }

}