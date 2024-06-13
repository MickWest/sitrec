// Register all nodes in the nodes folder

import {NodeFactory} from "./Globals";

const nodeContext = require.context('./nodes', false, /^\.\/.*\.js$/);

export function registerNodes() {
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

