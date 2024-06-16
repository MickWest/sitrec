const path = require('path');
const InstallPaths = require('./config-install');

module.exports = [
    { from: 'data', to: path.join(InstallPaths.dev_path, 'data') },
    { from: 'sitrecServer', to: path.join(InstallPaths.dev_path, 'sitrecServer') },
    { from: './src/workers/*.js', to: path.join(InstallPaths.dev_path, 'src/workers/[name][ext]') },
    { from: './src/PixelFilters.js', to: path.join(InstallPaths.dev_path, 'src') },
];