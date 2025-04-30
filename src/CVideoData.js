import {assert} from "./assert";

export class CVideoData {
    constructor(v) {
        this.percentLoaded = 0;

        this.frames = v.frames

        this.videoSpeed = v.videoSpeed ?? 1 // what speed the original video was

        // increase the number of frames
        // to account for original speed
        // e.g. if video was 10x timelapse, then we need 10x the virtual frames
        // to play back in real time
        this.frames *= this.videoSpeed;

        // just give some defaults. actual images will override
        this.width = 100
        this.height = 100

        this.flushEntireCache();

    }

    // virtual functions
    getImage(frame) {
        assert(0, "CVideoData: getImage: not implemented")
        return null;
    }

    update() {
        // nothing to do here
    }

    flushEntireCache() {
        this.startedLoadingTiny = false;
        this.startedLoadingFull = false;

        this.imageCacheTiny = [] // optional small versions
        this.imageCache = [] // full sized images
        this.imageDataCache = []
        this.frameCache = []

        for (let i = 0; i < this.frames; i++) {
            this.imageCacheTiny.push(new Image())
            this.imageCache.push(new Image())
            this.imageDataCache.push(null)
        }

    }

}