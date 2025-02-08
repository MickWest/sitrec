export const isConsole = (typeof window == 'undefined');

export async function getConfigFromServer() {

// Log the chosen configuration.
    if (!isConsole) {

// fetch the config from the server to determine all the paths from there
// as the server is what determines the paths (in config.php



        // reconstruct the url from parts to strip off any filename or query string
        const configURL = window.location.origin + window.location.pathname + "sitrecServer/" + "config.php" + "?FETCH_CONFIG";
        const response = await fetch(configURL);
        const server_config = await response.json();
        console.log(server_config);

        console.log("Loaded configuration from server URL: " + configURL);

        // assert(server_config, "No server configuration loaded");
        // assert(server_config.uploadURL === SITREC_UPLOAD, "Server upload URL does not match client upload URL " + server_config.uploadURL + " != " + SITREC_UPLOAD);
        return server_config;

    } else {
        return null;
    }
} // Use a simple regex to consider both "localhost" and "192.168.*" as local.


export let isLocal = false;

export function checkLocal() {
    isLocal =
        !isConsole &&
        (/^(localhost|192\.168)/).test(window.location.hostname);
}

export let SITREC_DOMAIN;
export let SITREC_APP;
export let SITREC_SERVER;
export let SITREC_UPLOAD;
export let SITREC_CACHE;
export let SITREC_DEV_DOMAIN;

export async function setupConfigPaths() {

    // we're allowing this to be called multiple times
    // Web app should call it as the first thing in index.js
    // but it's also called from loadAssets in CSituation.js
    // to ensure it's called before any assets are loaded by the console application which has a different entry point
    if (SITREC_APP !== undefined) {
        return;
    }

    let port = "";

    // port is included in window.location.origin so is not needed
    // if (!isConsole) {
    //     port = window.location.port;
    //     if (port) {
    //         port = ":" + port;
    //     }
    // }


// SITREC_DOMAIN is the domain of the sever we are uploaded to
// e.g. https://www.metabunk.org/ or https://localhost/
    SITREC_DOMAIN = (isConsole ? "https://localhost/" : window.location.origin)

// Config.js is part of the sitrec package, so window.location.pathname will be the path to the sitrec package
    let SITREC_PATH = isConsole ? "./sitrec/" : window.location.pathname;

    let SITREC_APP_PATH = SITREC_PATH;
// strip off anything after the last slash
    SITREC_APP_PATH = SITREC_APP_PATH.substring(0, SITREC_APP_PATH.lastIndexOf("/") + 1);

    let SITREC_SERVER_PATH = SITREC_APP_PATH + "sitrecServer/";
    SITREC_SERVER = SITREC_DOMAIN + port + SITREC_SERVER_PATH;


// SITREC_APP is the path to the sitrec application
// e.g. /sitrec/ or /sitrec-dev/
    SITREC_APP = isConsole
        ? "./sitrec/" // When running as a console application, use a relative path.
        : SITREC_DOMAIN + port + SITREC_APP_PATH;


// TEMP
    SITREC_DEV_DOMAIN = "www.metabunk.org"


    if (isConsole) {
        return;
    }


    SITREC_UPLOAD = null;
    SITREC_CACHE = null;

    const serverConfig = await getConfigFromServer();
    if (serverConfig !== null) {
        SITREC_UPLOAD = serverConfig.UPLOAD;
        SITREC_CACHE = serverConfig.CACHE;

        // log all the exported variables
        console.log("SITREC_DOMAIN: ", SITREC_DOMAIN);
        console.log("SITREC_APP: ", SITREC_APP);

        console.log("SITREC_SERVER: ", SITREC_SERVER);
        console.log("SITREC_UPLOAD: ", SITREC_UPLOAD);
        console.log("SITREC_CACHE: ", SITREC_CACHE);
        console.log("SITREC_DEV_DOMAIN: ", SITREC_DEV_DOMAIN);

        return;
    }

    assert(0, "No server configuration loaded");

    // Old method of client-side configuration, not currently used.
    // if we don't have a server, then UPLOAD and CACHE are irrelevant

    // strip off everything from the index of the second to last slash, to the end
    // this will leave the path to the directory above the sitrec package
    let SITREC_DATA_PATH = SITREC_PATH; // default to the same directory as the sitrec package

    if (SITREC_PATH.lastIndexOf("/") > 0) { // but anything other than the root directory needs to be the parent directory
        // first remove everything after the LAST slash, including the slash
        SITREC_DATA_PATH = SITREC_DATA_PATH.substring(0, SITREC_DATA_PATH.lastIndexOf("/"));
        // the remove everything after the second to last slash, but leave it alone
        SITREC_DATA_PATH = SITREC_DATA_PATH.substring(0, SITREC_DATA_PATH.lastIndexOf("/") + 1);
    }

    // Paths relative to the domain.
    // you can optionally have a different set of paths for local and/or console

    let UPLOAD_PATH = SITREC_DATA_PATH + "sitrec-upload/";
    let CACHE_PATH = SITREC_DATA_PATH + "sitrec-cache/";

    SITREC_UPLOAD = SITREC_DOMAIN + port + UPLOAD_PATH;
    SITREC_CACHE = SITREC_DOMAIN + port + CACHE_PATH;

    console.log("SITREC_DOMAIN: ", SITREC_DOMAIN);
    console.log("SITREC_APP: ", SITREC_APP);
    console.log("SITREC_SERVER: ", SITREC_SERVER);
    console.log("SITREC_UPLOAD: ", SITREC_UPLOAD);
    console.log("SITREC_CACHE: ", SITREC_CACHE);
    console.log("SITREC_DEV_DOMAIN: ", SITREC_DEV_DOMAIN);
}