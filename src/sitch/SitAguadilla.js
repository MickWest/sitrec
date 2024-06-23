import { par } from '../par';
import { FileManager, gui, NodeMan, Sit } from '../Globals';
import { DirectionalLight, HemisphereLight, AlwaysDepth } from 'three';
import {
  ExpandKeyframes,
  f2m,
  m2f,
  metersFromMiles,
  radians,
  scaleF2M,
} from '../utils';
import { VG, ViewMan } from '../nodes/CNodeView';
import { LLAToEUS } from '../LLA-ECEF-ENU';
import { CNodeSplineEditor } from '../nodes/CNodeSplineEdit';
import * as LAYER from '../LayerMasks.js';
import { CNodeConstant } from '../nodes/CNode';
import { CNodeSwitch } from '../nodes/CNodeSwitch';
import { CNodeArray } from '../nodes/CNodeArray';
import { CNodeGUIValue } from '../nodes/CNodeGUIValue';
import { CNodeMunge } from '../nodes/CNodeMunge';
import { CNodeDisplayTrackToTrack } from '../nodes/CNodeDisplayTrackToTrack';
import { CNodeDisplayTrack } from '../nodes/CNodeDisplayTrack';
import { CNodeDisplayTargetSphere } from '../nodes/CNodeDisplayTargetSphere';
import { CNodeLOSTrackTarget } from '../nodes/CNodeLOSTrackTarget';
import { CNodeScale } from '../nodes/CNodeScale';
import { CNodeWind } from '../nodes/CNodeWind';
import { CNodeHeading } from '../nodes/CNodeHeading';
import { AddSpeedGraph } from '../JetGraphs';
import { guiTweaks } from '../Globals';
import { GlobalScene } from '../LocalFrame';
import { showHider, toggler } from '../KeyBoardHandler';
import {
  CreateTraverseNodes,
  MakeTraverseNodesMenu,
  SetupTraverseNodes,
} from '../JetStuff';
import { DebugSphere } from '../threeExt';
import { CNodeDisplayLOS } from '../nodes/CNodeDisplayLOS';
import { makeMatLine } from '../MatLines';
import { Color } from 'three';
import { addControllerTo } from '../nodes/CNodeController';
import { CNodeTransferSpeed } from '../nodes/CNodeTransferSpeed';
import { CNodeSmoothedPositionTrack } from '../nodes/CNodeSmoothedPositionTrack';
import { CNodeTrackClosest } from '../nodes/CNodeTrackClosest';
import { assert } from '../assert.js';
import { trackHeading } from '../trackUtils';
import { MV3, V3 } from '../threeUtils';

export const SitAguadilla = {
  name: 'agua',
  menuName: 'Aguadilla',
  isTextable: false,

  fps: 29.97,
  frames: 7028, // note, old CSV was 7027, so duplicated the last line to match the video at 7028
  aFrame: 0,
  bFrame: 6000,

  lookCamera: {
    fov: 1,
    far: 800000,
  },

  startDistance: 1.612,
  startDistanceMax: 3.5,
  startDistanceMin: 0.1,

  targetSize: 2,

  targetSpeed: 16.555,
  targetSpeedMin: 0,
  targetSpeedMax: 100,
  targetSpeedStep: 0.001,

  // Near and far clipping distances for the main 3D view
  nearClip: 1,

  files: {
    // one big file with all the data in it.
    //        aguaCSV: "./agua-frames-data.csv.zip"
    aguaCSV: 'agua/agua-frames-data.csv',
  },

  mainCamera: {
    startCameraPosition: [
      -9851.407079455104, 2847.1976940099407, -2584.264310831998,
    ],
    startCameraTarget: [
      -8986.013511122388, 2586.5050262571704, -2156.3235382146754,
    ],
  },
  mainView: {
    left: 0.0,
    top: 0,
    width: 1,
    height: 1,
    fov: 50,
    background: '#005000',
  },

  canvasResolution: {
    kind: 'GUIValue',
    value: 720,
    start: 10,
    end: 1000,
    step: 1,
    desc: 'Resolution',
    gui: 'tweaks',
  },

  lookView: {
    left: 0.625,
    top: 1 - 0.5,
    width: -1.5,
    height: 0.5,
    canvasWidth: 'canvasResolution',
    canvasHeight: {
      id: 'canvasHeight',
      kind: 'Math',
      math: '$canvasResolution/1.5',
    },
    effects: {
      FLIRShader: {},

      Agua_Levels: {
        kind: 'Levels',
        inputs: {
          inputBlack: {
            kind: 'GUIValue',
            value: 0,
            start: 0.0,
            end: 1.0,
            step: 0.01,
            desc: 'IR In Black',
          },
          inputWhite: {
            kind: 'GUIValue',
            value: 1.0,
            start: 0.0,
            end: 1.0,
            step: 0.01,
            desc: 'IR In White',
          },
          gamma: {
            kind: 'GUIValue',
            value: 1.87,
            start: 0.0,
            end: 4.0,
            step: 0.01,
            desc: 'IR Gamma',
          },
          outputBlack: {
            kind: 'GUIValue',
            value: 0.0,
            start: 0.0,
            end: 1.0,
            step: 0.01,
            desc: 'IR Out Black',
          },
          outputWhite: {
            kind: 'GUIValue',
            value: 1.0,
            start: 0.0,
            end: 1.0,
            step: 0.01,
            desc: 'IR Out White',
          },
        },
      },

      StaticNoise: {
        inputs: {
          amount: {
            kind: 'GUIValue',
            value: 0.02,
            start: 0.0,
            end: 0.2,
            step: 0.001,
            desc: 'Noise Amount',
          },
        },
      },

      // digital zoom for the 3x with 2024 focal length
      digitalZoom: {
        inputs: {
          magnifyFactor: { id: 'digitalZoomGUI', kind: 'Constant', value: 100 },
        },
      },

      // final zoom to match the video zoom (scaling up pixels)
      pixelZoom: {
        id: 'pixelZoomNode',
        inputs: {
          magnifyFactor: {
            id: 'pixelZoom',
            kind: 'GUIValue',
            value: 100,
            start: 10,
            end: 2000,
            step: 0.01,
            desc: 'Pixel Zoom %',
            hidden: true,
          },
        },
      },
    },
    syncPixelZoomWithVideo: true,
  },

  videoFile: '../sitrec-videos/public/Aquadilla High Quality Original.mp4',
  videoView: { left: 0.625, top: 0, width: -1.5, height: 0.5 },

  // Aguadilla terrain location. 8x8 tiles at zooom level 15
  // there's no file for terrain, it all comes from the server
  // based purely on the lat/lon
  terrain: { lat: 18.499617, lon: -67.113636, zoom: 15, nTiles: 8 },

  focusTracks: {
    'Ground (No Track)': 'default',
    'Jet track': 'jetTrack',
    'Jet Track Smooth': 'jetTrackSmooth',
    //"Target Track": "targetTrack",
    'Target Track Smooth': 'targetTrackSmoothRaised',
    'Ground Splint Editor': 'groundSplineEditor',
    'Traverse Path (UFO)': 'LOSTraverseSelectSmoothed',
  },

  altitudeLabel1: {
    kind: 'MeasureAltitude',
    position: 'jetTrackSmooth',
    defer: true,
  },
  altitudeLabel2: {
    kind: 'MeasureAltitude',
    position: 'LOSTraverseSelectSmoothed',
    defer: true,
  },
  distanceLabel: {
    kind: 'MeasureAB',
    A: 'jetTrackSmooth',
    B: 'LOSTraverseSelectSmoothed',
    defer: true,
  },

  DisplayCameraFrustum: {
    targetTrack: 'LOSTraverseSelectSmoothed',
    defer: true,
  },

  setup: function () {
    assert(GlobalScene !== undefined, 'Missing GlobalScene');

    // Flag for camera to follow the jet
    //   gui.add(par, 'lockCameraToJet').listen().name("Lock Camera to Plane");

    // adjusing the main FOV, not really used now it's set well.
    gui
      .add(par, 'mainFOV', 0.35, 80, 0.01)
      .onChange((value) => {
        const mainCam = NodeMan.get('mainCamera').camera;
        mainCam.fov = value;
        mainCam.updateProjectionMatrix();
      })
      .listen()
      .name('Main FOV');

    const view = NodeMan.get('mainView');
    const lookView = NodeMan.get('lookView');

    lookView.preRenderFunction = () => {
      const csv = FileManager.get('aguaCSV');
      let lookFOV = Number.parseFloat(csv[par.frame][15]);

      let zoom = 1;
      // special cose where zoom displays as 2024
      // that means it's actually 675 with 3x digital zoom
      if (lookFOV === 2024) {
        lookFOV = 675;
        zoom = 3;
      }
      NodeMan.get('digitalZoomGUI').value = 100 * zoom;

      lookFOV = (4 * 135) / lookFOV;
      const lookCam = NodeMan.get('lookCamera').camera;
      lookCam.fov = lookFOV;
      lookCam.updateProjectionMatrix();
    };

    // Lighting
    const light = new DirectionalLight(0xffffff, 0.8);
    light.position.set(100, 1300, 100);
    light.layers.enable(LAYER.LOOK);
    light.layers.enable(LAYER.MAIN);
    GlobalScene.add(light);

    const hemiLight = new HemisphereLight(
      'white', // bright sky color
      'darkslategrey', // dim ground color
      0.3 // intensity
    );
    hemiLight.layers.enable(LAYER.LOOK);
    hemiLight.layers.enable(LAYER.MAIN);
    GlobalScene.add(hemiLight);

    function trackFromLatLonCSV(
      id,
      csvID,
      latIndex,
      lonIndex,
      altIndex,
      viaMidpoints
    ) {
      const points = [];
      const csv = FileManager.get(csvID);

      // try just recording when Lat or Lon changes
      const Keys = [];

      let lastLat = -99999999;
      let lastLon = -99999999;
      let A;
      let B;
      let C;
      let rowA;
      let rowB;
      let rowC;
      let lastAngle = -9999;
      for (let row = 0; row < csv.length; row++) {
        const lat = Number.parseFloat(csv[row][latIndex]);
        const lon = Number.parseFloat(csv[row][lonIndex]);
        const alt =
          altIndex >= 0
            ? f2m(Number.parseFloat(csv[row][altIndex]))
            : -altIndex;
        if (lat !== lastLat || lon !== lastLon) {
          const pos = LLAToEUS(lat, lon, alt);

          if (viaMidpoints) {
            if (A === undefined) {
              A = pos.clone();
              rowA = row;
              Keys.push([rowA, A.x, A.y, A.z]);
            } else if (B === undefined) {
              B = pos.clone();
              rowB = row;
              lastAngle = Math.atan2(B.z - A.z, B.x - A.x);
            } else {
              // Now A-B is a straight line at "lastAngle"
              // Get a new point C
              C = pos.clone();
              rowC = row;
              const thisAngle = Math.atan2(C.z - B.z, C.x - B.x);
              if (Math.abs(thisAngle - lastAngle) > 0.0001) {
                DebugSphere(`turnpoint${row}`, B, 1);
                // A->C is at a different angle to A->B
                // so push the midpoint of the last segment A->B
                Keys.push([
                  Math.floor((rowA + rowB) / 2),
                  (A.x + B.x) / 2,
                  (A.y + B.y) / 2,
                  (A.z + B.z) / 2,
                ]);
                // and B->C becomes the new segment we are looking at
                A = B;
                rowA = rowB;
                B = C;
                rowB = rowC;
                lastAngle = thisAngle;
              } else {
                // otherwise extend B to C
                B = C;
                rowB = rowC;
              }
            }
          } else {
            Keys.push([row, pos.x, pos.y, pos.z]);
          }

          lastLat = lat;
          lastLon = lon;
        }
      }

      // do the final A->B segment midpoint and then final segment to B
      if (viaMidpoints) {
        Keys.push([
          Math.floor((rowA + rowB) / 2),
          (A.x + B.x) / 2,
          (A.y + B.y) / 2,
          (A.z + B.z) / 2,
        ]);
        Keys.push([rowB, B.x, B.y, B.z]);
      }

      // now we've got a sparse set of points, so we can do a curve fit on each X,Y,Z

      // this is a simple linear interpolation
      const xExp = ExpandKeyframes(Keys, csv.length, 0, 1);
      const yExp = ExpandKeyframes(Keys, csv.length, 0, 2);
      const zExp = ExpandKeyframes(Keys, csv.length, 0, 3);

      for (row = 0; row < csv.length; row++) {
        points.push({ position: V3(xExp[row], yExp[row], zExp[row]) });
      }

      const track = new CNodeArray({
        id: id,
        array: points,
      });

      return track;
    }

    trackFromLatLonCSV('jetTrackOLD', 'aguaCSV', 53, 54, 36, false);
    trackFromLatLonCSV('jetTrack', 'aguaCSV', 53, 54, 36, true);

    // The moving average smoothed jet track
    new CNodeSmoothedPositionTrack({
      id: 'jetTrackAverage',
      source: 'jetTrack',
      window: new CNodeGUIValue(
        {
          value: 200,
          start: 1,
          end: 500,
          step: 1,
          desc: 'Camera Smooth Window',
        },
        gui
      ),
      iterations: new CNodeGUIValue(
        {
          value: 6,
          start: 1,
          end: 100,
          step: 1,
          desc: 'Camera Smooth Iterations',
        },
        gui
      ),
    });

    new CNodeSmoothedPositionTrack({
      id: 'jetTrackSpline',
      source: 'jetTrack',
      // new spline based smoothing in 3D
      method: 'catmull',
      //            method:"chordal",
      //            intervals: new CNodeGUIValue({value: 119, start:1, end:200, step:1, desc:"Catmull Intervals"},gui),
      intervals: new CNodeGUIValue(
        { value: 20, start: 1, end: 200, step: 1, desc: 'Catmull Intervals' },
        gui
      ),
      tension: new CNodeGUIValue(
        { value: 0.5, start: 0, end: 5, step: 0.001, desc: 'Catmull Tension' },
        gui
      ),
    });

    //        new CNodeTransferSpeed({
    new CNodeTrackClosest({
      id: 'jetTrackSmooth',
      from: 'jetTrackAverage', // node with good speed
      to: 'jetTrackSpline',
    });

    // GREY display the original jet track, so we can see if we are going along it.
    new CNodeDisplayTrack({
      id: 'jetTrackDisplay',
      track: 'jetTrack',
      color: [0.5, 0.5, 0.5],
      width: 0.5,
      autoSphere: 10,
    });

    // PINK old track
    new CNodeDisplayTrack({
      id: 'jetTrackDisplayOLD',
      track: 'jetTrackOLD',
      color: [1, 0.5, 0.5],
      width: 0.5,
      autoSphere: 10,
    });

    // MAGNETA Jet track spline
    new CNodeDisplayTrack({
      id: 'jetTrackDisplaySpline',
      track: 'jetTrackSpline',
      color: [0.8, 0, 0.8],
      width: 0.5,
      autoSphere: 10,
    });

    // YELLOW = smoothed average, the good velocity, bad position
    // this will appear closer to the middle of the circle
    new CNodeDisplayTrack({
      id: 'jetTrackDisplayAverage',
      track: 'jetTrackAverage',
      color: [1, 1, 0],
      width: 0.5,
      autoSphere: 10,
    });

    // CYAN smothed one, this is the one that is used
    new CNodeDisplayTrack({
      id: 'jetTrackSmoothDisplay',
      track: 'jetTrackSmooth',
      color: [0, 1, 1],
      width: 1,
      autoSphere: 10,
    });

    // debug short line  from final jet track to smoothed moving average
    new CNodeDisplayTrackToTrack({
      id: 'jetTrackToTrackDisplay',
      cameraTrack: 'jetTrackSmooth',
      targetTrack: 'jetTrackAverage',
      color: [1, 1, 0],
      width: 2,
    });

    // This is the track extracted from the ground gps coordinates
    trackFromLatLonCSV('targetTrack', 'aguaCSV', 55, 56, 37);

    new CNodeSmoothedPositionTrack({
      id: 'targetTrackSmooth',
      source: 'targetTrack',
      window: new CNodeGUIValue(
        { value: 1, start: 1, end: 1000, step: 1, desc: 'Target Smooth Value' },
        gui
      ),
    });

    // We maded a raised version just for display
    new CNodeMunge({
      id: 'targetTrackSmoothRaised',
      inputs: { p: 'targetTrackSmooth' },
      munge: function (f) {
        const v2 = this.in.p.p(f);
        v2.y += 1;
        return { position: v2 };
      },
    });
    /*

            // the jaggeg green target track
        new CNodeDisplayTrack({
            id: "targetTrackSmoothRaisedDisplay",
            track: "targetTrackSmoothRaised",
            color: [0,1,0],
            width: 3,

        })


        new CNodeConstant({id:"greenBallSize", value: 10})

        // and the tracking sphere, so we can see where we are on it.
        new CNodeDisplayTargetSphere({
            inputs: {
                track: "targetTrackSmoothRaised",
                size: "greenBallSize"
            },
            color:"green",
            layers:LAYER.MASK_LOOK,
        })
*/

    ////////////////////////////////////////////////////
    // GROUND SPLINE

    const groundSpline = new CNodeSplineEditor({
      id: 'groundSplineEditor',
      //            type:"linear",   // linear or catmull
      type: 'chordal', // chordal give smoother velocities
      //            type:"catmull",   // linear or catmull
      scene: GlobalScene,
      camera: 'mainCamera',
      view: view,
      frames: this.frames,
      terrainClamp: 'TerrainModel',

      initialPoints: [
        [0, -3992.6832962847534, 54.240166597156474, -936.7143765744662],
        [121, -4085.779853188493, 57.3768019672691, -593.0625743134807],
        [217, -4008.3836162844273, 62.76113157850568, -346.82992165803],
        [260, -3929.321833314552, 62.99427365949134, -234.89159129009815],
        [311, -3811.3661116017615, 68.3558551151952, -123.74892563218646],
        [379, -3719.3681560974146, 67.13470238311959, 42.838825981107675],
        [508, -3615.4143452293993, 69.2858275626835, 351.2079862156397],
        [726, -3301.652397315778, 74.26853337741937, 778.5051816829268],
        [795, -3255.3684224656, 68.395424153313, 983.2571617487611],
        [834, -3209.6717611217177, 68.39391004846584, 1089.7537114112934],
        [884, -3114.640131018243, 68.47612948320528, 1185.3144332382471],
        [977, -2887.4254219434333, 69.30607577679007, 1297.6573156960176],
        [1026, -2766.6526110015097, 70.2362748520825, 1343.328317744967],
        [1165, -2386.5909276906705, 71.44976562904219, 1371.2336436675687],
        [1270, -2077.5114288744307, 71.5636588354804, 1230.9657517355045],
        [1394, -1749.2405405188624, 68.90343700110463, 1076.394353285341],
        [1463, -1585.2865542707557, 66.58623561071647, 986.3851777071893],
        [1535, -1464.6310309531798, 69.65710513236236, 875.9638045538802],
        [1586, -1356.0360475491066, 65.99150286912314, 761.079737874178],
        [1832, -945.3606112038492, 64.9415294383395, 387.3621256115197],
        [1919, -833.0290957400833, 64.1538225407275, 241.7191251833794],
        [2052, -824.0731501377663, 63.86156588618098, 13.96353989101297],
        [2242, -819.233764656944, 62.165405017098124, -296.9754808440895],
        [2448, -931.1141512756062, 62.03488721865267, -579.3529427867294],
        [2652, -1006.7504225460079, 59.298550163745176, -829.1667504413313],
        [2869, -1094.5121577582822, 58.5783630677725, -1062.3076884569446],
        [3132, -1223.5058952597767, 52.368312611194824, -1294.518869692987],
        [3400, -1111.1682952527538, 12.935655717159449, -1919.3218245121534],
        [4006, -1948.7769243009368, 9.222843338145907, -2097.7278326645],
        [4814, -2470.514812363919, 9.80746566752767, -2170.9115624435426],
        [5138, -2770.8895268933074, 7.797896137588609, -2097.8288016551023],
        [5547, -2883.8625807533995, 7.031833843983904, -1968.759967606718],
        [7027, -3272.3626952821455, 58.271959977526684, -1685.8429173665213],
      ],
    });

    // CYAN track = Ground Spline Editor results
    new CNodeDisplayTrack({
      id: 'groundSplineEditorDisplay',
      track: 'groundSplineEditor',
      color: [0, 1, 1],
      width: 3,
    });

    ////////////////////////////////////////////////////
    // UAP SPLINE (similar ot ground spline)

    const uapSpline = new CNodeSplineEditor({
      id: 'uapSplineEditor',
      //            type:"linear",   // linear or catmull
      type: 'chordal', // chordal give smoother velocities
      //            type:"catmull",   // linear or catmull
      scene: GlobalScene,
      camera: 'mainCamera',
      view: view,
      frames: this.frames,
      terrainClamp: 'TerrainModel',

      snapCamera: 'jetTrackSmooth',
      snapTarget: 'groundSplineEditor',

      initialPoints: [
        [0, -4269.432647523577, 27.735346321459588, -943.2859957415844],
        [121, -4098.524352806263, 56.166672105602515, -591.6682455140204],
        [177, -4009.193148586517, 65.06708506115234, -453.5674314448146],
        [217, -3911.9400691693277, 72.0609427697371, -367.54812461792517],
        [260, -3831.266429408586, 72.64966487114629, -261.0305482002277],
        [311, -3727.7586341720616, 76.77274723184865, -151.22388339966074],
        [379, -3648.201322513861, 74.58219783057058, 13.175839932328472],
        [508, -3519.759738200348, 79.96627629057508, 294.30936477188925],
        [726, -3285.2821810695814, 76.46094974768317, 762.3220920185586],
        [795, -3200.504293685807, 76.28224417130463, 919.7215303699036],
        [834, -3142.640614212834, 78.44451965922264, 1004.6325184516722],
        [884, -3056.565791517746, 77.83002723082552, 1101.9709872331382],
        [977, -2847.6918833389, 76.98829966379816, 1224.2734387086066],
        [1026, -2724.1170402953267, 79.53063449861293, 1252.0714897156304],
        [1165, -2350.309217001224, 85.26361378693645, 1233.7242817962679],
        [1270, -2068.3130821511986, 80.17013153814679, 1150.045244926444],
        [1394, -1754.157230677626, 76.62043930926654, 1009.9455965235156],
        [1463, -1595.2517159934987, 73.18652357751756, 932.6574123377886],
        [1535, -1493.4049627692318, 82.1354209519771, 780.0603619172184],
        [1586, -1374.0446721459625, 72.26266124062664, 716.0808527301342],
        [1832, -972.3090274779534, 70.17060218991662, 360.19130413939683],
        [1919, -866.1089402196999, 69.89621158435011, 216.34154391470088],
        [2052, -869.9915132563156, 71.19715961232328, -9.646794990527042],
        [2242, -867.6180065993926, 69.39072440873326, -308.0212495539216],
        [2448, -963.7694027781008, 66.89770486129612, -578.7741368445865],
        [2652, -1047.4166180223292, 65.53761719181205, -819.4661180739495],
        [2869, -1153.9077618648425, 68.05469708837677, -1034.7227557735027],
        [3132, -1159.2338506915894, 41.502008076815514, -1342.8132627441603],
        [3400, -1381.1553901741463, 62.39299295181047, -1611.8616095765733],
        [4006, -1937.0551575992436, 5.0730287968394805, -2132.7702225750336],
        [4814, -2470.1723222365918, 4.58551156796932, -2217.067358809337],
        [5138, -2766.4767501173274, 13.432150906826564, -2047.0243572620157],
        [5547, -2877.3050341916987, 11.357346703847043, -1928.673849390152],
        [6216, -3033.885779999398, 32.129160288009416, -1761.2777408573274],
        [7027, -3240.3378067337408, 66.94459674428163, -1593.511999832821],
      ],
    });

    // We want this UAP spline to snap to the LOS we have determined
    // which in this case is the jetTrackSmooth and the ground Spline
    // This limits the motion of the spline control points
    // to slide along the LOS between snapCamera and snapTarget.
    //      uapSpline.splineEditor.snapCamera = NodeMan.get("jetTrackSmooth")
    //      uapSpline.splineEditor.snapTarget = NodeMan.get("groundSplineEditor")

    //  uapSpline.adjustUp(f2m(30), NodeMan.get("jetTrackSmooth") )

    // RED track = UAP (craft close to the ground) Spline Editor results
    const uapSplineDisplay = new CNodeDisplayTrack({
      id: 'uapSplineEditorDisplay',
      track: 'uapSplineEditor',
      color: [1, 0, 0],
      width: 3,
    });

    ////////////////////////////////////////////////////////////////
    // Lantern Spline

    const lanternSpline = new CNodeSplineEditor({
      id: 'lanternSplineEditor',
      //            type:"linear",   // linear or catmull
      type: 'chordal', // linear or catmull
      scene: GlobalScene,
      camera: 'mainCamera',
      view: view,
      frames: this.frames,
      terrainClamp: 'TerrainModel',
      snapCamera: 'jetTrackSmooth',
      snapTarget: 'groundSplineEditor',

      initialPoints: [
        // after started snapping
        [0, -1540.104112722002, 289.1284154088012, -878.4760598469685],
        [758, -1722.581070496704, 286.8775459504393, -784.5117550469276],
        [1395, -1880.5278091250602, 274.54243782954336, -694.4570637322081],
        [2026, -2035.1904642583227, 260.10662606020986, -618.5304945755404],
        [2641, -2181.6493075029784, 239.95944862149514, -548.3261933146102],
        [3217, -2316.788550722986, 236.57954930580627, -530.813671861566],
        [4125, -2470.8030093413663, 172.9487269297863, -465.4587710296146],
        [5047, -2586.1739891343464, 219.60065297361075, -424.0118346305708],
        [5385, -2617.9915402515235, 201.38689868710958, -394.18313717044475],
        [7027, -2828.7302583398914, 213.99156069947935, -275.35723284652886],
      ],
    });

    // SNAPPING! the lantern spline assumes the ground spline is correct
    // it's snapped to the ground spline LOS
    // so adjusting the ground spline will adjust the Lantern spline

    // YELLOW track = Lantern Spline Editor results
    const lanternSplineDisplay = new CNodeDisplayTrack({
      id: 'lanternSplineEditorDisplay',
      track: 'lanternSplineEditor',
      color: [1, 1, 0],
      width: 3,
    });

    // MAGENTA debug line from final jet track to ground spline
    // This will differ from other spline transits
    // mostly due to different spacing on nodes, and how we are not really going along the spline smoothly
    // a big TODO here is to fix this
    // new CNodeDisplayTrackToTrack({
    //     cameraTrack: "jetTrackSmooth",
    //     targetTrack: "groundSplineEditor",
    //     color: [1,0,1],
    //     width: 2,
    //
    // })

    // The in-air target track that we use to intersect with the ground
    new CNodeSwitch(
      {
        id: 'LOSTargetTrack',
        inputs: {
          'Ground Path Editor': 'groundSplineEditor',
          'Camera Ground Track': 'targetTrackSmooth',
        },
        desc: 'LOS Target Track',
      },
      gui
    );

    new CNodeLOSTrackTarget({
      id: 'JetLOS',
      cameraTrack: 'jetTrackSmooth',
      targetTrack: 'LOSTargetTrack',
    });

    /*
        SO, (New) we are either editing a ground track to get a traversable set up LOS to get the air track
        OR, (Old) we are editing an air track (linear) to get a ground track.
        OR MAYBE, a blend of the above.
*/

    new CNodeWind(
      {
        id: 'targetWind',
        from: 270,
        knots: 0,
        name: 'Target',
        arrowColor: 'cyan',
      },
      guiTweaks
    );

    // zero wind for traversing
    // NOTE, this is not used, and needs setting up so that there's
    // a zero velocity for the balloon, and this wind variable
    // is used to solve the path based on LOS.
    new CNodeWind(
      {
        id: 'localWind',
        from: 70,
        knots: 0,
        name: 'Local',
        arrowColor: 'cyan',
      },
      guiTweaks
    );

    new CNodeHeading(
      {
        id: 'initialHeading',
        heading: 0,
        name: 'Initial',
        arrowColor: 'green',
        // this is just for where we display the wind vector
        jetOrigin: 'jetTrackSmooth',
      },
      guiTweaks
    );

    new CNodeGUIValue(
      {
        id: 'preferredHeading',
        value: -132,
        start: -180,
        end: 180,
        step: 0.01,
        desc: 'Tgt Preferred Heading',
      },
      gui
    );

    CreateTraverseNodes();

    MakeTraverseNodesMenu('LOSTraverseSelect', {
      'Lantern Spline Editor': 'lanternSplineEditor',
      'UAP Spline Editor': 'uapSplineEditor',
      'Ground Spline Editor': 'groundSplineEditor',
      'Constant Speed': 'LOSTraverseConstantSpeed',
      'Constant Altitude': 'LOSTraverseConstantAltitude',
      'Straight Line': 'LOSTraverseStraightLine',
    });

    // THE FINAL TRAVERSAL, SMOOTHED
    new CNodeSmoothedPositionTrack({
      id: 'LOSTraverseSelectSmoothed',

      source: 'LOSTraverseSelect',
      //            source: "lanternSplineEditor",  // PATCH!!!!

      window: new CNodeGUIValue(
        {
          value: 0,
          start: 1,
          end: 500,
          step: 1,
          desc: 'Traverse Smooth Window',
        },
        gui
      ),
      copyData: true,
    });

    // this just display the animating LOS between two tracks
    // here we draw from the plane to the target in WHITE.
    new CNodeDisplayTrackToTrack({
      id: 'DisplayLOS1',
      cameraTrack: 'jetTrackSmooth',
      targetTrack: 'LOSTraverseSelectSmoothed',
      color: [1, 1, 1],
      width: 2,
      extensioncolor: [0, 1, 0],
    });

    /*
        // the second half the the line is drawn in green
        // TODO: need a new second half calculating with smoothed value
        new CNodeDisplayTrackToTrack({
            id: "DisplayLOS2",
            cameraTrack: "LOSTraverseSelectSmoothed",
            targetTrack: "LOSTargetTrack",  // this was terrain track, should be a camera ground track
            color: [0,1,0],
            width: 2,

        })
*/

    new CNodeScale(
      'sizeScaled',
      scaleF2M,
      new CNodeGUIValue(
        {
          value: Sit.targetSize,
          start: 1,
          end: 2000,
          step: 0.1,
          desc: 'Target size ft',
        },
        gui
      )
    );

    new CNodeDisplayTargetSphere({
      id: 'TargetSphereLantern',
      inputs: {
        //track: "lanternSplineEditor",
        track: 'LOSTraverseSelect',
        size: 'sizeScaled',
      },
      color: 'white',
      layers: LAYER.MASK_LOOK,
    });

    addControllerTo('lookCamera', 'TrackToTrack', {
      sourceTrack: 'jetTrackSmooth',
      targetTrack: 'LOSTraverseSelectSmoothed',
    });

    // The lines of sight with smoothed traversal points
    const JetLOSDisplayNode = new CNodeDisplayLOS({
      id: 'JetLOSDisplayNode',
      LOS: 'JetLOS',
      traverse: 'LOSTraverseSelectSmoothed',
      container: GlobalScene,
      color: '#0000ff',
      width: 1,
      spacing: 60,

      // SCU lines
      highlightLines: {
        16: makeMatLine(0x993838, 5), // 01:22:08 RED
        200: makeMatLine(0xae9561, 5), // 01:22:14 ORANGE
        379: makeMatLine(0xd3cb94, 5), // 01:22:20 YELLOW
      }, // 34 sec PT5 green
    });

    // thick GREEN target/traverse track (i.e. the track used by the object)
    new CNodeDisplayTrack({
      id: 'TraversePathDisplay',
      track: 'LOSTraverseSelectSmoothed',
      color: [0.3, 1, 0.3],
      width: 4,
      depthFunc: AlwaysDepth,
    });

    AddSpeedGraph(
      'LOSTraverseSelectSmoothed',
      'Target',
      0,
      200,
      0,
      0,
      0.625,
      0.3
    );
    //     AddSpeedGraph("jetTrackSmooth","Plane", 150, 240, 0,0.15,0.6250,0.15)
    //     AddSpeedGraph("groundSplineEditor", "Ground", 0, 300,0,0.30,0.6250,0.15)

    const lookCamera = NodeMan.get('lookCamera').camera;
    // FOV in Three.js is vertical, which was not an issue with the square videos
    // but you need to be aware of it in things like thi
    gui
      .add(Sit, 'lookFOV', 0.1, 10, 0.01)
      .onChange((value) => {
        lookCamera.fov = value;
        lookCamera.updateProjectionMatrix();
        par.renderOne = true;
      })
      .listen()
      .name('Look Cam FOV');

    toggler(
      'g',
      gui
        .add(par, 'showGraphs')
        .listen()
        .name('[G]raphs')
        .onChange((value) =>
          ViewMan.iterateTest(
            (x) => {
              return x.constructor.name === 'CNodeCurveEditorView';
            },
            (k, x) => {
              x.setVisible(value);
            }
          )
        )
    );

    showHider(JetLOSDisplayNode, '[L]OS', true, 'l');
    showHider(lanternSplineDisplay, 'Lantern [S]pline', true, 's');
    showHider(uapSplineDisplay, 'UA[P] Spline', true, 'p');
  },
};
