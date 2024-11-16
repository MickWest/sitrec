import {NodeFactory} from "./Globals"

// Register all nodes in the nodes folder
export function registerNodes() {
    let nodeContext;
    if (CAN_REQUIRE_CONTEXT !== undefined && CAN_REQUIRE_CONTEXT === true) {
        nodeContext = require.context('./nodes', false, /^\.\/.*\.js$/);
    } else {
        nodeContext = {};
    }

    nodeContext.keys().forEach(key => {
        const moduleExports = nodeContext(key);
        Object.keys(moduleExports).forEach(exportKey => {
            if(exportKey.startsWith('CNode')) {
                const exportObject = moduleExports[exportKey];
                NodeFactory.register(exportObject);
 //               console.log("Found Node: "+key+ " Node Object Name = "+exportKey)
            }
        });
    });
}

// register a single node of a certain kind in console mode.
// optionally the node will be loaded from the given source file.
export async function registerNodeConsole(kind, file) {
    // don't compile this code during a web build
    // since the await produces a warning that it depends on an expression
    if (typeof CAN_REQUIRE_CONTEXT === "undefined") {
        const nodeClass = 'CNode' + kind
        const fileName = file ?? nodeClass + '.js'
        const filePath = './nodes/' + fileName
        const moduleExports = await import(filePath)
        const exportObject = moduleExports[nodeClass]
        NodeFactory.register(exportObject)
    }
    return true
}