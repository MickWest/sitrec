// check if logged in
// The URL https://www.metabunk.org/sitrec/sitrecServer/rehost.php?getuser=1
// will return a string of the user ID (0 if not logged in)
// if we are not logged in, then we can't rehost files
// so we don't show the rehost button

import { Globals } from './Globals';
import { SITREC_SERVER } from '../config';

// we want to import configParams from config.js
// but it might not exists, so we'll use a try/catch
export let configParams;

console.log('REQUIRING _configParams in config.js');
configParams = require('../config')._configParams;
if (configParams === undefined) {
  console.log('No _configParams in config.js');
  configParams = {};
}

export async function checkLogin() {
  await asyncCheckLogin();
}

export function asyncCheckLogin() {
  // if configParams.rehostRequiresLogin is false, then we don't need to check
  // so we can just return a promise that resolves to 12345678
  if (!configParams.rehostRequiresLogin) {
    console.log('Rehost attempt does not require login');
    Globals.userID = 12345678;
    return Promise.resolve();
  }

  const url = `${SITREC_SERVER}rehost.php?getuser=1`;
  console.log(`Checking login at ${url}`);
  return fetch(url, { mode: 'cors' })
    .then((response) => response.text())
    .then((data) => {
      Globals.userID = Number.parseInt(data);
      console.log(`User ID is ${Globals.userID}`);
    });
}
