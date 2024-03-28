# Custom Sitches in Sitrec

Sitrec allows the user to create and interact with a variety of situations, called "sitches"

Sitches are defined using a Javascript style structure stored in a file that starts with "Sit" and ends with .js. Each Sitch is inside a folder that can (optionally) contain asset files (like KLM or MISB tracks, CSV data files, or 3D models).

Sitrec is primarily aimed  with recreating an event that happens over the course of a few seconds or minutes. The main way it does this is with *time series data*. 

### Time Series Data (TSD)

Time series data is data that is recorded at specified intervals of time. The most obviousy example is a video, where indivual frames of the video are data, and they are recorded at regular interval, like 30 frames per second. 

TSD is often recorded at regular intervals, but can be at irregular intervals. The intervals can be small or large. 

When we play a stich, we are essentially creating a video. Sitrec will try to match the original video frame rate. So if there is TSD that has a different interval from the video, then we will need to interpolate intermediate data for the missing time intervals. 

Since matching source video is so fundamental to Sitrec, and since we often want to advance the simulation by individual frames matching the video, it's convenient that the unit of time used is **one frame**.  

This means that the unit of time can vary. One frame is often 1/30th of a second, but could be other fractions of a second, like 1/60, 1/29.97, 1/24, 1/25 and others. The length of a frame is defined by the **frames per second** set in the sitch file. If none is specified, then **fps** will default to 30. 

The time pat of the sitch is defined by two other variable, the **frames** and **startTime**.

**frames** is the number of frames in the sitch, which will typically be the number of frames in a video, but also might represent a simple time interval. 

The duration of the sitch in frames is given by **duration = frames/fps**, hence **frames = duration * fps**

**startTime** is the date and time at the start of the sitch, in UTC time. It's the time at the start of the first frame. Frames in the sitch are zero based. Meaning the at frame 0, the time will be equal to startTime, and at frame **f** the time will be **startTime + (f / fps)**

Example

```javascript
    fps: 29.97,
    frames: 19480, // (10*60+50)*29.97,
    startTime: "2023-08-05T07:39:13.000Z",
```
Here the sitch has a video running at 29.97 fps. Note we currently only support constant framerate videos. If a video is recorded with a variable framerate, then it will need converting to constant framerate.  
The **frames** value is set to 19480. The part of the line after // is a "comment", meaning it is helpful info for you the reader, but it is ignored by the code. Here I'm noting that the value 19480 comes from multiplying a duration in seconds by the fps. The (10*60+50) is the number of seconds in 10 minutes and 50 seconds. 

The startTime value always has the format YYYY-MM-DDTHH:MM:SS:mmmZ (where mmm is milliseconds)

### Sitch File Format

The above example is part of a sitch file. Notice each line has two fundamental parts, a key folllowed by a colon(:), and a value followed by a comma (,). This is a necessary part of each line, and omitting the colon or comma will result in errors.

The simplest sitch file would look like:

```javascript
export const SitEmpty = {
    name: "empty",
}
```

The line **export const SitEmpty = {** is not used, but makes it backwards compatible with the legacy built-in sitches (which required recompiling the entire project)

A more functional sitch, with comments explaining what each line does.
```javascript
export const SitSWR = {
    name: "swr",                    // the name of the sitch, which we can use with "include_"
    menuName: "Skinwalker Ranch",   // Name displayed in the menu
    isTextable: true,               // true if we can export and edit this sitch as a custom sitch

    // Terrain Lat/Lon is the center of the map
    // zoom is the zoom level of the map (1-15 for Mapbox)
    // nTiles is the size of the square region to load (in tiles, so here 4x4)
    // tileSegments is optional in the range 1..256 and is the resolution of the height map
    terrain: {lat: 40.2572028, lon: -109.893759, zoom: 14, nTiles: 4, tileSegments: 256},

    // a single camera, with the position and heading define by two LLA points
    mainCamera: {
        startCameraPositionLLA:[40.254018,-109.880925,1685.104643],
        startCameraTargetLLA:[40.257957,-109.891099,1439.697690],
    },
    
    // a full screen view. The size and position are fractions of the window size
    // background is the color of the sky.
    mainView: {left:0.0, top:0, width:1,height:1, background: [0.53, 0.81, 0.92],},
}
```
Here we see more complex values, which are themselves key:value *objects* - i.e. a list of named parameters with values.

Notice that the value for the **mainCamera:** key is over four lines. This is normal Javascript, but it's important to recognize that **startCameraPositionLLA:** is a parameter of **mainCamera** and not of the sitch.  