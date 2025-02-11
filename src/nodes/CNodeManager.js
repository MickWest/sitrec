// we want a node factory to allow for data-driven node creation

import {CManager} from "../CManager";
import {CNode} from "./CNode";
import {FileManager, NodeMan, Sit} from "../Globals";
import {assert} from "../assert.js";

export class CNodeManager extends CManager{
    constructor(props) {
        super (props)
        this.UniqueNodeNumber = 0;
//        console.log("Instantiating CNodeManager")
    }



    add(id, node) {
        super.add(id, node)
        // todo: for now we're not registering all of the nodes when running as a console app
        // assert (isConsole || this.nodeTypes[node.constructor.name.substring(5)] !== undefined,
        //     "Node type <" + node.constructor.name + "> not registered with node factory")
    }


    // dispose and remove, optionally doing to same to all inputs, recursively
    // not a common use case, but useful for cleaning up a node that has auto-generated inputs
    disposeRemove(id, inputs=false) {
        if (id === undefined)
            return;
        if (inputs) {
            const node = this.get(id)
            for (let key in node.inputs) {
                // get the input node
                const inputNode = node.inputs[key];
                // if the input node has no other outputs, then we can dispose of it
                if (inputNode.outputs.length === 1) {
                    inputNode.outputs = []; // unlink it, safe to do this as it's the only output
                    this.disposeRemove(node.inputs[key].id, inputs)
                } else {
                    // otherwise, just unlink it
                    assert(0,"Not disposing of input node "+inputNode.id+" as it has other outputs. Probably should not be setting inputs=true here")
                    //node.removeInput(key);
                }
            }
            node.inputs = {};
        }
        super.disposeRemove(id);
    }

    // unlink a node from all outputs, and dispose of it
    unlinkDisposeRemove(id) {
        if (id === undefined)
            return;
        const node = this.get(id);
        // node.outputs is an array of references to other nodes
        // so we need to move this node as an input
        // if it's a CNodeSwitch, we might need to ensure the choice is valid (i.e. not this node)
        for (let outputNode of node.outputs) {


            // iterate over the inputs of the output node
            // find which one is this node
            // and delete the reference
            // this might be an issue if the node is actually needed by that node
            // so you have to be careful
            // asserts will catch any issues
            for (let key in outputNode.inputs) {
                if (outputNode.inputs[key] === node) {
                    delete(outputNode.inputs[key]);
                }
            }

            // if the output node is a switch, and the choice is this node, then we need to select a different choice
            // we've already removed the input, so it's safe to select a different choice
            // that will be the first one that is valid, or null if none are valid
            if (outputNode.constructor.name === "CNodeSwitch") {
                if (outputNode.choice === node.id) {
                    outputNode.selectValidChoice();
                }
            }


        }
        node.outputs = [];

        // similar with the inputs, but a bit simpler
        // just iterate over the input keys, and unlike the node from the input node's outputs
        let inputKeys = Object.keys(node.inputs);
        for (let key of inputKeys) {
            node.removeInput(key);
        }
        // and clear the inputs
        node.inputs={}



        this.disposeRemove(node);
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


    addExportButton(node, exportFunction, base) {
        //note we store the base name so we can change it if
        node.exportBaseName = base;
        node.exportFunction = exportFunction;
        if (node.exportButtons === undefined) {
            node.exportButtons = [];
        }
        node.exportButtons.push(FileManager.makeExportButton(node, node.exportFunction, node.exportBaseName + node.id))
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


    dumpNodeRecursive(node, depth=0) {
        var result = "|---".repeat(depth) + node.constructor.name+": "+ node.id + "\n"
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
//        super.disposeAll();

        // delete all entries in this.list
        // for the node manager we also need to unlink them from all outputs
        // to avoid the assertion in disposeRemove
        // safe as we are disposing all nodes
        Object.keys(this.list).forEach(key => {
            // Some nodes might dispose of other nodes, so we need to check if the node still exists
            if (this.exists(key)) {
                this.unlinkDisposeRemove(key);
            }
        });

        // a clean slate so we reset the UniqueNodeNumber
        // this is needed for modding, as the node names must be consistent.
        // still issues if the legacy sitch changes the number or order of nodes....
        this.UniqueNodeNumber = 0;
    }

    // if Sit.frames changes, we need to update and recalculate all nodes that use it
    // which we do by updating those have have the useSitFrames flag set
    updateSitFramesChanged() {
        // update them all individually first
        NodeMan.iterate((key, node) => {
            if (node.useSitFrames) {
                node.frames = Sit.frames;
//                console.log("Updating node.frames on "+node.id+"from "+node.frames+" to "+Sit.frames);
            }

            // there's no current use case where any node fps is different from the global fps
            // so set them all to the global fps
            node.fps = Sit.fps;
        })

        //
        // NodeMan.iterate((key, node) => {
        //     console.log(" node" + node.id+" fps = " + node.fps)
        //
        // })


        // NodeMan.iterate((key, node) => {
        //     if (node.useSitFrames) {
        //         console.log("Calling recalculateCascade on "+node.id)
        //         node.recalculateCascade();
        //     }
        // })

        // ensure we recalculate all nodes in the correct order
        this.recalculateAllRootFirst()

    }

    nodeDepth(node) {
        let depth = 0;
        let inputs = node.inputs;
        if (Object.keys(inputs).length > 0) {
            depth=1;
            for (let key in inputs) {
                depth = Math.max(depth, this.nodeDepth(inputs[key])+1);
            }
        }
        return depth;
    }

    recalculateAllRootFirst(withTerrain = false) {
        // we will creat an array indexed by how deep the node is in the tree
        // a node with no inputs is at depth 0
        // a node with inputs that are all at depth 0 is at depth 1, etc
        // we will process the nodes in order of increasing depth
        // so we can recalculate all the nodes in the correct order
        let depthMap = []
        let maxDepth = 0;
        this.iterate((key, node) => {
            let depth = this.nodeDepth(node);
            if (depthMap[depth] === undefined) {
                depthMap[depth] = [];
            }
            depthMap[depth].push(node);
            maxDepth = Math.max(maxDepth, depth);
        })
        //console.log("Max depth = "+maxDepth)
        for (let i=0; i<=maxDepth; i++) {
            let nodes = depthMap[i];
            if (nodes !== undefined) {
                for (let node of nodes) {
                    // we do not want to recalculate terrain nodes

                    if (withTerrain || node.id !== "TerrainModel") {
                        node.recalculate();
//                    console.log("Recalculated " + node.constructor.name + ":" + node.id + " at depth " + i + ", node.frames = " + node.frames + (node.frameless?" (frameless)":""));
                    }
                }
            }
        }
    }

    pruneUnusedFlagged() {
        console.log("Pruning unused nodes")
        // remove all nodes that are not connected to anything
        for (let key in this.list) {
            const node = this.list[key].data;
            // is it not connected to anything?
            if (node.pruneIfUnused && node.outputs.length === 0 && (node.inputs === undefined || Object.keys(node.inputs).length === 0)) {
                // remove it
                console.log("Removing unused prunable node " + key);
                this.disposeRemove(key)
            }
        }
    }

}

