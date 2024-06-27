import {CNodeViewUI} from "./CNodeViewUI";
import {CRegionSelector} from "../CRegionSelector";
import {CNodeCurveEditor} from "./CNodeCurveEdit";
import {FileManager, gui, NodeMan, Sit} from "../Globals";
import {RollingAverage} from "../utils";
import {CNodeArray} from "./CNodeArray";
import {CNodeGraphSeries} from "./CNodeGraphSeries";
import {par} from "../par";
import {assert} from "../assert.js";


function getPixelData(image) {
    // extract the ImageData by drawing it onto a canvas
    // and then getImageData
    var canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height);
    return canvas.getContext('2d').getImageData(0, 0, image.width, image.height).data
}

export class CNodeImageView extends CNodeViewUI {
    constructor(v) {
        super(v);

        this.stretchToFit = v.stretchToFit ?? false
        this.recalculateOnCanvasChange = true;

        if (v.mirror) {
            this.image = NodeMan.get(v.mirror).image
        } else {
            this.image = FileManager.get(v.filename)
            this.test = 0
        }
    }

    renderCanvas() {
        super.renderCanvas(0)
        if (this.stretchToFit) {
            this.ctx.drawImage(this.image, 0, 0, this.widthPx, this.heightPx)
        } else {
            // center it vertically or horizontally
            // by comparing the image aspect ratio to the canvas aspect ratio
            var imageWidth = this.image.width
            var imageHeight = this.image.height
            var canvasWidth = this.canvas.width
            var canvasHeight = this.canvas.height
            var imageAspectRatio = imageWidth / imageHeight
            var canvasAspectRatio = canvasWidth / canvasHeight
            var renderableHeight, renderableWidth, xStart, yStart
            if (imageAspectRatio < canvasAspectRatio) {
                renderableHeight = canvasHeight
                renderableWidth = imageWidth * (renderableHeight / imageHeight)
                xStart = (canvasWidth - renderableWidth) / 2
                yStart = 0
            } else if (imageAspectRatio > canvasAspectRatio) {
                renderableWidth = canvasWidth
                renderableHeight = imageHeight * (renderableWidth / imageWidth)
                xStart = 0
                yStart = (canvasHeight - renderableHeight) / 2
            } else {
                renderableHeight = canvasHeight
                renderableWidth = canvasWidth
                xStart = 0
                yStart = 0
            }
            this.ctx.drawImage(this.image, xStart, yStart, renderableWidth, renderableHeight)

        }

    }

}

// https://stackoverflow.com/questions/13416800/how-to-generate-an-image-from-imagedata-in-javascript
function imagedata_to_image(imagedata) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = imagedata.width;
    canvas.height = imagedata.height;
    ctx.putImageData(imagedata, 0, 0);

    var image = new Image();
    image.src = canvas.toDataURL();
    return image;
}


export class CNodeImageAnalysis extends CNodeImageView {
    constructor(v) {
        v.shiftDrag = true;
        super(v);

        this.input("smooth")


        this.useFilter = true;
        gui.add(this,"useFilter").onChange(v => {this.recalculate()}).listen()
        this.square=true;
        gui.add(this,"square").onChange(v => {this.recalculate()}).listen()
        this.red = false;
        gui.add(this,"red").onChange(v => {this.recalculate()}).listen()
        this.green = false;
        gui.add(this,"green").onChange(v => {this.recalculate()}).listen()
        this.blue = false;
        gui.add(this,"blue").onChange(v => {this.recalculate()}).listen()
        this.grey = true;
        gui.add(this,"grey").onChange(v => {this.recalculate()}).listen()

        this.normalize = true;
        gui.add(this,"normalize").onChange(v => {this.recalculate()}).listen()

        this.relative = false;
        gui.add(this,"relative").onChange(v => {this.recalculate()}).listen()

        this.centerLine = false;
        gui.add(this,"centerLine").onChange(v => {this.recalculate()}).listen()


        gui.add(this,'findBestAngleSuccessive').name("Best Angle, full 180, refined")
        gui.add(this,'findBestAngle5').name("Best angle within 5° of current")


        this.pixelData = getPixelData(this.image)
     //   console.log(this.pixelData)

        // setting height to the negative ration of height to width
        // will keep the apsect ratio,
        this.height = -this.image.height/this.image.width


        this.columns = Array(1000).fill(0)

        this.region = new CRegionSelector();
        this.region.useSkew = false;
        this.region.centerLine = true;
        gui.add(this.region,"useSkew")


        this.resolution = 100

        this.graph = new CNodeCurveEditor({id:"regionGraph",
            left: 0.60, top: 0.5, width: .40, height: .50,
            noFrameLine:true, // don't need the left-right scanning line for a frame
            visible: true, draggable: true, resizable: true, shiftDrag: false, freeAspect: true,
            editorConfig: {
                //       dynamicY: true,

                fillCanvas: true,
                minX: 0, maxX: this.image.width, minY: 0, maxY: 100,

                xLabel: "",
                xStep: 1000,
                yLabel: "",
                yStep: 10,
                points: [],
            },
            inputs: {

                compare: new CNodeGraphSeries({
                    id: "rgbGraph",
                    source: new CNodeArray({id: "rgbGraphArray", array:this.columns,}),
                    color: "#800000",
                }),
                compare1: new CNodeGraphSeries({
                    id: "gGraph",
                    source: new CNodeArray({id: "gGraphArray", array:[],}),
                    color: "#008000",
                }),
                compare2: new CNodeGraphSeries({
                    id: "bGraph",
                    source: new CNodeArray({id: "bGraphArray", array:[],}),
                    color: "#000080",
                }),
                compare3: new CNodeGraphSeries({
                    id: "rGraph",
                    source: new CNodeArray({id: "rGraphArray", array:[],}),
                    color: "#000000",
                }),
            },
            frames: Sit.frames,

        })
        this.graph.editor.disable = true;


        this.regionView = new CNodeImageView({
            id: "theImage",
            stretchToFit: true,
            filename:v.filename,
            left: 0.60, top: 0.0, width: .40, height: .50,
            visible: true, draggable: true, resizable: true, shiftDrag: false, freeAspect: true,

            //   background: new THREE.Color().setRGB(0.0, 0.3, 0.0),
        })


        this.test = 1;

        //////////////////////////////////////////////////////
        ///  DRAG AND DROP FILES?

        let dropArea = this.div

        dropArea.addEventListener('dragenter', this.handlerFunction, false)
        dropArea.addEventListener('dragleave', this.handlerFunction, false)
        dropArea.addEventListener('dragover', this.handlerFunction, false)
        dropArea.addEventListener('drop', e => this.onDrop(e), false)


//////////////////////////////////////////////////////////////

        /*
        this.test = 0
        const guiLook = new GUI({container:this.div});
        guiLook.title("Metabunk Sitrec [U]I")
        guiLook.add (this, 'test',-54,8,0.2).onChange( ).listen().name("test")
*/
        this.updateWH()
        //this.recalculate()
    }

    handlerFunction(event) {
        event.preventDefault()
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

    uploadFile(file) {
        let reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onloadend = () => {
            this.image.onload = () => {
                this.pixelData = getPixelData(this.image)
                this.height = -this.image.height/this.image.width
            }
            this.image.src = reader.result
        }
    }



    c2ix(x) {
        return parseInt(x * this.image.width / this.canvas.width)
    }

    c2iy(y) {
        return parseInt(y * this.image.height / this.canvas.height)
    }


    recalculate () {

        // if we have a region, then step alone the top and and bottom edges
        // in this.resolution steps
        // and sum the pixels in the columns that joins the points

        assert (this.region, "No region defined in CNodeImageAnalysis:recalculate()");

        if (this.region.active) {

            this.region.centerLine = this.centerLine;

            const A = this.region.rect[0]
            const B = this.region.rect[1]
            const C = this.region.rect[2]
            const D = this.region.rect[3]

            var numColumns = this.calculateColumnSums(A,B,C,D,this.normalize, this.relative)

         //   this.graph.frames = column

            // need to set the frames on the graph's compare source.
            // might be better to use "this" as the source?
            this.graph.inputs.compare.inputs.source.array =   this.columns[0]
            this.graph.inputs.compare1.inputs.source.array = this.columns[1]
            this.graph.inputs.compare2.inputs.source.array =  this.columns[2]
            this.graph.inputs.compare3.inputs.source.array =  this.columns[3]
            this.graph.inputs.compare.frames = this.red?numColumns:0
            this.graph.inputs.compare1.frames = this.green?numColumns:0
            this.graph.inputs.compare2.frames = this.blue?numColumns:0
            this.graph.inputs.compare3.frames = this.grey?numColumns:0

            this.graph.editor.max.x = numColumns
            this.graph.editor.dirty = true;
            console.log("+++ Set Editor DIRTY here")
            this.graph.editorView.recalculate()
            this.makeImageFromPixels()
        }
        par.renderOne = true;
    }


    calculateColumnSums(A,B,C,D,normalize=true, relative=false)
    {

        const AB = B.clone().sub(A)
        const DC = C.clone().sub(D)

        // Step along AB using Bresenhams
        // and use the same steps along the bottom

        //  first need to convert the corners canvas pixels to image pixels
        var x0 = this.c2ix(A.x)
        var y0 = this.c2iy(A.y)
        var x1 = this.c2ix(B.x)
        var y1 = this.c2iy(B.y)
        var x3 = this.c2ix(D.x)
        var y3 = this.c2iy(D.y)

        function bresenhamStep(x0, y0, x1, y1, callback) {
            var dx = Math.abs(x1 - x0);
            var dy = Math.abs(y1 - y0);
            var sx = (x0 < x1) ? 1 : -1;
            var sy = (y0 < y1) ? 1 : -1;
            var err = dx - dy;
            var x = 0
            var y = 0

            while (true) {
                callback(x, y)
                if ((x + x0 === x1) && (y + y0 === y1)) break;
                var e2 = 2 * err;
                if (e2 > -dy) {
                    err -= dy;
                    x += sx;
                }
                if (e2 < dx) {
                    err += dx;
                    y += sy;
                }
            }
        }

        // x,y is a unique point on the lines relative to A (x0) or D (x3)

        this.columns = new Array(4)
        for (var i = 0; i < 4; i++) this.columns[i] = []
        var colIndex = 0;

        // pixels is an array of columns
        // a column has four numbers per pixel
        // so the width of the image is the number of columns
        // the height should, in theory, be the length one column (/4)
        // but variations in Bresenham's start and end points might alter this
        // so check
        this.pixels = []


        bresenhamStep(x0, y0, x1, y1, (x, y) => {
            this.pixels[colIndex]=[] // add an empty array
            //     this.ctx.beginPath()
            //     this.ctx.moveTo(x0 + x, y0 + y)
            //     this.ctx.lineTo(x3 + x, y3 + y)
            //     this.ctx.stroke()
            for (var i = 0; i < 4; i++) this.columns[i][colIndex] = 0
            var xTop = x0 + x;
            var yTop = y0 + y

            var xBot = x3 + x
            var yBot = y3 + y
            var yMid = Math.floor((yTop+yBot)/2)
            var xMid = Math.floor((xTop+xBot)/2)
            var count = 0;

            var pixel
            if (this.centerLine) {
                pixel = 4 * ((xMid) + (yMid) * this.image.width)
            }

            bresenhamStep(xTop, yTop, xBot, yBot, (xp, yp) => {
                // now get the image pixel from xp,yp
                // and add it's R+G+B value to the x column

                if (!this.centerLine)
                    pixel = 4 * ((xTop + xp) + (yTop + yp) * this.image.width)

                var red = this.pixelData[pixel]
                var green = this.pixelData[pixel + 1]
                var blue = this.pixelData[pixel + 2]
                var alpha = this.pixelData[pixel + 3]
                var grey = (red + green + blue) / 3
                this.columns[0][colIndex] += red
                this.columns[1][colIndex] += green
                this.columns[2][colIndex] += blue
                this.columns[3][colIndex] += grey
                count++;
                this.pixels[colIndex].push(red, green, blue, alpha)
            })

            //    console.log(column +": "+this.columns[column])
            this.columns.forEach(c => c[colIndex] /= count)
            //      this.columns[column] = Math.random() * 400
            colIndex++;
        })

        var i

        var smoothAmount = this.in.smooth.v0;

        if (smoothAmount && this.useFilter) {
            this.columns.forEach(c => {
                var smooth = RollingAverage(c, smoothAmount)
                for (i = 0; i < colIndex; i++) {
                    c[i] -= smooth[i]
                }
            })
        }

        if (relative) {
            this.columns.forEach(c => {
                var start = c[0]
                for (i = 0; i < colIndex; i++) {
                    c[i] = (c[i] / start) * (normalize?1:50)
                }
            })
        }

        if (normalize) {
            this.columns.forEach(c => {
                var minV = 1000000000
                var maxV = -1000000000
                for (i = 0; i < colIndex; i++) {
                    var v = c[i]
                    if (v > maxV) maxV = v;
                    if (v < minV) minV = v
                }
                for (i = 0; i < colIndex; i++) {
                    c[i] -= minV;
                    c[i] *= 100 / (maxV - minV)
                    if (this.square)
                        c[i] = c[i] * c[i] / 100
                }
            })
        }




        return colIndex;
    }

    // given a set of column sums, find the one that deviates most from the mean standard deviation
    findPeakColumn(c) {
        const n = c.length;
        var total = 0;
        c.forEach(v => total+=v)
        const mean = total/n

        var s2 = 0
        c.forEach(v => s2 += (v-mean)*(v-mean))
        s2 /= n
        const standardDeviation = Math.sqrt(s2)


        var bestColumn = 0;
        var bestDeviation = 0;
        for (var i=0;i<n;i++) {
            const deviation = Math.abs(c[i]-mean) - standardDeviation

            if (deviation > bestDeviation) {
                bestDeviation = deviation;
                bestColumn = i
            }
        }
        return [bestColumn, bestDeviation]
    }

    findBestAngleSuccessive() {
        this.findBestAngle(Math.PI)
        this.findBestAngle(Math.PI/45)
        this.recalculate()
    }

    findBestAngle5() {
        this.findBestAngle(Math.PI/180*10)
        this.recalculate()
    }

    makeImageFromPixels() {
        const width = this.pixels.length
        var height = 0
        this.pixels.forEach(c => {
            if (c.length/4 > height)
                height = c.length/4
        })
        // we now have a width and height so make an array to hold the image data
        var imageArray = new Uint8ClampedArray(width*height*4)
        var i = 0;
        for (var y=0;y<height;y++) {
            for (var x = 0; x < width; x++) {
                if (y<this.pixels[x].length/4) {
                    imageArray[i++] = this.pixels[x][y*4]
                    imageArray[i++] = this.pixels[x][y*4+1]
                    imageArray[i++] = this.pixels[x][y*4+2]
                    imageArray[i++] = this.pixels[x][y*4+3]
                } else {
                    // black in the end of any columns that are short
                    imageArray[i++] = 0;
                    imageArray[i++] = 0;
                    imageArray[i++] = 0;
                    imageArray[i++] = 0;
                }

            }
        }
        const imageData = new ImageData(imageArray,width)
        const image = imagedata_to_image(imageData)

        image.onload = (() => {   this.regionView.image = image })

    }


    findBestAngle(range=Math.PI/2) {
        const A = this.region.rect[0]
        const B = this.region.rect[1]
        const C = this.region.rect[2]
        const D = this.region.rect[3]

        const center = A.clone().add(B).add(C).add(D).multiplyScalar(0.25)

        var angle = 0;
        var bestAngle = angle;


        var bestDeviation = 0;
        var bestColumn = 0;
        for (angle = -range/2;angle<range/2;angle+=range/180) {
            const A1 = A.clone().rotateAround(center,angle)
            const B1 = B.clone().rotateAround(center,angle)
            const C1 = C.clone().rotateAround(center,angle)
            const D1 = D.clone().rotateAround(center,angle)
            this.calculateColumnSums(A1,B1,C1,D1,false)
            var col,dev;
            [col, dev] = this.findPeakColumn(this.columns[3])
       //     console.log("Angle = "+angle+" col = "+col + "dev = "+dev)
            if (dev > bestDeviation) {
                bestAngle = angle
                bestDeviation = dev
                bestColumn = col;
            }
        }



        // got it, so just rotate the actual corners to this angle
        this.region.rect[0].copy(A.clone().rotateAround(center,bestAngle))
        this.region.rect[1].copy(B.clone().rotateAround(center,bestAngle))
        this.region.rect[2].copy(C.clone().rotateAround(center,bestAngle))
        this.region.rect[3].copy(D.clone().rotateAround(center,bestAngle))


    }


    renderCanvas () {
      //  this.recalculate()

        super.renderCanvas(0)



        this.region.render(this.ctx)
        this.graph.editor.dirty = true;

    }

    onMouseDown(e,mouseX, mouseY) {
//        console.log ("CImageView onMouseDown "+mouseX+","+mouseY)
        this.region.onMouseDown(this, e,mouseX,mouseY)
    }


    onMouseMove(e,mouseX,mouseY) {
//        console.log ("CImageView onMouseMove "+mouseX+","+mouseY)
        this.region.onMouseMove(this, e,mouseX,mouseY)
    }

    onMouseDrag(e,mouseX,mouseY) {
//        console.log ("CImageView onMouseDrag "+mouseX+","+mouseY)
        this.region.onMouseDrag(this, e,mouseX,mouseY)
        this.recalculate();
    }

    onMouseUp(e,mouseX,mouseY) {
        this.region.onMouseUp(this, e,mouseX,mouseY)
    }


}