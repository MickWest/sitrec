// This needs to be derived from something better than SitPVS14 (looking out a plane window)
// or SitKML (looking at a target track)
// make it more general and data driven

export const SitRGordon = {
  include_pvs14: true,
  name: 'rgordon',
  menuName: 'RGordon Starlink',
  isTextable: true,

  simSpeed: 1,
  fps: 24,

  starScale: 0.19,
  satScale: 0.36,
  satCutOff: 0.0125,

  // lat and lon define the EUS origin
  lat: 43.378397994666656,
  lon: -83.17161173333334,

  files: {
    starLink: 'rgordon/starlink-2023-12-23.tle',
    cameraFile: 'rgordon/FlightAware_N711WS_KSNA_CYYZ_20231223.kml',
  },

  videoFile:
    '../sitrec-videos/private/RGordon UAP video  -  taken by me in Dec 23 at 3-53am .mp4',
  startTime: '2023-12-23T08:54:32.300Z',
  frames: 3050,

  ptz: { az: 83.2, el: 0.9, fov: 7.3, showGUI: true },

  mainCamera: {
    startCameraPositionLLA: [42.957372, -84.432317, 49840.021007],
    startCameraTargetLLA: [42.959455, -84.420653, 49671.77823],
  },
  cameraTrack: {},
};
