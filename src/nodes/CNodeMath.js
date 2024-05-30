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
import {assert} from "../utils";
const math = require('mathjs')


export class CNodeMath extends CNode {
    constructor(v) {
        super(v);
        this.frameless = true; // set to indicate that this node does not need a frame number, but will pass the frame number to inputs
        this.math = v.math

        // find any node values and add them to the inputs
        // this ensures that the node is recalculated when the input nodes change
        // and hence other nodes that depend on this node will also be recalculated

        let expression = this.math.slice()
        expression = expression.replace(/\/\/.*\n/g, "\n")
        expression = expression.replace(/\/\*.*\*\//g, "")
        let re = /\$\w+/g
        let matchs = expression.match(re)
        for (let match of matchs) {
            let id = match.slice(1)
            assert(NodeMan.exists(id), "CNodeMath: node does not exist, id: " + id)
            let node = NodeMan.get(id);
            this.addInput(node.id, node.id)
        }
    }

    getValueFrame(f) {

        // make a copy of the math expression
        let expression = this.math.slice()

    //    console.log("expression before : ", expression)

        // strip comments from the string
        // anything from a // to a newline
        expression = expression.replace(/\/\/.*\n/g, "\n")

        // and strip out any comments in the form /* ... */
        expression = expression.replace(/\/\*.*\*\//g, "")

    //    console.log("Comments stripped : ", expression)


        // find any string of the form $example, where "example" is id of a node
//        let re = /node:\w+/g
        let re = /\$\w+/g
        let matchs = expression.match(re)
        for (let match of matchs) {
            let id = match.slice(1)
            assert(NodeMan.exists(id), "CNodeMath: node does not exist, id: " + id)
            let node = NodeMan.get(id);
            // and replace it with the value of the node at frame f
            let value = node.getValueFrame(f)
            // if it's not a number, need more parsing
            if (typeof value !== "number") {
                if (value.position !== undefined) {
                    value = '[' + value.position.x + ',' + value.position.y + ',' + value.position.z + ']'
                }
            }


            expression = expression.replace(match, value)
        }
  //      console.log("expression after : ", expression)

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

