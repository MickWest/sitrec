// CNodeMath implements a node that does math operations on other nodes
// Unlike CNodeCode, it's secure, because it only allows a limited set of operations
// using the math.js library. https://mathjs.org/
// usage like this:
// new CNodeMath({
//     id: "math",
//     inputs: {a: "someNode", b: "someNode"}
//     math: "a+b",
// }
// OR
// new CNodeMath({math: "node:someNode + node:someOtherNode"})
//
// in script:
// aSum: {math:"node:nodeA + node:nodeB"}
//
// npm install mathjs --save-dev
//
// It's not particulalry fast, but it's secure.


import {CNode} from "./CNode";
import {NodeMan, Sit} from "../Globals";

import {assert} from "../assert.js";
const math = require('mathjs')


export class CNodeMath extends CNode {
    constructor(v) {
        super(v);
        this.frameless = true; // set to indicate that this node does not need a frame number, but will pass the frame number to inputs
        this.mathOriginal = v.math
        this.math = this.stripComments(this.mathOriginal)

        // find any node variable and add them to the inputs
        // this ensures that the node is recalculated when the input nodes change
        // and hence other nodes that depend on this node will also be recalculated
        let matches = this.getNodeVariables(this.math)
        for (let match of matches) {
            let id = match.slice(1); // remove the leading $
            assert(NodeMan.exists(id), "CNodeMath: node variable does not exist, id: " + id)
            let node = NodeMan.get(id);
            this.addInput(node.id, node.id)
            console.log("CNodeMath: adding input: "+ node.id+" to "+this.id);
        }
    }


    stripComments(expression) {
        // strip comments from the string
        // anything from a // to a newline
        expression = expression.replace(/\/\/.*\n/g, "\n")
        // and strip out any comments in the form /* ... */
        expression = expression.replace(/\/\*.*\*\//g, "")
        return expression
    }

    getNodeVariables(expression) {
        let re = /\$\w+/g
        return expression.match(re)
    }

    getValueFrame(f) {
        let expression = this.math;
        let matches = this.getNodeVariables(this.math)
        for (let match of matches) {
            let id = match.slice(1)
            assert(NodeMan.exists(id), "CNodeMath: node does not exist, id: " + id)
            let node = NodeMan.get(id);
            // and replace it in the string with the value of the node at frame f
            let value = node.getValueFrame(f)
            // if it's not a number, need more parsing
            if (typeof value !== "number") {
                if (value.position !== undefined) {
                    // adding a vector value as [x,y,z]
                    value = '[' + value.position.x + ',' + value.position.y + ',' + value.position.z + ']'
                }
            }
            expression = expression.replace(match, value)
        }
       // console.log("expression after : ", expression)

        //
        // // get the input values and add them to a structure that math.js can use
        // let scope = {}
        // for (let i in this.inputs) {
        //     scope[i] = this.inputs[i].getValueFrame(f)
        // }
        // // evaluate the math expression
        // return math.evaluate(expression, scope)

        let result;
        const context = math.parser();
        const lines = expression.split(";")
        for (let line of lines) {


            // if line is empty, or just white space, skip it
            if (line.trim() === "") continue;
            result = (context.evaluate(line))
//            console.log("result : ", result)
        }
        // if it returns an array of results, we only use the first one
        if (typeof result === "object") {
            result = result.entries[0];
        }
        return result;
    }
}

