const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require("path");
const InstallPaths = require("./config/config-install");

module.exports = merge(common, {
    mode: 'production',

    output: {
        filename: '[name].[contenthash].bundle.js', // each entry translates into one of these bundles
       // path: path.resolve(__dirname, 'deploy'),
        path: InstallPaths.prod_path,
        clean: true, // this deletes the contents of path (dist)
    },

});