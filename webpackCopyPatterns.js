const path = require('node:path');
const InstallPaths = require('./config-install');

module.exports = [
  // copies the data directory
  { from: 'data', to: './data' },
  { from: 'sitrecServer', to: './sitrecServer' },

  // Web worker source code needs to be loaded at run time
  // so we just copy it over
  // This is currently not used
  { from: './src/workers/*.js', to: '' },
  { from: './src/PixelFilters.js', to: './src' },
];
