const acorn = require("acorn");
const estraverse = require("estraverse");
const escodegen = require("escodegen");
import stringify from "json-stringify-pretty-compact";

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


function addQuotesToKeys(jsObjectString) {
    const ast = acorn.parse(jsObjectString, {sourceType: "module", ecmaVersion: 2021});
    estraverse.traverse(ast, {
        enter: node => {
            if (node.type === 'Property' && node.key.type === 'Identifier') {
                node.key = {
                    type: 'Literal',
                    value: node.key.name,
                    raw: `"${node.key.name}"`
                };
            }
        }
    });
    // Configure escodegen to use double quotes
    const codegenOptions = {
        format: {
            quotes: 'double' // This tells escodegen to use double quotes for string literals
        }
    };

    return escodegen.generate(ast, codegenOptions);
}

// given  text string of a javascript object, parse it and return the object
// this is done by adding quotes to the keys to make it JSON compliant (see addQuotesToKeys),
// then parsing it as JSON
// syntax errors are not handled, but get reported in the console
// note you can't use expressions in the object (like 1/2), only literals (0.5)
export function parseJavascriptObject(jsObjectString) {
    // add quotes to the keys. We need the paranteses to make sure it's evaulated as an object
    const requoted = addQuotesToKeys('(' + jsObjectString + ')');
    // remove the ( and ) from the start and end
    const requotedNoParens = requoted.slice(1, requoted.length - 2);
    const parsed = JSON.parse(requotedNoParens);
    return parsed;

    //  console.log(stringify(parsed, {maxLength: 180, indent: 2}));
}