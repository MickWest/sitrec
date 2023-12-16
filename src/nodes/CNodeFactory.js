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




    // given a node type (name) and definition, create the node
    // allow id specific in the definition (i.e {id:"someID",...}
    // OR pass in the id here (which we will do with data driven node creation
    // ensure ids are not set in two ways
    create(type, def, id) {
        assert(this.nodeTypes[type] !== undefined, "Node type " + type + " undefined in node factory")
        const result =  new this.nodeTypes[type] (def)
        console.log("FACTORY Making a "+type)
        /* // is this neeeed a good idea? will an id have automatically been created if there was none?
        if (id !== undefined) {
            assert(result.id === undefined, "Creating a "+type+" node, with id = "+id+" but id already set to "+result.id)
            result.id = id
            this.add(id, result)
        }

         */
        return result;
    }

    createNodes(nodes) {
        console.log("++++++++ createNodes")
        console.log(JSON.stringify(nodes))
        for (const node of nodes) {
            console.log("createNodes: "+node.id+": "+node.new)
            this.create(node.new, node)
        }
    }

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
