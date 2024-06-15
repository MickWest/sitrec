// const acorn = require("acorn");
// const estraverse = require("estraverse");
// const escodegen = require("escodegen");

function removeQuotesFromKeys(jsonString) {
    // This regular expression matches property names in quotes followed by a colon,
    // which is the JSON format for keys.
    return jsonString.replace(/"([^"]+)":/g, '$1:');
}


// This takes a string of a javascript object and adds quotes to the keys
// to make it JSON compliant. It then returns the string.
// for example
// {
//     include_pvs14: true,
//     name: "westjet",
//     menuName: "WestJet Triangle",
//     files: {
//         starLink: "westjet/starlink-2023-12-18.tle",
//         cameraFile: "westjet/FlightAware_WJA1517_KPHX_CYYC_20231219.kml",
//     },
// }
//
// becomes
//
// {
//     "include_pvs14": true,
//     "name": "westjet",
//     "menuName": "WestJet Triangle",
//     "files": {
//         "starLink": "westjet/starlink-2023-12-18.tle",
//         "cameraFile": "westjet/FlightAware_WJA1517_KPHX_CYYC_20231219.kml",
//     },
// }
//
// This is done by parsing the string as a javascript object using acorn, then traversing the AST
// and adding quotes to the keys.
// The resulting AST is then converted back to a string using escodegen.
// comments are removed in the process


// function addQuotesToKeys(jsObjectString) {
//     const ast = acorn.parse(jsObjectString, {sourceType: "module", ecmaVersion: 2021});
//     estraverse.traverse(ast, {
//         enter: node => {
//             if (node.type === 'Property' && node.key.type === 'Identifier') {
//                 node.key = {
//                     type: 'Literal',
//                     value: node.key.name,
//                     raw: `"${node.key.name}"`
//                 };
//             }
//         }
//     });
//     // Configure escodegen to use double quotes
//     const codegenOptions = {
//         format: {
//             quotes: 'double' // This tells escodegen to use double quotes for string literals
//         }
//     };
//
//     return escodegen.generate(ast, codegenOptions);
// }


// New ad-hoc parser
// This is a simple parser that
// - adds quotes to the keys of a javascript object
// - removes comments
// - adds a 0 before a decimal point (JSON does not allow numbers to start with a decimal point)
// - converts single quotes to double quotes
// - removes trailing commas
class JSParser {
    constructor(js) {
        this.js = js;
        this.i = 0;
        this.len = js.length;
        this.out = ""
        this.inStringType = false
        this.inArray = false;
    }

    getNext() {
       // get the next character, skipping over comments
        if (this.inStringType === false) {
            if (this.js[this.i] === "/" && this.js[this.i + 1] === "/") {
                //this.out += "COMMENT"
                while (this.i < this.len && this.js[this.i] !== "\n") {
                    // this.out += js[this.i];
                    this.out += " ";
                    this.i++;
                }
            }
        }
        var k = this.js[this.i];



        // we handle both types of string, but want to convert single quotes to double quotes
        if (k === "'" || k === '"') {
            if (this.inStringType === false) {
                this.inStringType = k;
                //   this.out += "+++"
            } else if (this.inStringType === k) {
                this.inStringType = false;
                //    this.out += "---"
            }
        }

        // replace single quotes with double quotes
        // unless we are in a string that was started with a double quote
        if (k === "'" && this.inStringType !== '"') {
            k = '"';
        }



        if (k === "[") {
            this.inArray++;
        } else if (k === "]") {
            this.inArray--;
        }

        this.out += k;
        return this.js[this.i++]
    }

    getNextNonWhitespace() {
        let k = "";
        while (this.i < this.len) {
            k = this.getNext()
            // is k whitespace?
            if (k.trim() !== "") break;
        }
        return k;
    }


    parseStructure(afterBracket = false) {
        // advance to the first {
        if (!afterBracket) {
            while (this.getNext() !== "{") {
                /// change the last character of this.out to a space
                // unless it's a newline
                if (this.out[this.out.length - 1] !== "\n") {
                    this.out = this.out.slice(0, -1) + " ";
                }
                if (this.i >= this.len) {
                    return this.out;
                }
            }
        }
//        this.out += "[START STRUCTURE]"

        // We are now at the first character after a {
        // advance to the first non-whitespace characte
        let k = this.getNextNonWhitespace();
        // now we are at the first character of the first key
        // unless it's a }, in which case we are done
        if (k === "}") {
            return this.out;
        }


        // if it's a " or ' then it's a string key
        // and we don't need to do anything
        // if it's a letter or number then it's an identifier
        // and we need to add quotes
        // if it's a { then it's an object, which is an error, as we don't
        // use objects as keys
        if (k === "{" || k === "[") {
            console.log(this.out)

            console.error("Error parsing object: unexpected character: " + k);


            debugger;
            return this.out;
        }

        // k is the first character of the key
        var done = false;

        while (!done) {
            if (k === "'" || k === '"') {
                // it's a string key
                // so we just copy it over
                // we've already got k at the end of this.out
                // so we just need to copy the rest of the string and the terminating quote
                while (this.i < this.len && this.js[this.i] !== k) {
                    this.out += this.js[this.i];
                    this.i++;
                    this.inStringType = false;
                }
                // if we didn't stop because we reached the end of the string
                // then copy the terminating quote
                if (this.i < this.len) {
                    this.out += '"'; // forcing double quotes
                    this.i++;
                }
            } else {
                // now we know k is the start of a key
                // replace the last character of this.out with a quote, then append k
                // and copy the rest of the key
                this.out = this.out.slice(0, -1) + '"' + k;
                while (this.i < this.len - 1 && this.js[this.i] !== ":"
                    && this.js[this.i].trim() !== "") {
                    this.out += this.js[this.i];
                    this.i++;
                }
                this.out += '"';
            }
            // copy the colon
            this.getNextNonWhitespace();
//            this.out += "[COLON]"

            // now we are after the colon, so the next thing is the value
            k = this.getNextNonWhitespace();
//            this.out += "[THEN k= " + k + "]";
            // if it's a { then it's an object
            // so we can recurse
            if (k === "{") {
                this.parseStructure(true);
                k = this.getNextNonWhitespace();
            } else if (k === ".") {
                // not a structured object and
                // it starts with a dot, but JSON does not handle numbers starting with a dot
                // so we need to add a 0 before the dot, which is now at the end of this.out
                this.out = this.out.slice(0, -1) + "0.";
            }

            // we now need to advance to a comma or a }
            // and copy everything in between. (Copying is handled by getNext)


            if (this.i < this.len - 1) {
                // note we skip commas in strings and arrays
                while ((k !== "," || this.inArray || this.inStringType !== false) && k !== "}" && this.i < this.len - 1)
                {
                    k = this.getNext();
                }
            }
            // we are now at a , or }
            // if a , then we have another potential key
            // (but might also be a trailing ,)
            // if a } then we are done
           // this.out += "[END k = " + k + "]";
            if (this.i >= this.len-1 || k === "}") {
            //    this.out += " [} so done] ";
                done = true;
            } else {
                // we are at a , so skip to next non-ws character
                //this.out += " [HANDLE COMMA] ";
                const commaIndex = this.out.length-1;
                k = this.getNextNonWhitespace();
         //       this.out += " ["+k+" -<"+this.js[this.i-1]+this.js[this.i]+this.js[this.i+1]+">] ";
         //       this.out += "# "+this.inStringType + " " + this.inArray + " # ";

                if (k === "}") {
           //         this.out += " [} after , DONE] ";
                    done = true;
                    // JSON does not like trailing commas, so remove it
                    this.out = this.out.substring(0, commaIndex) + this.out.substring(commaIndex + 1);

                }
                // make sure it's not the start of a comment


                // if we get to here and not done, then we are at the start of a new key
                // so just let the loop continue
            }
        }
    }
}

// test
// const js = `// This file is a Sit definition file for the FLIR1/Nimitz/Tic-Tac video.
// export const SitFlir1 = {
//     name:"flir1",
//     menuName: "FLIR1/Nimitz/Tic-Tac",
//     isTextable: false,
//
//
//     fps: 29.97,
//     frames: 2289,
//     aFrame: 0,
//     bFrame: 2288,
//     startDistance:15,
//     azSlider:{defer:true},
//
//     mainCamera: {
//         startCameraPosition: [-126342.63, 56439.02, 101932.66],
//         startCameraTarget: [-126346.69, 56137.48, 100979.21],
//     },
//
//     terrain: {lat:   31.605, lon:-117.870, zoom:7, nTiles:6},
//
//     files: {
//         Flir1Az: 'flir1/FLIR1 AZ.csv',
//         DataFile: 'flir1/Flir1 FOV Data.csv',
//         TargetObjectFile: './models/FA-18F.glb',
//         ATFLIRModel: 'models/ATFLIR.glb',
//         FA18Model: 'models/FA-18F.glb',
//     },
//     videoFile: "../sitrec-videos/public/f4-aspect-corrected-242x242-was-242x216.mp4",
//
//
//     lookCamera: {},
//
//
//     mainView: {left: 0, top: 0, width: 1, height: 1, background: [0.05, 0.05, 0.05]},
//     lookView: {left: 0.653, top: 0.6666, width: -1, height: 0.3333,},
//     videoView: {left: 0.8250, top: 0.6666, width: -1, height: 0.3333,},
//
//     focusTracks:{
//         "Ground (no track)": "default",
//         "Jet track": "jetTrack",
//         "Traverse Path (UFO)": "LOSTraverseSelect"
//     },
//
//     include_JetLabels: true,
//
//     jetTAS:     {kind: "GUIValue", value: 333, start: 320, end: 360, step: 0.1, desc: "TAS"},
//     elStart:    {kind: "GUIValue", value:5.7, start:4.5,  end: 6.5,  step: 0.001,  desc:"el Start"},
//     elEnd:      {kind: "GUIValue", value: 5,  start:4.5,  end: 6.5,   step:0.001,  desc: "el end"},
//     elNegate:   {kind: "GUIFlag",  value:false, desc: "Negate Elevation"},
//
//     elNormal:   {kind: "Interpolate",  start:"elStart", end:"elEnd"},
//     el:         {kind: "Math", math: "$elNormal * ($elNegate ? -1 : 1)"},
//
//     azRawData:  {kind: "arrayFromKeyframes", file: "Flir1Az", stepped: true},
//     azData:     {kind: "arrayFromKeyframes", file: "Flir1Az"},
//
//     azEditor: { kind: "CurveEditor",
//         visible: true,
//         left:0, top:0.5, width:-1,height:0.5,
//         draggable:true, resizable:true, shiftDrag: true, freeAspect: true,
//         editorConfig: {
//             useRegression:true,
//             minX: 0, maxX: "Sit.frames", minY: -10, maxY: 10,
//             xLabel: "Frame", xStep: 1, yLabel: "Azimuth", yStep: 5,
//             points:[0,4.012,352.26,4.779,360.596,3.486,360.596,2.354,999.406,1.259,999.406,0.138,1833.796,-4.44,1833.796,-5.561,2288,-8.673,2189,-8.673],        },
//         frames: -1, // -1 will inherit from Sit.frames
//     },
//
//     azLinear: { kind: "Interpolate", start: 5, end: -8,},
//     }
// `
// console.log(js);
// console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
// const parser = new JSParser(js);
// parser.parseStructure();
// console.log(parser.out);
// debugger;



// given  text string of a javascript object, parse it and return the object
// this is done by adding quotes to the keys to make it JSON compliant
// then parsing it as JSON
// syntax errors are not handled, but get reported in the console
// note you can't use expressions in the object (like 1/2), only literals (0.5)
export function parseJavascriptObject(jsObjectString) {
    // add quotes to the keys. We need the parentheses to make sure it's evaulated as an object
    const parser = new JSParser(jsObjectString);
    parser.parseStructure();
    const requoted = parser.out;

    // console.log(requoted)
    // const lines = requoted.split("\n");
    // for (let i = 0; i < lines.length; i++) {
    //    console.log((i+1) + ": " + lines[i]);
    // }

    const parsed = JSON.parse(requoted);
    return parsed;

    //  console.log(stringify(parsed, {maxLength: 180, indent: 2}));
}