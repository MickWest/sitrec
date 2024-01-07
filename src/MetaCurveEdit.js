/////////////////////////////////////////////////////////////////////////
// Bezier code editor and utilites by Mick West
// regression module: https://github.com/Tom-Alexander/regression-js (MIT license)
import regression from './js/regression'
import {assert} from "./utils"

//const result = regression.polynomial([[0, 1], [32, 67], [12, 79]], {order:2});
//const gradient = result.equation[0];
//const yIntercept = result.equation[1];


function remove(arr, item) {
    var i;
    for(i = arr.length; i--;) {
        if(arr[i] === item) {
            arr.splice(i, 1);
        }
    }
}

function Point(x, y) {
    this.x = x;
    this.y = y;
    this.mul = function(k) {
        return new Point(this.x * k, this.y * k);
    };
    this.add = function(p) {
        return new Point(this.x + p.x, this.y + p.y);
    };

}

// given an array of X,Y,X,Y,X,Y,... points, sort them into Y ascending order
function sortPointsY(p) {
  //  for a simple array of points you can just do this
  //  p.sort(function(a,b) {return a.y-b.y;});
  // but we want to sort only on the curve points, not control points

    var change = false;
    // just an ad-hoc head sort.
    var len = p.length;
    var start = 0;
    while (start < p.length-2){
        var sorted = true;
        var n = start;
        while (n<len) {
            if (p[n].y < p[start].y ) {
            //    console.log ("swapping "+start+" and "+n)
                var t = p[n];
                p[n] = p[start]
                p[start] = t;
                t = p[n+1];
                p[n+1] = p[start+1]
                p[start+1] = t;
                change = true;
            }
            n += 2
        }
        start +=2
    }
    return change;
}

// given an array of X,Y,X,Y,X,Y,... points, sort them into Y ascending order
function sortPointsX(p) {
    //  for a simple array of points you can just do this
    //  p.sort(function(a,b) {return a.y-b.y;});
    // but we want to sort only on the curve points, not control points

    var change = false;
    // just an ad-hoc head sort.
    var len = p.length;
    var start = 0;
    while (start < p.length-2){
        var sorted = true;
        var n = start;
        while (n<len) {
            if (p[n].x < p[start].x ) {
                //    console.log ("swapping "+start+" and "+n)
                var t = p[n];
                p[n] = p[start]
                p[start] = t;
                t = p[n+1];
                p[n+1] = p[start+1]
                p[start+1] = t;
                change = true;
            }
            n += 2
        }
        start +=2
    }
    return change;
}



// Given two points a and b, and a time t (0 .. 1) calculate the intermediate point that's t along the line a->b
function tween(a,b,t) {
    var f = new Point(a.x,a.y);
    f.x += (b.x-a.x)*t;
    f.y += (b.y-a.y)*t;
    return f;
}

// given a series of [x,y] points in ps and a parametric time t, find the point along the curve
// this could be a lot faster if we store the numbers simpler
// can even seperate out x and y and just work with one of them
// (like for finding t for a particular y value, you don't need all those x values)
function BezierPoint(ps, t) {

    var segments = Math.floor(ps.length/2) - 1;  // 4 points is one segment, 6 points is two
    var seg = Math.floor(segments * t);

    // patch for t === 1.00000000
    // would put us past the last segment, so just stay in it. Math works fine.
    if (seg === segments)
        seg = segments-1;

    // convert t to a range 0..1 for this segment
    t = (t - seg/segments)*segments;  // so
    // for point naming, see: http://www.deluge.co/sites/deluge.co/files/benzier.gif

 //   console.log ("Seg= "+seg+" t="+t)

    var p0 = ps[seg*2];   // first point
    var p1 = ps[seg*2+1]; // first control
    var p2 = ps[seg*2+3]; // second control
    var p3 = ps[seg*2+2]; // second point

    if (seg>0) {
        p1 = new Point( 2 * p0.x - p1.x, 2 * p0.y - p1.y);
    }


    var p01 = tween(p0,p1,t);
    var p12 = tween(p1,p2,t);
    var p23 = tween(p2,p3,t);
    var p012 = tween(p01,p12,t);
    var p123 = tween(p12,p23,t);
    return tween(p012,p123,t);
}


function BezierXfromY(ps, y) {

    var l = ps.length -2;
    // check first for y being off the end off the curve
    // assumes the points are sorted in Y-ascending order
    if (y < ps[0].y)
        return ps[0].x;
    if (y > ps[l].y)
        return ps[l].x


    // we now know that there will be a value we can return

    // we start in the middle of the curve, if Y is close enough then return x
    var t;
    // t is the midpoint of a and b
    // we adjust t by adjusting a and b t
    var a = 0;
    var b = 1;
    var x;
    var maxLoops =100;
    while (true) {
        var t = (a+b)/2;
        var p = BezierPoint(ps, t);
        //console.log("t = "+t+" p=("+p.x+","+p.y+") y="+y)

        if (maxLoops === 0 || Math.abs(y-p.y) < 0.001) {
            return p.x;
        }
        if (y<p.y) {
            b = t;
        } else {
            a = t;
        }
        maxLoops--;
    }
}

function BezierYfromX(ps, x) {

    var l = ps.length -2;
    // check first for y being off the end off the curve
    // assumes the points are sorted in Y-ascending order
    if (x < ps[0].x)
        return ps[0].y;
    if (x > ps[l].x)
        return ps[l].y


    // we now know that there will be a value we can return

    // we start in the middle of the curve, if Y is close enough then return x
    var t;
    // t is the midpoint of a and b
    // we adjust t by adjusting a and b t
    var a = 0;
    var b = 1;
    var x;
    var maxLoops =100;
    while (true) {
        var t = (a+b)/2;
        var p = BezierPoint(ps, t);
        //console.log("t = "+t+" p=("+p.x+","+p.y+") y="+y)

        if (maxLoops === 0 || Math.abs(x-p.x) < 0.00000001) {
            return p.y;
        }
        if (x<p.x) {
            b = t;
        } else {
            a = t;
        }
        maxLoops--;
    }
}




// class for bezier curves
function BezierCurve() {
    this.ps = []
}



class MetaBezierCurveEditor {

    constructor(p) {


        if (p.points == undefined) {
            p.points = []
        }

        this.lines = p.lines;

        this.c = p.canvas;   /// don't think we need this after construction

        this.lastMouseX = 0
        this.lastMouseY = 0

        this.p = p;

        this.fillCanvas = p.fillCanvas

        this.useRegression = p.useRegression;

        this.compareNode = p.compareNode;

        this.dynamicY = p.dynamicY

        this.sortedY = false;

        this.keepYOrder = false;  // if this is true then don't let the user drag points verticaly past adjacent points

        this.clampFirstY = false;

        this.clampXEnds = true


        this.noVerticalLines = p.noVerticalLines ?? false;

        // min and max are for the data
        this.min = {x: p.minX, y: p.minY};
        this.max = {x: p.maxX, y: p.maxY};

        this.onChange = p.onChange;

        this.xLabel = p.xLabel;
        this.xStep = p.xStep;
        this.yLabel = p.yLabel;
        this.yStep = p.yStep;

        var rangeY = p.maxY - p.minY;
        var minYStep = Math.floor(rangeY / 20);
        if (this.yStep < minYStep) {
//            console.log("Adjusting yStep to " + minYStep)
            this.yStep = minYStep;
        }

        var rangeX = p.maxX - p.minX;
        var minXStep = Math.floor(rangeX / 10);
        if (this.xStep < minXStep) {
//            console.log("Adjusting xStep to " + minXStep)
            this.xStep = minXStep;
        }


        this.topGradient = 0        //-0.00198;   //  -1.98°C per 1000 feet, ICAO https://en.wikipedia.org/wiki/International_Standard_Atmosphere#ICAO_Standard_Atmosphere
        this.override = false;
        this.disable = false;


        this.xLabel2 = p.xLabel2;


        this.resize = function () {
            this.c.width = this.c.clientWidth;
            this.c.height = this.c.clientHeight;


            if (this.fillCanvas) {
                this.g = {
                    x: 0,
                    y: 0,
                    w: this.c.width,
                    h: this.c.height,
                }
            } else {
                // g is the graph window in which we draw the graph
                // coordinate are relative to the canvas
                // so g.y,g.y is the top left offset from (0,0) in the canvas (in canvas pixels)
                // and g.w,g.h is the width and height of the graph in canvas pixels
                this.g = {
                    x: 50,
                    y: 5,
                    w: this.c.width - 58,
                    h: this.c.height - 54,
                };
                if (this.xLabel2 != undefined) {
                    this.g.y += 20;
                    this.g.h -= 20;
                    // debugger;
                }
            }

        }

        this.resize();
        this.ctx = this.c.getContext("2d");
        // define major and minor steps for the grid

        this.major = {
            x: 1,
            y: 20,
        }

        this.minor = {
            x: 0.1,
            y: 5,
        }

        this.mouseIsDown = false;
        this.moved = false;
        this.selectedPoint = null;
        this.selectedPointIndex = 0;

        this.curve = new BezierCurve();

        this.curve.ps.push(new Point(this.C2DX(this.c.clientWidth / 2 - 15), this.C2DY(this.c.clientHeight / 2 - 80))); //
        this.curve.ps.push(new Point(this.C2DX(this.c.clientWidth / 2 - 10), this.C2DY(this.c.clientHeight / 2 - 60)));
        this.curve.ps.push(new Point(this.C2DX(this.c.clientWidth / 2 + 5), this.C2DY(this.c.clientHeight / 2 + 30)));
        this.curve.ps.push(new Point(this.C2DX(this.c.clientWidth / 2 - 5), this.C2DY(this.c.clientHeight / 2)));

        if (p.points) this.setPointsFromFlatArray(p.points)


        if (this.sortedY) {
            sortPointsY(this.curve.ps);
        }

        // Note use of .bind(this) on the event handler functions declared here
        // this makes them be called in the context of this object

        this.c.addEventListener("mousedown", (function (e) {
            this.mouseDown(e)
        }).bind(this), false);


        this.c.addEventListener("mouseup", (function (e) {
            this.mouseFinished(e)
        }).bind(this), false);


        this.c.addEventListener("mouseleave", (function (e) {
            this.mouseFinished(e)
        }).bind(this), false);


        this.c.addEventListener("mousemove", (function (e) {
            this.mouseMove(e)
        }).bind(this), false);

    // disable right click menu
        this.c.addEventListener("contextmenu", e => e.preventDefault());

        this.dirty = true;
        this.update();
        this.dirty = true;


    } // end of constructor

    /*

       Canvas (0,0) (y down)
        +---------------------------------------------------------------------------------+
        |                                                                                 |
        |                                                                                 |
        |     (g.x,g.y)                                                                   |
        |       +--------------------------------------------------------------*          |
        |       |                                                              |          |
        |       |                                                              |          |
        |       |                                                              |          |
        |       |                                                              |          |
        |       |                                                              |          |
        |       |                                                              |          |
        |       |                                                              |          |
        |       |                                                              |g.h       |c.height
        |       |                                                              |          |
        |       |                    graph area                                |          |
        |       |                                                              |          |
        |       |                                                              |          |
        |       |                                                              |          |
        |       |                                                              |          |
        |       |                                                              |          |
        |       |                                                              |          |
        |       |                                                              |          |
        |       |                                                              |          |
        |       |data origin (y up)                                            |          |
        |       +--------------------------------------------------------------*          |
        |                              g.w                                                |
        |       Axes area                                                                 |
        |                                                                                 |
        +---------------------------------------------------------------------------------+
                                        c.width

     */


    // The coordinate systems are C (Canvas) and D (Data)
    // Canvas is defined as (0,0) to (c.width, c.height), and is the coordinate system for rendering and mouse events
    // Data is defined as (min.x, min.y) to (max.y, max.y), it is what we store, and what is returned
    // C2D and D2C convert from on system to the other
    // commented out versions ignore

    /*
        this.C2DX = function (canvas_x) { return this.min.x + canvas_x * (this.max.x-this.min.x)/this.c.width;  };
        this.C2DY = function (canvas_y) { return this.min.y + (this.c.height - canvas_y) * (this.max.y-this.min.y)/this.c.height; };

        this.D2CX = function (data_x)   { return (data_x - this.min.x) * this.c.width/(this.max.x-this.min.x);  };//
        this.D2CY = function (data_y)   { return this.c.height - (data_y - this.min.y) * this.c.height/(this.max.y-this.min.y); };
    */

    // Canvas coordinate to data coortdinate, assuming data is mapped to the rectange defined by g
    C2DX(canvas_x) {
        return this.min.x + (canvas_x - this.g.x) * (this.max.x - this.min.x) / this.g.w;
    };

    C2DY(canvas_y) {
        return this.min.y + (this.g.h - (canvas_y - this.g.y)) * (this.max.y - this.min.y) / this.g.h;
    };

    // D2C will convert a data point to a position in the canvas, in the rectangle defined by g
    D2CX(data_x) {
        return this.g.x + (data_x - this.min.x) * this.g.w / (this.max.x - this.min.x);
    };

    D2CY(data_y) {
        return this.g.y + this.g.h - (data_y - this.min.y) * this.g.h / (this.max.y - this.min.y);
    };


    drawPoint(p, color) {
        if (!this.disable) {

            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            var canvasX = this.D2CX(p.x);
            var canvasY = this.D2CY(p.y);
            this.ctx.arc(canvasX, canvasY, 5, 0, Math.PI * 2);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }


    // return X from Y for current editing curve.
    getX(y) {

        if (this.override) {
            return this.curve.ps[0].x + (y - this.curve.ps[0].y) * this.topGradient;
        }

        var l = this.curve.ps.length;
        if (y > this.curve.ps[l - 2].y) {
            var x = this.curve.ps[l - 2].x + (y - this.curve.ps[l - 2].y) * this.topGradient;
            return x;
        } else {
            return BezierXfromY(this.curve.ps, y);
        }
    }

    getY(x) {
        if (this.useRegression) {
            return this.poly.predict(x)[1]
        } else {
            return BezierYfromX(this.curve.ps, x);
        }
    }


    insideGraph(x, y) {
        // note y is inverted data vs context
        return x >= this.D2CX(this.min.x) && y <= this.D2CY(this.min.y) && x <= this.D2CX(this.max.x) && y >= this.D2CY(this.max.y);

    }

    recalculate() {
        if (this.useRegression) {
            var data = []
            var n = 0;
            for (var i=0;i<this.curve.ps.length;i+=2) {
                data.push([this.curve.ps[i].x,this.curve.ps[i].y])
                n++
            }
            this.poly = regression.polynomial(data,{order: n-1, precision:16})
            //    var p = result.predict(x)
            //    if (x===10)
            //        console.log(result)
            //    return p[1];
        }
    }


    drawLines(lines) {
        var ctx = this.ctx;
        lines.forEach(line => {
            ctx.beginPath();
            ctx.strokeStyle = line.color;
            ctx.fillStyle = line.color;
            ctx.lineWidth = 1
            if (line.y !== undefined) {
                ctx.moveTo(this.D2CX(this.min.x), this.D2CY(line.y));
                ctx.lineTo(this.D2CX(this.max.x), this.D2CY(line.y));
                ctx.stroke();
            } else {
                if (line.x2 !== undefined) {
                    ctx.rect(this.D2CX(line.x), this.D2CY(this.min.y),
                        this.D2CX(line.x2)-this.D2CX(line.x), this.D2CY(this.max.y)-this.D2CY(this.min.y)
                        )
                    ctx.fill();
                    ctx.stroke();
                } else {

                    ctx.moveTo(this.D2CX(line.x), this.D2CY(this.min.y));
                    ctx.lineTo(this.D2CX(line.x), this.D2CY(this.max.y));
                    ctx.stroke();
                }
            }


        })
    }


    update() {

        if (!this.dirty) {
            return;
        }
        this.dirty = false;


        if (this.yLabel === "Turn Rate") {
            console.log("Update dirty Turn Rate")
        }

        if (this.yLabel === "Azimuth") {
            console.log("Update dirty Azimuth")
        }


        this.recalculate()
        this.resize();

        var realMinY =  10000000000
        var realMaxY = -10000000000

        var len = this.curve.ps.length;

        // clamp to three digits of precision
        for (var i = 0; i < len; i++) {
            this.curve.ps[i].x = +this.curve.ps[i].x.toFixed(3)
            this.curve.ps[i].y = +this.curve.ps[i].y.toFixed(3)
        }

        if (this.clampFirstY)
            this.curve.ps[0].y = 0;

        if (this.topGradient !== 0) {

            this.curve.ps[len - 1].x = this.curve.ps[len - 2].x + this.topGradient * (this.curve.ps[len - 1].y - this.curve.ps[len - 2].y);
        }


        var ctx = this.ctx;


//        ctx.fillStyle = "rgba(255, 255, 255, 0.0)";  // transparent white (color should not be important, just alpha = 1.0)
//        ctx.fillStyle = "white";
//        ctx.clearRect(0, 0, this.c.clientWidth, this.c.clientHeight);

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

//        ctx.fillStyle = "red";
//        ctx.fillRect(this.D2CX(this.min.x), this.D2CY(this.min.y), this.D2CX(this.max.x)-this.D2CX(this.min.x), this.D2CY(this.max.y)-this.D2CY(this.min.y));

        /*
        old green for ground
        ctx.fillStyle = "#c0ffc0";
        ctx.fillRect(this.D2CX(this.min.x), this.D2CY(this.min.y), this.D2CX(this.max.x) - this.D2CX(this.min.x), this.D2CY(0) - this.D2CY(this.min.y));
*/

        // X axis
        ctx.fillStyle = "black";
        ctx.font = "12px Arial";
        // Draw major vertical gridlines
        ctx.textAlign = "center";
        for (var x = this.min.x; x <= this.max.x; x += this.xStep) {

            if (!this.noVerticalLines) {
                ctx.beginPath();
                ctx.strokeStyle = "#808080";
                ctx.lineWidth = 1
                ctx.moveTo(this.D2CX(x), this.D2CY(this.min.y));
                ctx.lineTo(this.D2CX(x), this.D2CY(this.max.y));
                ctx.stroke();
            }

            ctx.fillText("" + x, this.D2CX(x), this.D2CY(this.min.y) + 15);

        }


        assert(this.yStep > 0, "MetaBezierCurveEditor needs positive non-zero yStep, but it's "+this.yStep )

        // Y Axis
        ctx.textAlign = "right";
        for (var y = this.min.y; y < this.max.y + 1; y += this.yStep) {
            ctx.beginPath();
            ctx.strokeStyle = "#808080";
            ctx.lineWidth = 1
            ctx.moveTo(this.D2CX(this.min.x), this.D2CY(y));
            ctx.lineTo(this.D2CX(this.max.x), this.D2CY(y));
            ctx.stroke();

            var y2 = parseFloat(y.toFixed(2))

            ctx.fillText("" + y2, this.D2CX(this.min.x) - 2, this.D2CY(y) + 6);


        }

        ctx.font = "20px Arial";

        ctx.textAlign = "center";
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(this.yLabel, -this.g.h / 2, 20);
        ctx.rotate(+Math.PI / 2);

        // possible second x axis label.
        if (this.xLabel2 != undefined) {
            ctx.font = "20px Arial";
            ctx.textAlign = "center";
            ctx.fillText(this.xLabel2, this.g.x + this.g.w / 2, this.g.y - 15);
        }


        var color;
        ctx.lineWidth = 2
        var bezierColor = "red";
        var valueColor = "grey"
        if (this.override) {
            valueColor = "red"
        }

// /// LING LINE LONEMEKMDKFMKD F
//         ctx.beginPath();
//         ctx.strokeStyle = "#00FF00";
//         ctx.moveTo(this.D2CX(par.frame), this.D2CY(0));
//         ctx.lineTo(this.D2CX(par.frame), this.D2CY(20));
//         ctx.stroke();



        if (this.disable) {
            valueColor = "red"
            ctx.lineWidth = 0.25
        }

        var pointsToDraw = len;
        if (this.override) {
            pointsToDraw = 1;
        }
        for (var i = 0; i < pointsToDraw; i++) {
            if (i % 2 === 0) {
                if (!this.override && !this.useRegression) {
                    ctx.beginPath();
                    ctx.strokeStyle = "#90b091";
                    ctx.moveTo(this.D2CX(this.curve.ps[i].x), this.D2CY(this.curve.ps[i].y));
                    ctx.lineTo(this.D2CX(this.curve.ps[i + 1].x), this.D2CY(this.curve.ps[i + 1].y));
                    ctx.stroke();
                }
                color = "black"
                this.drawPoint(this.curve.ps[i], color);

            } else {
                if (!this.useRegression) {
                    color = "green";
                    var p1 = this.curve.ps[i];  // control point
                    this.drawPoint(p1, color);
                    var p0 = this.curve.ps[i - 1]  // the data point
                    //other (virtual) control point
                   // var pOther = new Point(2 * p0.x - p1.x, 2 * p0.y - p1.y);
                   // this.drawPoint(pOther, color);
                }
            }
        }


        /*
        ctx.strokeStyle = valueColor;
        ctx.beginPath();
        for (var y = this.min.y; y < this.max.y; y += (this.max.y-this.min.y)/100) {
            var x = this.getX(y)
            ctx.lineTo(this.D2CX(x), this.D2CY(y));
        }
        ctx.stroke();
        */

        if (this.curve.ps.length > 0) {
            ctx.strokeStyle = valueColor;
            ctx.beginPath();
            for (var x = this.min.x; x < this.max.x; x += (this.max.x - this.min.x) / 100) {
                var y = this.getY(x)
                ctx.lineTo(this.D2CX(x), this.D2CY(y));
            }
            ctx.stroke();


            if (!this.override && !this.useRegression) {
                ctx.strokeStyle = bezierColor;
                ctx.beginPath();
                for (var t = 0; t <= 1; t += 0.05 / this.curve.ps.length) {
                    var p = BezierPoint(this.curve.ps, t);
                    ctx.lineTo(this.D2CX(p.x), this.D2CY(p.y));
                    if (p.y > realMaxY) realMaxY = p.y
                    if (p.y < realMinY) realMinY = p.y
                }
                ctx.lineTo(this.D2CX(this.curve.ps[this.curve.ps.length - 2].x), this.D2CY(this.curve.ps[this.curve.ps.length - 2].y));
                ctx.stroke();
            }
        }

        var first, last

        if (this.compareNode) {

            var nodes
            if (Array.isArray(this.compareNode))
                nodes = this.compareNode;
            else
                nodes = [this.compareNode]


            nodes.forEach( compareNode => {
                var oldMinY = this.min.y
                var oldMaxY = this.max.y

                if (compareNode.min != undefined) {
                    this.min.y = compareNode.min;
                    this.max.y = compareNode.max;
                }


                if (compareNode.lines !== undefined) {
                    this.drawLines(compareNode.lines)
                }

                ctx.strokeStyle = compareNode.color;
                ctx.lineWidth = 1 // compareNode.lineWidth ?? 1
                ctx.beginPath();

                first = compareNode.v(0)
                last = compareNode.v(this.max.x-1)

                var started = false;
                for (var x = this.min.x; x < this.max.x; x++) {
                    var y = compareNode.v(x)

                    if (y > realMaxY) realMaxY = y
                    if (y < realMinY) realMinY = y


                    if (!started) {
                        started = true;
                        ctx.moveTo(this.D2CX(x), this.D2CY(y))
                    } else {
                        ctx.lineTo(this.D2CX(x), this.D2CY(y))
                    }
                }


                ctx.stroke();

                this.min.y = oldMinY
                this.max.y = oldMaxY

            })


            if (this.dynamicY) {
                var range = this.p.dynamicRange
                if (range !== undefined) {
                    let spread = realMaxY - realMinY
                    if (spread < range) {
                        let mid = (realMaxY + realMinY)/2
                        realMinY = mid - range/2
                        realMaxY = mid + range/2
                    }
                }
                if (realMinY !== realMaxY) {
                    this.min.y = realMinY
                    this.max.y = realMaxY
                } else {
                    // min and max are the same
                    // meaning we have a constant value in a dynamic graph
                    // so just use that value +/-1
                    this.min.y = realMinY-1
                    this.max.y = realMinY+1
                }

                assert(this.min.y != this.max.y, "min and max y the same! = "+this.min.y)
                this.yStep = (this.max.y-this.min.y)/10
            }


        }


        if (this.lines !== undefined) {
            this.drawLines(this.lines)
        }

        ctx.font = "20px Arial";

        ctx.textAlign = "center";
        if (this.p.xLabelDelta) {
            let delta = last - first
            let deltaInfo = `${delta>0?'+':''}${delta.toFixed(0)}`

            ctx.fillText(deltaInfo, this.g.x + this.g.w / 2, this.c.height - 15);

        } else {
            ctx.fillText(this.xLabel, this.g.x + this.g.w / 2, this.c.height - 15);
        }



/*
//this was the old method of getting in another line, passing in a function f2(y)
// y specific, as in the old refraction sim
        if (this.useF2 && this.p.f2 != undefined) {
            ctx.strokeStyle = "blue";
            ctx.beginPath();
            var startX = this.p.f2(0)
            var midX = (this.min.x + this.max.x) / 2
            ctx.lineWidth = 0.25
            var thin = true;
            for (var y = this.min.y; y <= this.max.y; y += (this.max.y - this.min.y) / 100) {
                var x = this.p.f2(y)

                if (thin && y > 0) {
                    thin = false;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.lineWidth = 1.0

                }

                ctx.lineTo(this.D2CX(x - startX + midX), this.D2CY(y));
            }
            ctx.stroke();
        }
*/

    }


    selectPointAt(x, y) {
        var len = this.curve.ps.length;
        for (var i = 0; i < len; i++) {
            var d = Math.sqrt(Math.pow(this.D2CX(this.curve.ps[i].x) - x, 2) + Math.pow(this.D2CY(this.curve.ps[i].y) - y, 2));
            if (d <= 10) {
                // if we've already got a selected point, then only select a new one if it's a control point
                // this avoids control points being "hidden" by their curve points.
                if (!this.selectedPoint || (i & 1 === 1)) {
                    this.selectedPoint = this.curve.ps[i];
                    this.selectedPointIndex = i;
                }
            }
        }
    }


    mouseDown(e) {

        // we use shift key to drag the window, so ignore mouse down if shift pressed
     //   if (e.shiftKey) return;

        // only allow clicking if inside the graph area
        if (!this.insideGraph(e.layerX, e.layerY)) return;


        this.mouseIsDown = true;
        if (!this.override && !this.disable) {
            this.selectPointAt(e.layerX, e.layerY);

            if (e.button == 2) {

                if (this.selectedPoint != null && this.curve.ps.length > 4) {
                    // right button removes
                    this.curve.ps.splice(2 * Math.floor(this.selectedPointIndex / 2), 2);
                    this.selectedPoint != null;
                    this.mouseIsDown = false;
                    this.recalculate()
                    this.onChange();
                    this.dirty=true;
                    console.log("+++ Set Editor DIRTY here")


                    e.preventDefault();
                    e.stopPropagation();
                }
                return false;
            }


            if (this.selectedPoint != null) {
                return;
            }

            this.curve.ps.push(new Point(this.C2DX(e.layerX), this.C2DY(e.layerY)));
            this.curve.ps.push(new Point(this.C2DX(e.layerX), this.C2DY(e.layerY + 25)));
            sortPointsX(this.curve.ps);
            this.recalculate()
            this.onChange();
            this.dirty=true;
            console.log("+++ Set Editor DIRTY here")

        }


    }

    mouseFinished(e) {
        //        if (this.selectedPoint && !this.moved && this.curve.ps.length>4) {
//            this.curve.ps.splice(2*Math.floor(this.selectedPointIndex/2), 2);
//        }
        this.mouseIsDown = false;
        this.moved = false;
        this.selectedPoint = null;
        this.update();
        console.log("                points:["+this.getProfile().toString()+"],")
    }


    mouseMove(e) {
        if (!this.override && !this.disable) {
            // only allow dragging a selected point inside the graph area
            if (this.selectedPoint /* && this.insideGraph(e.layerX, e.layerY)*/) {
                this.moved = true;
//                var move_x = (this.C2DX(e.layerX) - this.selectedPoint.x);
//                var move_y = (this.C2DY(e.layerY) - this.selectedPoint.y);
                var move_x = (this.C2DX(e.layerX) - this.C2DX(this.lastMouseX))/1;
                var move_y = (this.C2DY(e.layerY) - this.C2DY(this.lastMouseY))/1;
                if (this.clampFirstY && this.selectedPointIndex == 0) {

                    move_y = 0;
                }

                if (this.clampXEnds
                    && (this.selectedPointIndex == 0
                        || this.selectedPointIndex == this.curve.ps.length-2)) // -2 as the last one is the control point
                {
                    move_x = 0;
                }

                // if we want to keep the y order, then don't allow movement past adjacent points vertically
                // but only for the even points (back, data points)
                if (this.keepYOrder && (this.selectedPointIndex % 2 == 0)) {
                    if (move_y > 0 && this.selectedPointIndex < this.curve.ps.length - 2
                        && (this.selectedPoint.y + move_y > this.curve.ps[this.selectedPointIndex + 2].y)) {
                        move_y = 0;
                    } else {
                        if (move_y < 0 && this.selectedPointIndex > 0
                            && (this.selectedPoint.y + move_y < this.curve.ps[this.selectedPointIndex - 2].y)) {
                            move_y = 0;
                        }
                    }
                }

                if (this.topGradient != 0 && this.selectedPointIndex == this.curve.ps.length - 1) {
                    move_x = move_y * this.topGradient
                }


                // move the point we clicked on
                this.selectedPoint.x += move_x;
                this.selectedPoint.y += move_y;
                // if it's a curve point then also move the next point, which is the control point
                if ((this.selectedPointIndex & 1) === 0) {
                    this.curve.ps[this.selectedPointIndex + 1].x += move_x;
                    this.curve.ps[this.selectedPointIndex + 1].y += move_y;
                }

                // If the shift key is down, then continue to move all the nect points (points above this one)

                if (e.shiftKey && (this.selectedPointIndex % 2) == 0) {
                    var i = this.selectedPointIndex + 2;
                    while (i < this.curve.ps.length) {
                        this.curve.ps[i].x += move_x;
                        this.curve.ps[i].y += move_y;
                        i++;
                    }
                }

                //     if (!this.keepYOrder) {
                // after we move we may need re-sort the points and re-select the one we were dragging
                if (sortPointsX(this.curve.ps)) {

                    this.selectedPoint = null;
                    this.selectPointAt(e.layerX, e.layerY);
                }
                //    }
                this.recalculate()
                this.onChange();
                this.dirty=true;
                console.log("+++ Set Editor DIRTY here")


            }
            this.update();

            var ctx = this.ctx;

            // highlight the one we are hovering over
            var len = this.curve.ps.length;
            for (var i = 0; i < len; i++) {
                if (i%2 == 0 || !this.useRegression) {
                    var d = Math.sqrt(Math.pow(this.D2CX(this.curve.ps[i].x) - e.layerX, 2) + Math.pow(this.D2CY(this.curve.ps[i].y) - e.layerY, 2));
                    if (d <= 10) {
                        ctx.fillStyle = "green";
                        if (i % 2 === 0) {
                            ctx.fillStyle = "black"
                        }
                        ctx.beginPath();
                        ctx.arc(this.D2CX(this.curve.ps[i].x), this.D2CY(this.curve.ps[i].y), 8, 0, Math.PI * 2);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
            }
        }
        this.lastMouseX = e.layerX;
        this.lastMouseY = e.layerY;
    }

    setPointsFromFlatArray(a) {
        var l = a.length;
        this.curve = new BezierCurve();
        for (var i = 0; i < l; i += 2) {
            this.curve.ps.push(new Point(a[i], a[i + 1]));
        }
        if (this.sortedY) {
            sortPointsY(this.curve.ps);
        }
        this.update()
    }

    getProfile() {
        var profile = []
        var len = this.curve.ps.length;
        for (var i = 0; i < len; i++) {
            profile[i * 2] = this.curve.ps[i].x
            profile[i * 2 + 1] = this.curve.ps[i].y
        }
        return profile;
    }
}
export {MetaBezierCurveEditor}