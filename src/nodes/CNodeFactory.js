// The node factory is repsonsible for creating nodes from data
// and hence manges the nodeTypes
import {assert} from "../assert";
import {CNodeController} from "./CNodeController";

export class CNodeFactory {
    constructor(nodeMan) {
        const _nodeMan = nodeMan;
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


}