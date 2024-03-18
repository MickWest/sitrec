// Register all the sitches in the sitch directory
import {SitchMan} from "./Globals";
import {parseJavascriptObject} from "./Serialize";

//const sitchContext = require.context('./sitch', false, /^\.\/Sit.*\.js$/);
const sitchContext = require.context('./sitch', false, /^\.\/.*\.js$/);

// the Sitchman is an object manager that contains both:
// 1. the sitches
// 2. the common sitch snippets
// the common sitch snippets are short snippets of setup data that are used in multiple sitches
// but the fiull sitches can also be used as a parent to create new sitches
// by overriding some fields, and adding new fields.
// The common sitches are named with a "common" prefix
// The full sitches are named with a "Sit" prefix
// The common sitches are added to the SitchMan with the "common" prefix removed
// The full sitches are added to the SitchMan by their "name" field, which might be different from the SitName
// e.g. SitKML is added as "kml" but SitAguadilla is added as "agua"
// this might be worth normalizing so names are consistent (i.e. SitAguadilla is added as "aguadilla")

export function registerSitches(textSitches) {
    sitchContext.keys().forEach(key => {
        const moduleExports = sitchContext(key);
        Object.keys(moduleExports).forEach(exportKey => {
            const exportObject = moduleExports[exportKey];
            if(exportKey.startsWith('Sit')) {
         //       console.log("Found Sitch: "+key+ " Sitch Object Name = "+exportKey)
                SitchMan.add(exportObject.name, exportObject);
                //const sitchName = exportKey.substring(3);
                //SitchMan.add(sitchName, exportObject);

            } else if (exportKey.startsWith('common')) {
         //       console.log("Found Common Sitch: "+key+ " Sitch Object Name = "+exportKey)
                // remove the common prefix
                const commonName = exportKey.substring(6);
                SitchMan.add(commonName, exportObject);
            }
        });
    });

    // add the text sitches
    for (const key in textSitches) {
        const text = textSitches[key];
        const obj = textSitchToObject(text);
//        console.log("Found Text Sitch: "+key+ " Sitch text = "+text)
        SitchMan.add(key, obj);
    }


}

export function textSitchToObject(text) {
// we have a text sitch, which starts with something like:
    // sitch = {
    //     include_pvs14: true,
    //     name: "westjet",
    // we want the contents of the object
// strip off everything up to the first brace
    const firstBrace = text.indexOf("{");
    const data = text.substring(firstBrace);
    console.log("Parse >>>>>")
    const obj = parseJavascriptObject(data)
    console.log("<<<<<<<<<<< Parsed");
    return obj;
}