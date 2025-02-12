## Adding A Sitch in Code

### (The following approach has largely been replaced by setting up a custom sitch. See: 
- [The Custom Sitch Tool - Drag and Drop Sitches](docs/CustomSitchTool.md)
- [Local custom Sitch with JSON files - More complex cusom sitches](./docs/LocalCustomSitches.md))

### So this approach would only apply if you need to add custom code

A "sitch" is a situation - i.e. a scenario that is being recreated. Each sitch is defined by one Javascript file, and (optionally) some data files.

To create a new sitch, the simplest way is to copy and rename an existing one that does something similar to what you want. So, for example, if you want to recreate a video of one plane being viewed from another plane, you could use the "Lake Michigan" sitch as a base.

Let's call the new stitch "Springfield" (just an example name), and assume you have KML files for the two planes, along with a location and time.

- Copy sitch/SitLakeMichigan.js to sitch/SitSpringfield.js (Sitch files must start with "Sit")
- Edit three names at the start of the Sitch definition:
    - SitLakeMichigan -> SitSpringfield
    - "lakemichigan" -> "springfield" (lower case)
    - "Lake Michigan Tic-Tac" - > "Springfield window UAP"
- Add the two KML files to data/springfield
- Edit the `files` structure with the new files:
    - cameraFile = KML or SRT of where the video was filmed from
    - TargetTrack = KML file of the target plane (i.e. the suspected UAP)
- Add the video to /sitrec-videos/private/
- update the "videoFile" to point to this.
- Adjust the "startTime" to be the start time of the video. Note this is in Zulu time (UTC/GMT)
- Adjust "frames" to be the number of frames in the video
- Adjust or add "fps" to be the frames per second of the video (default is 30, typical values might be 24, 25, 29.97, 60, or 59.95)
- Adjust fov in lookCamera to match the vertical FOV of the camera (and lens/zoom) being used
- Adjust the lat/lon of the `terrain` descriptor, along with:
    - zoom: power of two zoom level, maximum 15
    - nTiles: the terrain will be a square with this many tiles on each side
- (Optional) `skyColor`: adjust the sky color

If you don't have a video, you can just remove references to one, but you'll still need to specify a number of frames (you can leave fps at 30)

For testing, you can either use a url denoting the sitch, like:
https://www.metabunk.org/sitrec/?sitch=springfield
Or you can change the "localSituation" line in config.js
`const localSituation = "springfield";`

A sitch will generally have multiple views, each view has an id, specifically:
- **mainView** - The free camera 3D view of the world, so you can see what's going on
- **lookView** - The view in which we simulate the video
- **videoView** - The view that has the actual video


This is the preferred naming convention, but some older bits of code or comments might refer to lookView as the NAR view (as it was NAR mode on the ATFLIR system in the original "Gimbal" sitch)

The camera position is specified by two lines:
```javascript
startCameraPositionLLA:[42.647359,-86.678554,23575.039421],
startCameraTargetLLA:[42.653377,-86.670554,23235.005817],
```

These are LLA (Latitude, Longitude, Altitude in meters) positions. Note some sitches have the position specified as EUS local coordinates. LLA is preferred as the EUS coordinate system can change if you do things like adjust the resolution of the terrain.

Some legacy sitches specify the camera position in EUS coordinates (i.e. local x,y,z being East, Up, and South). This is not recommended, as it can change if you adjust the terrain resolution.

To get the camera position, just move it to where you want and then copy-and-paste the LLA lines from the debugger console output.

To adjust the "views" (the on-screen rectangles that show something like a 3D view of the world, a video, an image, a graph, etc), you can add a view rectangle specifier for each one. For example:
```javascript
lookView: { left: 0.75, top: 0.35, width: -0.75, height: 0.65,},
videoView: { left: 0.5, top: 0.35, width: -0.75, height: 0.65,},
mainView: { left: 0.0, top: 0, width: 1, height: 1},
```

Positions and size are specified as a fraction of the screen's width and height
If one component (width or height) is negative, then that means it is a multiple of the other one. In the example above, we use a height of 0.65 of the window height, and then 0.75ths of that for the width. This ratio comes from the width and height of the video.

Note in the above, mainView covers the entire screen (width:1), but it's also typical to limit it to half the screen (width:0.5).

## EXAMPLE NEW SITCH: WestJet

Note: This was originally a sitch specified in code, but the same format is used for the dynamically loaded files that are parsed as text. This was in src/sitch/SitWestJet.js (as a code module), but is now in data/sitWestJet.js (as a text file)

![WestJet Screenshot](readmeImages/westjet.jpg)

```javascript
export const SitWestJet = {
    include_pvs14:true,
    name: "westjet",
    menuName: "WestJet Triangle",

    files: {
        starLink: "westjet/starlink-2023-12-18.tle",
        cameraFile: "westjet/FlightAware_WJA1517_KPHX_CYYC_20231219.kml",
    },

    videoFile: "../sitrec-videos/private/UAP Sighting by WestJet Passengers 12-18-23 16-05 clip.mp4",
    startTime: "2023-12-19T03:56:12.560Z",
    frames: 782,

    mainCamera: {
        fov: 30, near:1,  far:60000000,
        startCameraPositionLLA: [38.602145, -86.506588, 4159762.165337],
        startCameraTargetLLA: [38.603456, -86.509621, 4158895.037381],
    },
    lookCamera:{ fov: 10, far: 8000000 },
    cameraTrack: {},
    ptz: {az: -79.6, el: 0.6, fov: 25.7, showGUI: true},
    altitudeLabel:      { kind: "MeasureAltitude",position: "lookCamera"},
}
```
WestJet is a case of Starlink satellites observed from a plane. This new case was similar to the PVS14 sitch, so we use that as a base with the include_pvs14 line.

The remaining lines show everything that needs to change

- files:
    - starLink - a TLE file of all starlink satellites for the day in question
    - cameraFile - a KML file showing the timestamped path of the plane.
- videoFile - the segment of the video we are interested in - reduced to 720p for speed
- startTime - the start time of the video.
- frames - the number of frames in the video (which is the default 30 fps)
- mainCamera - definition of the main camera
    - startCamera... etc - the absolute position of the camera for the mainView (i.e. the world view on the left)
    - fov - the _vertical_ field of view of the mainView
    - near - near plane distance in meters (defaults to 1)
    - far - far plane distance in meters (defaults to 8000000. i.e. 8000km)
- lookCamera - definition of the look camera
    - fov, far, etc, same as mainCamera
- cameraTrack - creates a camera track, defaulting to one from cameraFile using startTime and frames for the interval.
- ptz - The Pan/Tilt/Zoom orientation of the camera
- altitudeLabel - a label with arrows showing the altitude of the camera. Note this is a new feature, and is not in the PVS14 sitch.

Note the views are not changed from PVS14, as it's a fairly standard landscape mode. 
