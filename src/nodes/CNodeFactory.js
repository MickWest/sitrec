// The node factory is repsonsible for creating nodes from data
// and hence manges the nodeTypes
import {assert} from "../assert";
import {CNodeController} from "./CNodeController";

export class CNodeFactory {
    constructor(nodeMan) {
        this._nodeMan = nodeMan;
        this.nodeTypes = {}
    }


    // register adds a new node type to the factory
    // exposing the name and input parameters?
    // do we check inputs in the factory? It's a common task all nodes have to do
    // and fairly generic.
    // nodes can do additional odd case input checks in their constructors
    register(nodeClass) {
        assert(nodeClass.name.substring(0, 5) === "CNode", "registered node class must start with CNode " + nodeClass.name)
        const shortName = nodeClass.name.substring(5)
        this.nodeTypes[shortName] = nodeClass
//        console.log("Registering "+shortName)
    }

    // given a node type (name) and definition, create the node
    // allow id specific in the definition (i.e {id:"someID",...}
    // OR pass in the id here (which we will do with data driven node creation
    // ensure ids are not set in two ways
    create(type, def) {
        assert(this.nodeTypes[type] !== undefined, "Node type " + type + " undefined in node factory")
        const result = new this.nodeTypes[type](def)
//        console.log("FACTORY Making a "+type+" id= " + def.id)
        return result;
    }


    validType(type) {
        return this.nodeTypes[type] !== undefined;
    }

    // return true if "type" is a type of controller node
    isController(type) {
        //  console.log("Checking if "+type+" is a controller")
        if (this.nodeTypes[type] === undefined) return false;
        return this.nodeTypes[type].prototype instanceof CNodeController;
    }

    createNodes(nodes) {
        console.log("++++++++ createNodes")
        console.log(JSON.stringify(nodes))
        for (const node of nodes) {
            console.log("createNodes: " + node.id + ": " + node.new)
            this.create(node.new, node)
        }
    }


// createNodesJSON example:
    // NodeFactory.createNodesJSON(`
    //     [
    //         {"new":"KMLDataTrack",  "id":"cameraTrackData",     "KMLFile":"cameraFile"},
    //         {"new":"TrackFromTimed",      "id":"cameraTrack",        "timedData":"cameraTrackData"},
    //         {"new":"KMLDataTrack",  "id":"TrackData_",   "KMLFile":"TargetTrack"},
    //         {"new":"TrackFromTimed",      "id":"targetTrack",       "timedData":"TargetTrackData"},
    //     ]`);

    createNodesJSON(nodeJSON) {
        console.log(nodeJSON)
        // if last character is a } or a ] and the previous non-whitespace one is a ,
        // then remove it, to allow a final comma in the last line
        var i = nodeJSON.length - 1;
        var last = nodeJSON.charAt(i);
        console.log("Last char = " + last)
        if (last === '}' || last === ']') {
            i--;
            while (i > 0 && /\s/.test(nodeJSON.charAt(i))) i-- // step back over whitespace
            console.log("Last none WS char = " + nodeJSON.charAt(i))
            if (nodeJSON.charAt(i) === ',') {
                nodeJSON = nodeJSON.substring(0, i) + nodeJSON.substring(i + 1);
                //     console.log("Removed trailing comma")
                //     console.log(nodeJSON)
            }
        }
        this.createNodes(JSON.parse(nodeJSON))
    }


    // Give a node, we create a new node, optionally with this one as an input (as sourceKey in the def)
    // the old node is renamed with "_old", the new node has the old nodes name
    // old will maintain the inputs, with need renaming to reflect
    // new with have old as an input.
    // outputs from old are transferred to new
    // example: reinterpretNode("cameraTrack", "SmoothedPositionTrack", {smooth:30}, "source" )
    reinterpret(id, type, def, sourceKey) {
        const oldID = id+"_old";
        const oldNode = this._nodeMan.renameNodeUnsafe(id, oldID)

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


}