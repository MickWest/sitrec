const acorn = require("acorn");
const estraverse = require("estraverse");
const escodegen = require("escodegen");
import stringify from "json-stringify-pretty-compact";

function removeQuotesFromKeys(jsonString) {
    // This regular expression matches property names in quotes followed by a colon,
    // which is the JSON format for keys.
    return jsonString.replace(/"([^"]+)":/g, '$1:');
}



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
// this is done by adding quotes to the keys to make it JSON compliant, then parsing it as JSON
export function parseJavascriptObject(jsObjectString) {
    // add quotes to the keys. We need the paranteses to make sure it's evaulated as an object
    const requoted = addQuotesToKeys('(' + jsObjectString + ')');
    // remove the ( and ) from the start and end
    const requotedNoParens = requoted.slice(1, requoted.length - 2);
    const parsed = JSON.parse(requotedNoParens);
    return parsed;

    //  console.log(stringify(parsed, {maxLength: 180, indent: 2}));
}