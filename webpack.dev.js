const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
const webpack = require('webpack');
const InstallPaths = require('./config/config-install');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        static: {
            directory: InstallPaths.dev_path,
            publicPath: '/sitrec', // Public path to access the static files
        },
        hot: true,
        open: true,
        port: 8080,
        historyApiFallback: true,
        proxy: [
            {
                context: ['/sitrec/sitRecServer'], // paths to proxy
                target: 'http://localhost',
                changeOrigin: true,
                secure: false,
            },
            {
                context: ['/sitrec-videos'],
                target: 'http://localhost',
                changeOrigin: true,
                secure: false,
            },
            {
                context: ['/sitrec-cache'],
                target: 'http://localhost',
                changeOrigin: true,
                secure: false,
            },
        ],
    },

    // plugins: [
    //     new webpack.HotModuleReplacementPlugin(),
    // ],
});
