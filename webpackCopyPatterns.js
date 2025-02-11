const path = require('path');
const InstallPaths = require('./config-install');

module.exports = [
    // copies the data directory
    { from: "data", to: "./data"},
    { from: "sitrecServer", to: "./sitrecServer"},

    // copy the .env file, renaming it to .env.php to prevent direct access
    // combined with the initial <?php tag, this will prevent the file from being served
    { from: ".env", to: "./.env.php",
        transform: (content, absoluteFrom) => {
            // Convert Buffer to string, prepend '<?php\n', then return as Buffer again
            const updatedContent = `<?php /*;\n${content.toString()}\n*/`;
            return Buffer.from(updatedContent);
        },},

    // Web worker source code needs to be loaded at run time
    // so we just copy it over
    // This is currently not used
    { from: "./src/workers/*.js", to:""},
    { from: "./src/PixelFilters.js", to:"./src"},
];