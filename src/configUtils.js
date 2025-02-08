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
