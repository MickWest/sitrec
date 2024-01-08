
# Code overview
Sitrec is a web application that runs mostly client-side using JavaScript and some custom shaders but also has a handful of server-side scripts written in PHP. 

The rendering code uses Three.js, and there are a variety of other open-source libraries. All this uses MIT licenses or similar. 

The code cannot be run directly, as it is set up to be compiled using WebPack.
Install local dev environment

Assuming that you want to run the code on a local machine for development, testing, etc, you need the following installed
A web server. I use Nginx, but Apache should work
The web server should be configured to run php files (i.e. php-fpm)
It should also load an index.html file when there's on in the directory (this is usually default)
node.js, from:
https://nodejs.org/en/download

Node.js is used both for build tools (i.e. webpack) and for packages used by the app

## Create Source file and folder structure
Sitrec is built from the sitrec-source folder. You will get this as a zip archive, or via github (https://github.com/MickWest/sitrec-source). this will give you sitrec-source with four subfolders:
- data - per-sitch data like ADS-B data, csv files, TLEs, models, sprites, and images
- sitrecServer - The server-side PHP files, like cachemaps.php
- src - The JavaScript source, with the entry point of index.js
- three.js - The 3D engine, the largest library used

Then there are the project build files:
- package.json - top-level descriptor, contains npm scripts for build and deploy. It also contains the devDependencies (node modules that are used)
- webpack.common.js - the main configuration file for Webpack. The next two files both include this. 
- webpack.dev.js - used for development
- webpack.prod.js - used for production/deployment
- config.js - Contains install-specific constants for server paths used by the app
- config-install.js - development and production file paths, used by the build system

(config.js and config-install.js are initial supplied as config.js.example and config-install.js.example - you will need to rename them.)

## Create the local (and production) server folder structure
Sitrec can exist at the server root, or in any path. I use the root, but it's maybe neater to have in a folder. Here I'll assume it's in a folder called "s"

There are five folders in the server structure
- sitrec - the folder containing the Webpacked app and the data files (except videos). This is deleted and recreated when rebuilding, so don't edit anything in there, edit the 
- sitrec-config - contains server-side PHP configuration files - you need to edit this. 
- sitrec-cache - a server-side cache for terrain tiles, initially empty
- sitrec-upload - for rehosting user files (like ADS-B or TLE). Initially empty
- sitrec-videos - The videos for the sitches. Handled separately as it can get quite large. The videos are subdivided into public (government or other unrestricted files) and private (where the licensing rights are unclear, but are used here under fair-use). So there's two sub-folders that you need to keep
  - sitrec-videos/public
  - sitrec-videos/private

Note sitrec-cache and sitrec-upload must have write permission.

## Create/Edit the config files
 You will need to edit config.js and config-install.js to 

### sitrec-source/config.js
This has the basic paths for both the local dev environment, and (optionally)the server environment 
For the dev environment, we need edits in two places:

```
const SITREC_LOCAL = "http://localhost/s/sitrec/"
const SITREC_LOCAL_SERVER = "http://localhost/s/sitrec/sitRecServer/"
```
Then the server, the file has code which will attempt to determine SITREC_HOST from the environment. You might have to set it manually. There's comments in the file explaining this. 

config.js also has the localSituation variable which determines which sitch you boot up into in a local dev environment.


### sitrec-source/config-install.js

This tells Webpack where to put the built application. My setup is:
```
dev_path: '/Users/mick/Library/CloudStorage/Dropbox/Metabunk/sitrec',
prod_path: '/Users/mick/sitrec-deploy'
dev_path is the path to the local server. Here /Users/mick/Library/CloudStorage/Dropbox/Metabunk/ is the root of my local web server. A simple windows configuration might be:
dev_path: 'c:\\nginx\\html\\s\\sitrec',
prod_path: 'c:\\Users\\Fred\\sitrec-deploy'
```

	
## Create/Edit the server config files:
It will run without this, but you won't get any terrain.

sitrec-config/cachemaps-config.php - is a short file that has the mapbox access token (public, starts with pk). You will need your own token
See: https://docs.mapbox.com/mapbox.js/api/v3.3.1/api-access-tokens

Sample file:
```
<?php
$token = "?access_token=pk.eyJ1IjoibWlja3diLCJhIjoiY2wzeWdsdfdnA1MsGJsbDNicDA3bW9vdThnYn3QccWDtBHBdCd1aivcJtdIQA";
```
## Install the node modules. 

In sitrec-source there will also be a folder, node-modules. This is autogenerated by node.js from the package.json file. To create or update it, in the sitrec folder run 

```
npm install
```

This will create the folder node_modules, which will (currently) have 218 folders in it. These are the 24 packages that are used, plus their dependencies.  Note you won't be uploading this to the production server, as we use WebPack to only include what is needed.  You will need to do this when you get new code, but not during your own development. 

## Build the dev app with node.js and Webpack

```
npm run build
```

This will build the app in http://localhost/s/sitrec/, which mostly comprises 

```
index.html - the entry point
index.css - combined CSS
index.9a60e8af738fb4a9ce40.bundle.js (or similar, the name changes) - the code
/src/ - web worker code which is not included in webpack
/sitrecServer/ - the PHP server files
/data/ a copy of the /sitrec-source/data folder
Some .png files from jquery-ui (not important)
```

Since this is building (via dev-path) into the local server, the dev app will be at 

http://localhost/s/sitrec

## Testing

The following are URLS for tests of basic functions (these assume that the dev setup is in /s/). If they fail, first check the dev tools console to see if there's a helpful error message.

http://localhost/s/sitrec/sitrecServer/info.php

Must display a PHP info page showing version number
http://localhost/s/sitrec/sitrecServer/cachemaps.php?url=https%3A%2F%2Fs3.amazonaws.com%2Felevation-tiles-prod%2Fterrarium%2F14%2F3188%2F6188.png

Test of the tile server proxy for terrain elevation. Should give a square image

Failure could mean
- PHP-fpm not running
- php.ini missing extension=openssl
- s/sitrec-config/cachemaps-config.php is missing or bad

http://localhost/s/sitrec/sitrecServer/cachemaps.php?url=https%3A%2F%2Fapi.mapbox.com%2Fv4%2Fmapbox.satellite%2F16%2F20546%2F29347%402x.jpg80

Test of Mapbox proxy loading. Should return an aerial tile of some buildings and trees:

http://localhost/s/sitrec/sitrecServer/cachemaps.php?url=https%3A%2F%2Fc.tile.openstreetmap.org%2F15%2F6382%2F12376.png

Test of OSM, returns a segment of a street map

http://localhost/s/sitrec/sitrecServer/cachemaps.php?url=https%3A%2F%2Ftiles.maps.eox.at%2Fwmts%3Flayer%3Ds2cloudless_3857%26style%3Ddefault%26tilematrixset%3Dg%26Service%3DWMTS%26Request%3DGetTile%26Version%3D1.0.0%26Format%3Dimage%252Fjpeg%26TileMatrix%3D15%26TileCol%3D6383%26TileRow%3D12373

Test of EOX landscape server - returns a brown aerial landscape tile

http://localhost/s/sitrec/dist/?sitch=swr

A simple landscape, shows that the landscape proxy server is working
http://localhost/s/sitrec/

Will load the default local sitch set in index.js (curently SWR)
Should give you the menu on the right to select other sitches.

http://localhost/s/sitrec/?sitch=lakemichigan

A basic sitch with a video, landscape, and KML/ADS-B tracking
http://localhost/s/sitrec/?testAll=1

A smoke test that loads ALL the sitches one after another

## Production Build and Deploy

```
npm run deploy
```

This will build a production version of the code into the folder specified by prod_path in config-install.js

This is essentially the same as the dev version, except it's minified and has no debug info (file/line numbers, etc.) The minification means it takes a bit longer to build (for me build/dev is 3-4 seconds, and deploy/prod is about 15 seconds. YMMV)

The folder specified by prod_path here is arbitrarily named, it's just a temporary container for the production app and data before you transfer it to the production server. You can do that with FTP, ssh/rsync, or the deployment tool of your choice. I use rsync:

```
rsync -avz --delete -e "ssh " "$LOCAL_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR
```
Before testing this, ensure you've got the five folders on the deploy servers, the same as on the local dev server. 

## Adding A Sitch

A "sitch" is a situation - i.e. a scenario that is being recreated. Each sitch is defined by one Javascript file, and (optionally) some data files. 

To create a new sitch, the simplest way is to copy and rename an existing one that does something similar to what you want. So, for example, if you want to recreate a video of one plane being viewed from another plane, you could use the "Lake Michigan" sitch as a base.

Let's call the new stitch "Springfield" (just an example name), and assume you have KML files for the two planes, along with a location and time. 

- Copy sitch/SitLake-Michigan-Tic-Tac.js to sitch/SitSpringfield.js (Sitch files must start with "Sit"
- Edit three names at the start of the Sitch definition:
- SitLakeMichiganTicTac -> SitSpringfield
- "lakemichigan" -> "springfield" (lower case)
- "Lake Michigan Tic-Tac" - > "Springfield window UAP"
- Add the two KML files to data/springfield
- Edit the files structure with the new files:
- cameraFile = KML or SRT of where the video was filmed from
- KMLTarget = KML file of the target plane (i.e. the suspected UAP)
- Add the video to /sitrec-videos/private/
- update the "videoFile" to point to this.
- Adjust the "startTime" to be the start time of the video. Note this is in Zulu time (UTC/GMT)
- Adjust "frames" to be the number of frames in the video
- Adjust or add "fps" to be the frames per second of the video (default is 30, typical values might be 24,25,29.97,60, or 59.95
- Adjust planeCameraFOV to match the vertical FOV of the camera (and lens/zoom) being used
- Adjust the lat/lon of the terrain descriptor, along with:
- zoom: power of two zoom level, maximum 15
- nTiles: the terrain will be a square with this many tiles on each side
- (Optional) adjust the sky color

If you don't have a video, you can just remove references to one, but you'll still need to specify a number of frames (you can leave fps at 30)

For testing, you can either use a url denoting the sitch, like: 
https://www.metabunk.org/sitrec/?sitch=springfield
Or you can change the "localSituation" line in config.js
const localSituation = "springfield";

A sitch will generally have multiple views, each view has an id, specifically:
- **mainView** - The free camera 3D view of the world, so you can see what's going on
- **lookView** - The view in which we simulate the video
- **videoView** - The view that has the actual video


This is the preferred naming convention, but some older bits of code might refer to lookView as the NAR view (as it was NAR mode on the ATFLIR system in the original "Gimbal" sitch)

The camera position is specified by two lines:
```javascript

startCameraPositionLLA:[42.647359,-86.678554,23575.039421],
startCameraTargetLLA:[42.653377,-86.670554,23235.005817],
```

These are LLA (Latitude, Longitude, Altitude in meters) positions. Note some sitches have the position specified as EUS local coordinates. LLA is preferred as the EUS coordinate system can change if you do things like adjust the resolution of the terrain.

To get the camera position, just move it to where you want and then copy-and-paste the LLA lines from the debugger console output.  

To adjust the views, you can add a view rectangle specifier for each one. For example:
```javascript
lookView: { left: 0.75, top: 0.35, width: -540/720, height: 0.65,},
videoView: { left: 0.5, top: 0.35, width: -540/720, height: 0.65,},
mainView:{left:0.0, top:0, width:1,height:1},
```

Positions and size are specified as a fraction of the screen's width and height
If one component (width or height) is negative, then that means it is a multiple of the other one. In the example above, we use a height of 0.65 of the window height, and then 540/720ths of that for the width. This ratio comes from the width and height of the video. 

Note in the above, mainView covers the entire screen, but it's also typical to limit it to half the screen. 

## EXAMPLE NEW SITCH: WestJet

![WestJet Screenshot](readmeImages/westjet.jpg)

```javascript
import {SitPVS14} from "./SitPVS14";


export const SitWestJet = {
   ...SitPVS14,
   name: "westjet",
   menuName: "WestJet Triangle",


   files: {
       starLink: "westjet/starlink-2023-12-18.tle",
       cameraFile: "westjet/FlightAware_WJA1517_KPHX_CYYC_20231219.kml",
   },


   videoFile: "../sitrec-videos/private/UAP Sighting by WestJet Passengers 12-18-23 16-05 clip.mp4",
   startTime: "2023-12-19T03:56:12.560Z",
   frames: 782,


   ptz: {az: -79.6, el: 3.7, fov: 25.7, showGUI: true},


   startCameraPositionLLA:[38.602145,-86.506588,4159762.165337],
   startCameraTargetLLA:[38.603456,-86.509621,4158895.037381],


}
```
WestJet is a case of Starlink satellites observed from a plane. This new case was similar to the PVS14 sitch, so we use that as a base with the ...SitPVS14 line.

the remaining lines show everything that needs to change

files: 
- starLink - a TLE file of allstarlink satellites for the day in question
- cameraFile - a KML file showing the timestamped path of the plane. 
- videoFile - the segment of the video we are interested in - reduced to 720p for speed
- startTime - the start time of the video. 
- frames - the number of frames in the video (which is the default 30 fps)
- ptz - The Pan/Tilt/Zoom orientation of the camera
- startCamera... - the absolute position of the camera for the mainView (i.e. the world view on the left)

Note the views are not changed from PVS14, as it's a fairly standard landscape mode. 



