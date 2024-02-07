// we want a node factory to allow for data-driven node creation

import {CManager} from "../CManager";
import {assert} from "../utils";
import {CNode} from "./CNode";

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
        const oldOutputs = oldNode.outputs;
        oldNode.outputs = [];
        if (sourceKey !== undefined) {
            def[sourceKey] = oldID;
        }

        def.id = id;
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

        return newNode;
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
    //         {"new":"KMLDataTrack",  "id":"KMLTargetData",   "KMLFile":"KMLTarget"},
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
    get(n) {
        if (n instanceof CNode)
            return n
        else
            return super.get(n)
    }

}
