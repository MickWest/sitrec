import { CNodeFactory } from "./nodes/CNodeFactory"
import { CSitchFactory } from "./CSitchFactory"
import { CFileManager } from "./CFileManager"
import {
    setFileManager, setNodeMan, setSitchMan, setUnits, setSit,
    SitchMan, Sit, setNullNode
} from "./Globals"
import { registerSitchModule } from "./RegisterSitches"
import { CUnits } from "./CUnits"
import { CSituation } from "./CSituation"
import { resetPar } from "./par"
import {CNode} from "./nodes/CNode";

// When building Sitrec as a console application 
// use functions defined here to initialize a sitch.
// The main entry point for the web application, index.js,
// may also import some of the functions they have in common.

export function initGlobals() {
    setSitchMan(new CSitchFactory())
    setFileManager(new CFileManager())
    setNodeMan(new CNodeFactory())
    setNullNode(new CNode({id: "null"}))
    setUnits(new CUnits("Nautical"))
}

// Initialize a sitch from properties that have already been imported.
export async function initSitchObject(sitchObject) {
    if(!SitchMan)
        initGlobals()

    // todo: move more of the (non-gui) initialization code from index.js here and reuse it
    setSit(new CSituation(sitchObject))

    await Sit.loadAssets()

    resetPar()
    Sit.setup()
}

// Initialize the sitch with the given name.
// Optionally specify the name of the file to load the sitch from.
export async function initSitch(sitchName, fileName) {
    if(!SitchMan)
        initGlobals()

    // todo: make fileName optional by checking whether Sit{SitchName}.js contains the sitch
    const sitchModule = await import("./sitch/" + fileName)
    registerSitchModule(fileName, sitchModule)
    const sitchObject = SitchMan.get(sitchName)
    await initSitchObject(sitchObject)
}