import {SitchMan} from "./Globals";

const sitchContext = require.context('./sitch', false, /^\.\/Sit.*\.js$/);

export function registerSitches() {
    sitchContext.keys().forEach(key => {
        const moduleExports = sitchContext(key);
        Object.keys(moduleExports).forEach(exportKey => {
            if(exportKey.startsWith('Sit')) {
                const exportObject = moduleExports[exportKey];
//                console.log("Found Sitch: "+key+ "Sitch Object Name = "+exportKey)
                SitchMan.register(exportObject);
            }
        });
    });
}
