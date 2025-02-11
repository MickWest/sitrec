const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const copyPatterns = require('./webpackCopyPatterns');
const InstallPaths = require('./config/config-install'); // Import paths configuration

module.exports = {
    mode: 'none', // No optimization needed for copying
    entry: {}, // No entry point required
    output: {
        path: InstallPaths.dev_path, // Output directory
        filename: '[name].js', // Placeholder filename
        clean: false, // Do not clean output directory
    },
    plugins: [
        new CopyPlugin({
            patterns: copyPatterns, // Use shared patterns
        }),
    ],
};