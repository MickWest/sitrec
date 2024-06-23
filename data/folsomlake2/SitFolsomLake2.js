export const SitFolsomLake2 = {
  include_folsomlake: true,
  name: 'folsomlake2',
  menuName: 'Folsom Lake Test2',
  isTextable: true,

  tilt: 0,

  frames: 7285,
  fps: 59.94,

  //    terrain: {lat: 38.722270, lon: -121.1694455, zoom: 15, nTiles: 12},

  startAltitude: 140, // if a track is relative (like Mini DJI SRT files), then need an initial altitude
  adjustAltitude: 0, // and if not, then we might want to bring it up above the ground
  files: {
    cameraFile: 'folsomlake/Jan-4th-2024-02-19PM-Flight-Airdata.csv',
  },
  startTime: '2024-01-04 22:19:36.704Z', //

  videoFile: '../sitrec-videos/public/MICK DJI_0046 - half.mp4',

  mainCamera: {
    startCameraPositionLLA: [38.71531, -121.164961, 513.954877],
    startCameraTargetLLA: [38.72225, -121.169801, 38.152651],
  },
};
