export const SitLakeMichigan = {
  include_kml: true,
  name: 'lakemichigan',
  menuName: 'Lake Michigan Tic-Tac',
  isTextable: true,

  targetSize: 200, // in feet
  tilt: 0,

  frames: 1200,
  terrain: { lat: 42.933424, lon: -86.12973, zoom: 9, nTiles: 8 },
  files: {
    cameraFile: 'lakemichigan/FlightAware_UAL267_KBOS_KDEN_20211017.kml',
    TargetTrack: 'lakemichigan/FlightAware_DAL2474_KORD_KDTW_20211017.kml',
    TargetObjectFile: './models/737_MAX_8_White.glb',
  },
  startTime: '2021-10-17T15:50:27.766Z',

  videoFile: '../sitrec-videos/private/118963_submitter_file1__IMG2065_opt.mp4',
  skyColor: 'skyblue',
  mainCamera: {
    startCameraPositionLLA: [42.647359, -86.678554, 23575.039421],
    startCameraTargetLLA: [42.653377, -86.670554, 23235.005817],
  },
  lookCamera: { fov: 5 },
  cameraTrack: {},

  mainView: { left: 0.0, top: 0, width: 0.5, height: 1 },

  include_TrackToTrack: true,
  targetObject: { file: 'TargetObjectFile' },
};
