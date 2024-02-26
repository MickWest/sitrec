// Register all the sitches in the sitch directory
import {SitchMan} from "./Globals";

//const sitchContext = require.context('./sitch', false, /^\.\/Sit.*\.js$/);
const sitchContext = require.context('./sitch', false, /^\.\/.*\.js$/);

export function registerSitches() {
    sitchContext.keys().forEach(key => {
        const moduleExports = sitchContext(key);
        Object.keys(moduleExports).forEach(exportKey => {
            const exportObject = moduleExports[exportKey];
            if(exportKey.startsWith('Sit')) {
                console.log("Found Sitch: "+key+ " Sitch Object Name = "+exportKey)
                SitchMan.add(exportObject.name, exportObject);
            } else if (exportKey.startsWith('common')) {
                console.log("Found Common Sitch: "+key+ " Sitch Object Name = "+exportKey)
                // remove the common prefix
                const commonName = exportKey.substring(6);
                SitchMan.add(commonName, exportObject);
            }
        });
    });
}
