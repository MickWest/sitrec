const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require("terser-webpack-plugin");
const InstallPaths = require('./config-install');
const child_process = require('child_process');

function getFormattedLocalDateTime() {
    const now = new Date();
    const year = String(now.getFullYear()).substring(2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    // Get the most recent tag from git
    const gitTag = child_process.execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    return `Sitrec ${gitTag}: ${year}-${month}-${day} ${hours}:${minutes} PT`;
}

console.log(getFormattedLocalDateTime());

// example install of several of the above, in the project dir (using terminal in PHPStorm)
// npm install copy-webpack-plugin --save-dev

module.exports = {
    entry: {
        index: './src/index.js',
    },
    target: 'web',
    externals: {
        'node:fs': 'commonjs2 fs',
    },
    module: {
        rules: [
            /*
            { // erm - do I need this? babel is for transpiling down to earlier verisons of js?
                test: /\.js$/,
                loader: "babel-loader",
                exclude: "/node_modules/",
            },
            */

            // {
            //     test: /\.tsx?$/,
            //   //  include: path.resolve(__dirname, 'src'),
            //     use: 'ts-loader',
            //     exclude: /node_modules/,
            // },


            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.js'],
        alias: {
        },
    },
    plugins: [
        new MiniCssExtractPlugin(),
        new HtmlWebpackPlugin({
            title: "Sitrec - Metabunk's Situation Recreation Tool",
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.ProvidePlugin({
            // Fix for jquery issues with normal import under Webpack. Possibly circular dependencies
            $: "jquery",
            jQuery: "jquery",
        }),
        new CopyPlugin({

            patterns: [
                // copies the data directory
                { from: "data", to: "./data"},
                { from: "sitrecServer", to: "./sitrecServer"},

                // Web worker source code needs to be loaded at run time
                // so we just copy it over
                // This is currently not used
                { from: "./src/workers/*.js", to:""},
                { from: "./src/PixelFilters.js", to:"./src"},
            ],
        }),
        new webpack.DefinePlugin({
            'process.env.BUILD_VERSION_STRING': JSON.stringify(getFormattedLocalDateTime()),
            'CAN_REQUIRE_CONTEXT': JSON.stringify(true)
        }),
    ],
    experiments: {
        topLevelAwait: true
    },

    // This is to keep class names, which I use for the data driven construction
    // needs: npm i -D terser-webpack-plugin
    // see: https://stackoverflow.com/questions/50903065/how-to-disable-webpack-minification-for-classes-names#:~:text=3-,Install,-Terser%20Plugin%20to
    optimization: {
        minimizer: [
            new TerserPlugin({
                // exclude files starting with "Sit" and ending with ".js"
                exclude: /Sit.*\.js$/,
                terserOptions: {
                    keep_classnames: true,
                },
            }),
        ],
    },
    output: {
        filename: '[name].[contenthash].bundle.js',
        path: InstallPaths.dev_path,
        clean: true, // this deleted the contents of path (InstallPaths.dev_path)
    },
};
