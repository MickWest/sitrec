// we want a node factory to allow for data-driven node creation

import {CManager} from "../CManager";
import {assert} from "../utils";
import {CNode} from "./CNode";
import {CNodeController} from "./CNodeController";
import {FileManager} from "../Globals";

export class CNodeFactory extends CManager{
    constructor(props) {
        super (props)


        this.nodeTypes = {}

        console.log("Instantiating CNodeManager")
    }

    // register adds a new node type to the factory
    // exposing the name and input parameters?
    // do we check inputs in the factory? It's a common task all nodes have to do
    // and fairly generic.
    // nodes can do additional odd case input checks in their constructors
    register(nodeClass) {
        assert(nodeClass.name.substring(0,5)==="CNode", "registered node class must start with CNode "+nodeClass.name)
        const shortName = nodeClass.name.substring(5)
        this.nodeTypes[shortName]=nodeClass
//        console.log("Registering "+shortName)
    }


    add(id, node) {
        super.add(id, node)
        assert (this.nodeTypes[node.constructor.name.substring(5)] !== undefined,
            "Node type <" + node.constructor.name + "> not registered with node factory")
    }


    validType(type) {
        return this.nodeTypes[type] !== undefined;
    }


    // given a node type (name) and definition, create the node
    // allow id specific in the definition (i.e {id:"someID",...}
    // OR pass in the id here (which we will do with data driven node creation
    // ensure ids are not set in two ways
    create(type, def) {
        assert(this.nodeTypes[type] !== undefined, "Node type " + type + " undefined in node factory")
        const result =  new this.nodeTypes[type] (def)
        console.log("FACTORY Making a "+type+" id= " + def.id)
        return result;
    }

    // return true if "type" is a type of controller node
    isController(type) {
      //  console.log("Checking if "+type+" is a controller")
        if (this.nodeTypes[type] === undefined) return false;
        return this.nodeTypes[type].prototype instanceof CNodeController;
    }


    // rename a node without relinking any of the outputs
    // for use with reinterpret
    renameNodeUnsafe(id, newID) {
        assert (!this.exists(newID), "renaming a node " + id + " to something that exists "+newID)
        const node = this.get(id)
        delete this.list[id]
        node.id = newID;
        this.add(newID, node)

        // // relink outputs of the inputs to point to this new node
        // for (let key in node.inputs) {
        //     const inputNode = node.inputs[key];
        //     for (let i=0;i<inputNode.outputs.length; i++) {
        //         if (inputNode.outputs[i] === id) {
        //             inputNode.outputs[i] = newID;
        //             break;
        //         }
        //         assert(false, "Failed to find node "+id+" in outputs for " +inputNode.id)
        //     }
        //
        // }

        return node;

    }


    // Give a node, we create a new node, optionally with this one as an input (as sourceKey in the def)
    // the old node is renamed with "_old", the new node has the old nodes name
    // old will maintain the inputs, with need renaming to reflect
    // new with have old as an input.
    // outputs from old are transferred to new
    // example: reinterpretNode("cameraTrack", "SmoothedPositionTrack", {smooth:30}, "source" )
    reinterpret(id, type, def, sourceKey) {
        const oldID = id+"_old";
        const oldNode = this.renameNodeUnsafe(id, oldID)

        // copy (via reference) the old outputs
        // and clear the old outputs
        const oldOutputs = oldNode.outputs;
        oldNode.outputs = [];

        // if the sourceKey is defined, then we add the old node as an input to the new node
        // using the sourceKey as the input name
        if (sourceKey !== undefined) {
            def[sourceKey] = oldID;
        }

        // if old node is exportable, then new one should also be
        if (oldNode.exportable !== undefined) {
            def.exportable = oldNode.exportable;
        }

        // Copy the id from the old node to the new node
        def.id = id;

        // create the new node
        const newNode = this.create(type,def)

        // just copy over the old output array from the old node to the new node
        // (the old node will now just have one output, to the new node)
        newNode.outputs = oldOutputs;

        // and fix those old outputs to point to the new node
        for (let out of oldOutputs) {
            for (let key in out.inputs) {
                if (out.inputs[key] === oldNode) {
                    out.inputs[key] = newNode;
                }
            }
        }

        oldNode.recalculateCascade(0)

        // if the old node had an export button, then the new node should too
        // and we need to rename the old export button to the _old name
        if (oldNode.exportBaseName !== undefined) {
            // copy over the old node's export button definition
            //newNode.exportBaseName = oldNode.exportBaseName;
            //newNode.exportFunction = oldNode.exportFunction;
            // rename the old button
            oldNode.exportUI.name(newNode.exportBaseName + oldNode.id)
            //newNode.exportUI = FileManager.makeExportButton(newNode, newNode.exportFunction, newNode.exportBaseName + newNode.id)
        }

        return newNode;
    }

    addExportButton(node, exportFunction, base) {
        //note we store the base name so we can change it if
        node.exportBaseName = base;
        node.exportFunction = exportFunction;
        node.exportUI = FileManager.makeExportButton(node, node.exportFunction, node.exportBaseName + node.id)
    }


    createNodes(nodes) {
        console.log("++++++++ createNodes")
        console.log(JSON.stringify(nodes))
        for (const node of nodes) {
            console.log("createNodes: "+node.id+": "+node.new)
            this.create(node.new, node)
        }
    }


// createNodesJSON example:
    // NodeMan.createNodesJSON(`
    //     [
    //         {"new":"KMLDataTrack",  "id":"cameraTrackData",     "KMLFile":"cameraFile"},
    //         {"new":"TrackFromTimed",      "id":"cameraTrack",        "timedData":"cameraTrackData"},
    //         {"new":"KMLDataTrack",  "id":"TrackData_",   "KMLFile":"KMLTarget"},
    //         {"new":"TrackFromTimed",      "id":"targetTrack",       "timedData":"KMLTargetData"},
    //     ]`);

    createNodesJSON(nodeJSON) {
        console.log(nodeJSON)
        // if last character is a } or a ] and the previous non-whitespace one is a ,
        // then remove it, to allow a final comma in the last line
        var i = nodeJSON.length-1;
        var last =  nodeJSON.charAt(i);
        console.log ("Last char = "+last)
        if (last === '}' || last === ']') {
            i--;
            while (i>0 && /\s/.test(nodeJSON.charAt(i))) i-- // step back over whitespace
            console.log ("Last none WS char = "+nodeJSON.charAt(i))
            if (nodeJSON.charAt(i) === ',') {
                nodeJSON = nodeJSON.substring(0, i) + nodeJSON.substring(i + 1);
           //     console.log("Removed trailing comma")
           //     console.log(nodeJSON)
            }
        }
        this.createNodes(JSON.parse(nodeJSON))
    }

    // we override the get function to allow passing in a node
    // so we can resolve either a string or the actual node to a node
    // which simplifies the interface
    get(n, assertIfMissing=true) {
        if (n instanceof CNode)
            return n
        else
            return super.get(n, assertIfMissing)
    }


    dumpNodeRecursive(node, depth) {
        var result = "|---".repeat(depth) + node.id + "\n"
        for (const key in node.outputs) {
            const output = node.outputs[key]
            result += this.dumpNodeRecursive(output, depth+1)
        }
        return result;
    }

    dumpNodes() {
        // for each node that has no inputs, call dumpNodeRecursive to print it and all it's outputs
        let result="";
        for (const key in this.list) {
            const node = this.list[key].data
            if (node.inputs === undefined || Object.keys(node.inputs).length === 0) {
                result += this.dumpNodeRecursive(node, 0)
            }
        }
        return result;

    }


    disposeAll() {
        console.log("Disposing all nodes")
        super.disposeAll();
    }

}
