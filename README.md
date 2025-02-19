# Sitrec

![sitrec](https://github.com/mickwest/sitrec/actions/workflows/ci.yml/badge.svg?event=push)

Sitrec (Situation recreation) is a web application that allows for the real-time interactive 3D recreation of various situations. It was created initially to analyze the US Navy UAP/UFO video (Gimbal, GoFast, and FLIR1/Nimitz), but has expanded to include several other situations (referred to as "sitches"). It's written mostly by [Mick West](https://github.com/MickWest), with a lot of input from the members of [Metabunk](https://www.metabunk.org).

It's free and available to anyone. Here's a link to [Sitrec on Metabunk](https://www.metabunk.org/sitrec).

My goal here is to create a tool to effectively analyze UAP/UFO cases, and to share that analysis in a way that people can understand it. Hence, I focused on making Sitrec run in real-time (30 fps or faster), and be interactive both in viewing, and in exploring the various parameters of a sitch.  

### User Documentation [_NEW_]

- [The Sitrec User Interface - How the menus work](docs/UserInterface.md)
- [The Custom Sitch Tool - Drag and Drop Sitches](docs/CustomSitchTool.md)
- [Custom Models and 3D Object - add your own planes](docs/CustomModels.md)


### Technical Documentation (for coders and webmasters)

- [File Rehosting and Server Configuration](./docs/FileRehosting.md)
- [Custom Terrain and Elevation Sources, WMS, etc.](docs/CustomTerrainSources.md)
- [Adding a Sitch in Code (older method)](docs/AddSitchInCode.md)
- [Local custom Sitch with JSON files - More complex cusom sitches](./docs/LocalCustomSitches.md)

The most common use case is to display three views:
- A video of a UAP situation 
- A 3D recreation of that video 
- A view of the 3D world from another perspective (with movable camera) 
- Plus various graphs and stats. 

Here's the [famous Aguadilla video](https://www.metabunk.org/sitrec/?sitch=agua)

![screenshot of Sitrec showing the Aguadilla sitch](docs/readmeImages/agua-example.jpg)

Sitrec uses or ingests a variety of data sources

- ADS-B files in KML format from ADSB Exchange, FlightAware, Planefinder, and others
- TLE files in Two or Three Line Element format (for satellites, mostly Starlink)
- Star catalogs (BSC, etc.)
- Video (mp4, limited support)
- DJI Drone tracks from Airdata as .csv
- GLB (Binary GLTF 3D models)
- Generic custom data in .csv
- MISB style 3d Track data in KLV or CSV format
- Image files (jpg, png, etc)
 
Some types of situations covered:

- UAP Videos
  - Taken from a plane where a target object's azimuth and elevation are known ("angles only")
  - Taken from a plane of another plane
  - Taken from a plane looking in a particular direction
  - From a fixed position
- Viewing the sky (with accurate planets and satellites)

## Quickest Local Install, Using Docker

To install Sitrec locally without having to configure a local web server

Install Git

Install Docker Desktop from https://www.docker.com/ and run it. 

Mac/Linux
```bash
git clone https://github.com/MickWest/sitrec sitrec-test-dev
cd sitrec-test-dev
for f in config/*.example; do cp "$f" "${f%.example}"; done
cd sitrec
docker compose -p sitrec up -d --build
open http://localhost:6425/
```

Windows
```bat
git clone https://github.com/mickwest/sitrec sitrec-test-dev
cd sitrec-test-dev
for %f in (config\*.example) do copy /Y "%f" "%~dpnf"
cd sitrec
docker compose -p sitrec up -d --build
start http://localhost:6425/
```

This will be running on http://localhost:6425/. The "open" or "start" commands above should open a browser window. 

# Local Server Installation

## Prerequisites

If you want to install and run directly from a local server, and not use Docker, the you will need:

- A web server (e.g. Nginx) with
  - PHP (8.3+ recommended)
  - HTTPS support (for CORS, can be self-signed for local dev)
- node.js (for building, with npm)

## Server Install Mac/Linux

Assuming we want to install the build environment in "sitrec-test-dev", run:

```bash
git clone https://github.com/MickWest/sitrec sitrec-test-dev
cd sitrec-test-dev
for f in config/*.example; do cp "$f" "${f%.example}"; done
npm install
```

Assuming you want to install in a folder called "glass" that's off the root of your local web server. In this example, the full path to my local web server root is: /Users/mick/Library/CloudStorage/Dropbox/Metabunk/

```bash
mkdir /Users/mick/Library/CloudStorage/Dropbox/Metabunk/glass
pushd /Users/mick/Library/CloudStorage/Dropbox/Metabunk/glass
mkdir sitrec
mkdir sitrec-cache
mkdir sitrec-upload
mkdir sitrec-videos
popd
```

Edit config/config-install.js
Set dev_path to /Users/mick/Library/CloudStorage/Dropbox/Metabunk/glass/sitrec
Set prod_path to any folder you can use for staging the deploy build (if needed). Example

```javascript
module.exports = {
dev_path: '/Users/mick/Library/CloudStorage/Dropbox/Metabunk/glass/sitrec',
prod_path: '/Users/mick/sitrec-deploy'
}
```

Build into the local web folder we defined earlier
```bash
npm run build
```

## Server Install Windows

```bat
git clone https://github.com/mickwest/sitrec sitrec-test-dev
cd sitrec-test-dev
for %f in (config\*.example) do copy /Y "%f" "%~dpnf"
npm install
```

Assuming you want to install in a folder called "glass" that's off the root of your local web serve

```bat
mkdir c:\\nginx\\html\\glass
pushd c:\\nginx\\html\\glass
mkdir sitrec
mkdir sitrec-cache
mkdir sitrec-upload
mkdir sitrec-videos
popd
notepad config\config-install.js
```

Edit config\config-install.js
Set dev_path to the local deployment folder on the web server
Set prod_path to any folder you can use for staging the deploy build (if needed)

Example:
```javascript
module.exports = {
    dev_path: 'c:\\nginx\\html\\glass\\sitrec',
    prod_path: 'c:\\users\\mick\\sitrec-deploy'
}
```

Build into the local web folder we defined earlier
```bash
npm run build
```


## Code overview
Sitrec runs mostly client-side using JavaScript and some custom shaders but also has a handful of server-side scripts written in PHP. 

The rendering code uses Three.js, and there are a variety of other open-source libraries. All this uses MIT licenses or similar. 

The code cannot be run directly, as it is set up to be compiled using WebPack.

## Install local dev environment

Assuming that you want to run the code on a local machine for development, testing, etc, you need a web server. I use Nginx, but Apache should work
The web server should be configured to run php files (i.e. php-fpm)
It should also load an index.html file when there's one in the directory (this is usually default)

You will also need to install node.js in you build environment, from:
https://nodejs.org/en/download

Node.js is used both for build tools (i.e. webpack) and for packages used by the app. It is not used server-side. 

## Create Source file and sitrec project folder structure
Sitrec is built from the "sitrec" project folder. Note this is NOT the same "sitrec" server folder you deploy to.  

Clone Sitrec from GitHub, or download a release archive. This will give you the sitrec project folder with these sub-folders:
- `config` - the configuration files. Initially just .example files
- `data` - per-sitch data like ADS-B data, csv files, TLEs, models, sprites, and images
- `docker` - Configuration files for Docker builds
- `docs` - other .md format Documentation and images
- `sitrecServer` - The server-side PHP files, like cachemaps.php
- `src` - The JavaScript source, with the entry point of index.js
- `three.js` - The 3D engine, the largest library used
- `test` - Test files for the console build
- `tests` - Unit tests that can be run by Jest

Then there are the project build files:
- `docker-compose.yml` - configures the Docker container
- `Dockerfile` - configures the Docker image (which goes in the container)
- `package.json` - top-level descriptor, contains npm scripts for build and deploy. It also contains the devDependencies (node modules that are used)
- `webpack.common.js` - the main configuration file for Webpack. The next two files both include this. 
- `webpack.copy-files.js` - a seperate Webpack config to just copy the files wihout rebuilding
- `webpack.dev.js` - used for development
- `webpack.prod.js` - used for production/deployment
- `webpackCopyPatterns.js` - defines what files are copied from the dev folder to the build, and how they are transformed and.or renamed (e.g. custom.env)
- `config/config.js` - Contains install-specific constants for server paths used by the app
- `config/config-install.js` - development and production file paths, used by the build system

(config.js and config-install.js are initial supplied as config.js.example and config-install.js.example - you will need to rename them).

## Create the local (and production) server folder structure
Sitrec can exist at the server root, or in any path. I use the root, but it's maybe neater to have in a folder. Here I'll assume it's in a folder called "s". You do not have to use "s", you can put it in another folder, or in the web root (like I do)

There are five folders in the server structure
- `sitrec` - the folder containing the Webpack compiled app and the data files (except videos). This is deleted and recreated when rebuilding, so don't edit anything in there, edit the 
- `sitrec-config` - contains server-side PHP configuration files - you need to edit this. 
- `sitrec-cache` - a server-side cache for terrain tiles, initially empty
- `sitrec-upload` - for rehosting user files (like ADS-B or TLE). Initially empty
- `sitrec-videos` - The videos for the sitches. Handled separately as it can get quite large. The videos are subdivided into public (government or other unrestricted files) and private (where the licensing rights are unclear, but are used here under fair-use). So there's two sub-folders that you need to keep
  - `sitrec-videos/public`
  - `sitrec-videos/private`

Note sitrec-cache and sitrec-upload must have write permission.

There's also an optional URL shortener, which is uses a folder called 'u' to store HTML files with short names that are used to redirect to longer URLs.

## Download the videos

The private video folder contains videos taken by individuals and posted on the internet. I use them in Sitrec under fair-use, non-commercial, educational. But they are not included here. Ask me if you really need one. 
The public folder contain videos that are government produced, are by me, or are otherwise free of restrictions. They can be found here: https://www.dropbox.com/scl/fo/biko4zk689lgh5m5ojgzw/h?rlkey=stuaqfig0f369jzujgizsicyn&dl=0

## Create/Edit the config files in config/
You will need to edit shared.env, config.js, config-install.js and config.php. The defaults will work to an extend (with no credentials for downloading Mapbox or Space-Data, etc), so the _minumum_ you need to edit is config-install.js

### sitrec/config/shared.env

See shared.env.example file for usage. 

### sitrec/config/config.js
This has the basic paths for both the local dev environment, and (optionally) the server environment 
For the dev environment, we need edits in two places:

```javascript
const SITREC_LOCAL = "http://localhost/s/sitrec/"
const SITREC_LOCAL_SERVER = "http://localhost/s/sitrec/sitRecServer/"
```
Then the server, the file has code which will attempt to determine SITREC_HOST from the environment. You might have to set it manually. There's comments in the file explaining this. 

config.js also has the localSituation variable which determines which sitch you boot up into in a local dev environment.


### sitrec/config/config-install.js

This tells Webpack where to put the built application. My setup is:

```javascript
dev_path: '/Users/mick/Library/CloudStorage/Dropbox/Metabunk/sitrec',
prod_path: '/Users/mick/sitrec-deploy'
```

`dev_path` is the path to the local server. Here `/Users/mick/Library/CloudStorage/Dropbox/Metabunk/` is the root of my local web server. A simple Windows configuration might be:

```javascript
dev_path: 'c:\\nginx\\html\\s\\sitrec',
prod_path: 'c:\\Users\\Fred\\sitrec-deploy'
```

If you are just building/testing locally, these can be the same path. 

## sitrec/config/config.php

This sets up credentials for site like mapbox, amazon S3, space-data, etc are now in shared.env
Read the comments in the file. There's a config.php.example file to use as a starting point

File paths are now automatically detected by config_paths.php, which you should not need to edit. If you have a configuration that requires you to edit this file, then please let me know (Open an issue on GitHub or email me, mick@mickwest.com) 

## Install the node modules

In sitrec there will also be a folder, node-modules. This is autogenerated by node.js from the package.json file. To create or update it, in the sitrec folder run 

```bash
npm install
```

This will create the folder node_modules, which will (currently) have 218 folders in it. These are the 24 packages that are used, plus their dependencies.  Note you won't be uploading this to the production server, as we use WebPack to only include what is needed.  You will need to do this when you get new code, but not during your own development. 

## Build the dev app with node.js and Webpack

In the sitrec _project_ folder, run 
```bash
npm run build
```

This will build the app in http://localhost/s/sitrec/, which mostly comprises 

```
index.html - the entry point
index.css - combined CSS
index.9a60e8af738fb4a9ce40.bundle.js (or similar, the name changes) - the code
/src/ - web worker code which is not included in webpack
/sitrecServer/ - the PHP server files
/data/ a copy of the /sitrec/data folder
Some .png files from jquery-ui (not important)
```

Since this is building (via dev-path) into the local server, the dev app will be at 

http://localhost/s/sitrec

## Testing

The following are URLS for tests of basic functions (these assume that the dev setup is in /s/). If they fail, first check the dev tools console to see if there's a helpful error message.

- [PHP Test](http://localhost/s/sitrec/sitrecServer/info.php)
Must display a PHP info page showing version number

- [Terrain elevation test](http://localhost/s/sitrec/sitrecServer/cachemaps.php?url=https%3A%2F%2Fs3.amazonaws.com%2Felevation-tiles-prod%2Fterrarium%2F14%2F3188%2F6188.png)
Test of the tile server proxy for terrain elevation. Should give a square image

- [Mapbox test](http://localhost/s/sitrec/sitrecServer/cachemaps.php?url=https%3A%2F%2Fapi.mapbox.com%2Fv4%2Fmapbox.satellite%2F16%2F20546%2F29347%402x.jpg80)
Returns an aerial tile of some buildings and trees:

- [OSM Test](http://localhost/s/sitrec/sitrecServer/cachemaps.php?url=https%3A%2F%2Fc.tile.openstreetmap.org%2F15%2F6382%2F12376.png)
Returns a segment of a street map

- [EOX Test](http://localhost/s/sitrec/sitrecServer/cachemaps.php?url=https%3A%2F%2Ftiles.maps.eox.at%2Fwmts%3Flayer%3Ds2cloudless_3857%26style%3Ddefault%26tilematrixset%3Dg%26Service%3DWMTS%26Request%3DGetTile%26Version%3D1.0.0%26Format%3Dimage%252Fjpeg%26TileMatrix%3D15%26TileCol%3D6383%26TileRow%3D12373)
Test of EOX landscape server - returns a brown aerial landscape tile

- [Landscape Test](http://localhost/s/sitrec/?sitch=swr)
A simple landscape, shows that the landscape proxy server is working

- [Default Sitch](http://localhost/s/sitrec/)
Will load the default local sitch set in config.js

- [Aquadilla Sitch](http://localhost/s/sitrec/?sitch=agua)
A more complex sitch with a video, landscape, tracks, and complex computations

- [Smoke Test](http://localhost/s/sitrec/?testAll=1)
A smoke test that loads ALL the sitches one after another

- [Quick Smoke Test](http://localhost/s/sitrec/?testAll=2)
  A smoke test that loads ALL the sitches one after another as quickly as possible

Failure could mean
- PHP-fpm not running
- php.ini missing extension=openssl
- s/sitrec-cache is missing or not writeable


## Production Build and Deploy

```bash
npm run deploy
```

This will build a production version of the code into the folder specified by prod_path in config-install.js

This is essentially the same as the dev version, except it's minified and has no debug info (file/line numbers, etc.) The minification means it takes a bit longer to build (for me build/dev is 3-4 seconds, and deploy/prod is about 15 seconds. YMMV)

The folder specified by prod_path here is arbitrarily named, it's just a temporary container for the production app and data before you transfer it to the production server. You can do that with FTP, ssh/rsync, or the deployment tool of your choice. I use rsync:

```bash
rsync -avz --delete -e "ssh " "$LOCAL_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR
```
Before testing this, ensure you've got the five folders on the deploy servers, the same as on the local dev server. 

## Docker

`docker compose -p sitrec up -d` will start a container running the sitrec frontend and sitrecServer. By default, this will expose the service on `http://localhost:6425/`, without a basepath. To run on a different port, change the `ports` section of the `docker-compose.yml` file.

`docker compose -p sitrec up -d --build` will force a rebuild of the image.

A default bind mount is set up for the `sitrec-videos` folder in the root of the project directory, allowing videos to be added. The `sitrec-cache` folder uses a volume by default, but can be changed to a bind mount by uncommenting a line in the `docker-compose.yml` file.

Default sitrec-cache and sitrec-upload folders is created - but these will not persist. 

The shortening functionality is not available in the docker container, as this depends on the Metabunk server.


