"use strict"
/*
The MIT License (MIT)

Copyright (c) 2013 Mikola Lysenko

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/


var ndarray = require("ndarray")
var GifReader = require("omggif").GifReader
var ppm = require("ppm")
var pack = require("ndarray-pack")
var through = require("through")
const {getFileExtension} = require("../utils");

class ImageQueueManager {
    constructor() {
        this.queue = [];
        this.activeRequests = 0;
        this.maxActiveRequests = 5;
        this.maxRetries = 3;
        this.errorOccurred = false; // New flag to track if an error has occurred
    }

    dispose() {
        this.queue = [];
        this.activeRequests = 0;
    }

    enqueueImage(url, cb, retries = 0) {
        this.queue.push({ url, cb, retries });
        this.processQueue();
//        console.log("Enqueued " + url);
    }

    processQueue() {
        while (this.activeRequests < this.maxActiveRequests && this.queue.length > 0) {
                this.processNext();
        }
    }

    processNext() {
        if (this.queue.length === 0) {
            return;
        }

        const { url, cb, retries } = this.queue.shift();
        this.activeRequests++;

        this.defaultImage(url, (err, result) => {
            this.activeRequests--;
            if (err) {
                console.log("Err..... " + url);
                this.errorOccurred = true; // Set the flag on error
                if (retries < this.maxRetries) {
                    console.warn("Retrying (re-queueing) " + url);
                    this.enqueueImage(url, cb, retries + 1);
                } else {
                    cb(err, null);
                }
            } else {
                cb(null, result);
            }

            if (this.queue.length === 0) {
                this.errorOccurred = false; // Reset the flag when the queue is empty
            }
            this.processQueue();
        });
    }


    defaultImage(url, cb) {
        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            var canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            var context = canvas.getContext("2d");
            context.drawImage(img, 0, 0);
            var pixels = context.getImageData(0, 0, img.width, img.height);
            cb(null, ndarray(new Uint8Array(pixels.data), [img.height, img.width, 4], [4 * img.width, 4, 1], 0));
        };
        img.onerror = (err) => {
            console.log("img.onerror = " +err+"  "+url)
            cb(err);
        };
        // Check if errorOccurred flag is true and delay setting the src accordingly
        if (this.errorOccurred) {
            setTimeout(() => {
                img.src = url;
            }, 100); // Delay by 0.1 second
        } else {
            img.src = url;
        }
    }
}

// Usage
export const imageQueueManager = new ImageQueueManager();

function defaultImage(url, cb) {
    imageQueueManager.enqueueImage(url, cb);
}

// Example usage
// loadImage('https://example.com/image1.png', (err, result) => {
//   if (err) {
//     console.error(err);
//   } else {
//     console.log('Image 1 loaded:', result);
//   }
// });




// function defaultImage(url, cb) {
//   var img = new Image()
//   img.crossOrigin = "anonymous";  // MICKMOD
//   img.onload = function() {
//     var canvas = document.createElement("canvas")
//     canvas.width = img.width
//     canvas.height = img.height
//     var context = canvas.getContext("2d")
//     context.drawImage(img, 0, 0)
//     var pixels = context.getImageData(0, 0, img.width, img.height)
//     cb(null, ndarray(new Uint8Array(pixels.data), [img.height, img.width, 4], [4*img.width, 4, 1], 0))
//   }
//   img.onerror = function(err) {
//     cb(err)
//   }
//   img.src = url
// }

//Animated gif loading
function handleGIF(url, cb) {
    var xhr = new XMLHttpRequest()
    xhr.responseType = "arraybuffer"
    xhr.overrideMimeType("application/binary")
    xhr.onerror = function(err) {
        cb(err)
    }
    xhr.onload = function() {
        if(xhr.readyState !== 4) {
            return
        }
        var data = new Uint8Array(xhr.response)
        var reader
        try {
            reader = new GifReader(data)
        } catch(err) {
            cb(err)
            return
        }
        if(reader.numFrames() > 0) {
            var nshape = [reader.numFrames(), reader.height, reader.width, 4]
            var ndata = new Uint8Array(nshape[0] * nshape[1] * nshape[2] * nshape[3])
            var result = ndarray(ndata, nshape)
            try {
                for(var i=0; i<reader.numFrames(); ++i) {
                    reader.decodeAndBlitFrameRGBA(i, ndata.subarray(
                        result.index(i, 0, 0, 0),
                        result.index(i+1, 0, 0, 0)))
                }
            } catch(err) {
                cb(err)
                return
            }
            cb(undefined, result)
        } else {
            var nshape = [reader.height, reader.width, 4]
            var ndata = new Uint8Array(nshape[0] * nshape[1] * nshape[2])
            var result = ndarray(ndata, nshape)
            try {
                reader.decodeAndBlitFrameRGBA(0, ndata)
            } catch(err) {
                cb(err)
                return
            }
            cb(undefined, result)
        }
    }
    xhr.open("GET", url, true)
    xhr.send()
}

//PPM loading
function handlePPM(url, cb) {
    var xhr = new XMLHttpRequest()
    xhr.responseType = "arraybuffer"
    xhr.overrideMimeType("application/binary")
    xhr.onerror = function(err) {
        cb(err)
    }
    xhr.onload = function() {
        if(xhr.readyState !== 4) {
            return
        }
        var fakeStream = through()
        ppm.parse(fakeStream, function(err, pixels) {
            if(err) {
                cb(err)
                return
            }
            var nshape = [ pixels.length, pixels[0].length, pixels[0][0].length ]
            var data = new Uint8Array(nshape[0] * nshape[1] * nshape[2])
            var result = ndarray(data, nshape)
            pack(pixels, result)
            cb(undefined, result)
        })
        fakeStream.end(new Uint8Array(xhr.response))
    }
    xhr.open("GET", url, true)
    xhr.send()
}

export function getPixels(url, cb) {
//    console.log("getPixels ("+url+")")
//    var ext = path.extname(url)
    var ext = getFileExtension(url)
    switch(ext.toUpperCase()) {
        case ".GIF":
            handleGIF(url, cb)
            break
        case ".PPM":
            handlePPM(url, cb)
            break
        default:
            if(url.indexOf('data:image/gif;') === 0) {
                handleGIF(url, cb)
            } else {
                defaultImage(url, cb)
            }
    }
}
