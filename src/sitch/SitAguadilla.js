import {
    CNodeMovablePoint, CNodePositionLLA, makePositionLLA, trackHeading
} from "../nodes/CNode";

import {CNodeTerrain} from "../nodes/CNodeTerrain";
import {CNodeView3D} from "../nodes/CNodeView3D";
import {par} from "../par";
import {gui, guiShowHide, NodeMan, setMainCamera, Sit} from "../Globals";
import {
    PerspectiveCamera,
    Color,
    Vector3,
    DirectionalLight,
    HemisphereLight,
    AlwaysDepth
} from "../../three.js/build/three.module";
import {ExpandKeyframes, f2m, m2f, metersFromMiles, radians, scaleF2M} from "../utils";
import {ViewMan} from "../nodes/CNodeView";
import {assert} from "../utils"
import {LLAToEUS, wgs84} from "../LLA-ECEF-ENU";
import {FileManager} from "../CManager";
import * as THREE from "../../three.js/build/three.module";
import {CNodeSplineEditor} from "../nodes/CNodeSplineEdit";
import * as LAYER from "../LayerMasks.js"
import {CNodeVideoWebCodecView} from "../nodes/CNodeVideoWebCodec";
import {CNodeConstant} from "../nodes/CNode";
import {CNodeSwitch} from "../nodes/CNodeSwitch";
import {
    CNodeArray,
    CNodeSmoothedArray
} from "../nodes/CNodeArray";
import {CNodeGUIValue} from "../nodes/CNodeGUIValue";
import {CNodeDerivative, CNodeMunge, CNodeRegression, makeMunge} from "../nodes/CNodeMunge";
import {CNodeDisplayTrackToTrack} from "../nodes/CNodeDisplayTrackToTrack";
import {CNodeDisplayTrack} from "../nodes/CNodeDisplayTrack";
import {CNodeDisplayTargetSphere} from "../nodes/CNodeDisplayTargetSphere";
import {CNodeLOSTrackTarget} from "../nodes/CNodeLOSTrackTarget";
import {CNodeLOSTraverseTerrain} from "../nodes/CNodeLOSTraverseTerrain";
import {CNodeScale} from "../nodes/CNodeScale";
import {CNodeWind} from "../nodes/CNodeWind";
import {CNodeHeading} from "../nodes/CNodeHeading";
import {AddGenericNodeGraph, AddSpeedGraph} from "../JetGraphs";
import {guiTweaks} from "../Globals";
import {GlobalScene, LocalFrame} from "../LocalFrame";
import {SetupGUIFrames} from "../JetGUI";
import {initKeyboard, showHider, toggler} from "../KeyBoardHandler";
import {CreateTraverseNodes, MakeTraverseNodesMenu, SetupTraverseNodes} from "../JetStuff";
import {DebugSphere, MV3, V3} from "../threeExt";
import {mainCamera} from "../Globals";
import {NARCamera, setNARCamera} from "../JetCameras";
import {CNodeLOSTraverseConstantSpeed} from "../nodes/CNodeLOSTraverseConstantSpeed";
import {CNodeDisplayLOS} from "../nodes/CNodeDisplayLOS";
import {CNodeSmoothedPositionTrack, CNodeTrackClosest, CNodeTransferSpeed} from "../nodes/CNodeTrack";
import {makeMatLine} from "../MatLines";
import {CNodeCamera, CNodeCameraTrackToTrack} from "../nodes/CNodeCamera";

export const SitAguadilla = {
    name: "agua",
    menuName: "Aguadilla",

    azSlider:false,
    jetStuff:false,
    animated:true,


    fps: 29.97,
    frames: 7028,  // note, old CSV was 7027, so duplicated the last line to match the video at 7028
    aFrame: 0,
    bFrame: 6000,

    lookFOV: 1,

    LOSSpacing:30*2,


    startCameraPosition: [-9851.407079455104,2847.1976940099407,-2584.264310831998],
    startCameraTarget: [-8986.013511122388,2586.5050262571704,-2156.3235382146754],


    startDistance: 1.612,
    startDistanceMax: 3.5,
    startDistanceMin: 0.1,

    targetSize: 2,

    targetSpeed: 16.555,
    targetSpeedMin: 0,
    targetSpeedMax: 100,
    targetSpeedStep: 0.001,

    // Near and far clipping distances for the main 3D view
    farClip: 500000,
    nearClip: 1,

    // Near and far clipping distances for the NAR view (the plane camera view)
    farClipNAR: 800000,
    nearClipNAR: 1,


    files: {
        // one big file with all the data in it.
//        aguaCSV: "./agua-frames-data.csv.zip"
        aguaCSV: "agua/agua-frames-data.csv"
    },

    videoFile: "../sitrec-videos/public/Aquadilla High Quality Original.mp4",


    // Aguadilla terrain location. 8x8 tiles at zooom level 15
    // there's no file for terrain, it all comes from the server
    // based purely on the lat/lon
    terrain: {lat:  18.499617, lon: -67.113636, zoom:15, nTiles:8},


    setup: function() {

        assert(GlobalScene !== undefined,"Missing GlobalScene")

        new CNodeCamera({
            id:"mainCamera",
            fov: this.mainFOV,
            aspect: window.innerWidth / window.innerHeight,
            near: this.nearClip,
            far: this.farClip,
            layers: LAYER.MASK_HELPERS,

            startPos: this.startCameraPosition,
            lookAt: this.startCameraTarget,

        })
        // eventually remove all setMainCamera stuff
        setMainCamera(NodeMan.get("mainCamera").camera)




        // gui controls for frame number/time
        SetupGUIFrames()


        // Flag for camera to follow the jet
        gui.add(par, 'lockCameraToJet').listen().name("Lock Camera to Plane");

        // adjusing the main FOV, not really used now it's set well.
        gui.add(par, 'mainFOV', 0.35, 80, 0.01).onChange(value => {
            mainCamera.fov = value
            mainCamera.updateProjectionMatrix()
        }).listen().name("Main FOV")


        // need to use constant WGS84 to match terrain, NOT the 7/6 version
        new CNodeConstant({id:"radiusMiles", value: wgs84.radiusMiles})

        new CNodeTerrain({
            id: "TerrainModel",
            radiusMiles: "radiusMiles", // constant
            //terrain:this.terrain,
            lat: this.terrain.lat,
            lon: this.terrain.lon,
            zoom: this.terrain.zoom,
            nTiles: this.terrain.nTiles
        }, mainCamera)

// TODO: UNUSED, as is CNodeMovablePoint
        new CNodeMovablePoint({
            id:"startPoint",
            position:makePositionLLA(0,0,0),
        })

        const view = new CNodeView3D({
            id:"mainView",
            left:0.0, top:0, width:1,height:1,
            fov: 50,
            background: new Color().setRGB(0.0, 0.3, 0.0),
            showCursor: true,
            camera:mainCamera,

            focusTracks:{
                "Ground (No Track)": "default",
                "Jet track": "jetTrack",
                "Jet Track Smooth": "jetTrackSmooth",
                //"Target Track": "targetTrack",
                "Target Track Smooth": "targetTrackSmoothRaised",
                "Ground Splint Editor": "groundSplineEditor",
                "Traverse Path (UFO)": "LOSTraverseSelectSmoothed"
            },

            renderFunction: function() {

                var csv = FileManager.get("aguaCSV")
                var narFOV = parseFloat(csv[par.frame][15])
                narFOV = 4 * 135/narFOV
                NARCamera.fov = narFOV
                NARCamera.updateProjectionMatrix()

                if (par.lockCameraToJet) {
                    const f = par.frame
                    const track = NodeMan.get("jetTrackSmooth")

                    var pos = track.p(f)
                    const heading = trackHeading(track,f)

                    if (this.lastPlanePos === undefined) {
                        this.lastPlanePos = pos
                        this.lastHeading = heading
                    }

                    var headingChange = heading - this.lastHeading;
                    if (headingChange < -180) headingChange += 360;

                    var offset = pos.clone().sub(this.lastPlanePos)
                    this.lastPlanePos = pos;
                    this.lastHeading = heading;
                    mainCamera.position.add(offset)

                    // rotate camera about the jet position
                    mainCamera.position.sub(pos)
                    mainCamera.position.applyAxisAngle(V3(0,1,0), -radians(headingChange))
                    mainCamera.position.add(pos)

                    mainCamera.rotateOnAxis(V3(0,1,0), -radians(headingChange))

                    mainCamera.updateMatrix()
                    mainCamera.updateMatrixWorld()
                }

                // composer is used for effects.
                this.composer.render();
            },

        })
        view.addOrbitControls(this.renderer);


        // Lighting
        var light = new DirectionalLight(0xffffff, 0.8);
        light.position.set(100,1300,100);
        light.layers.enable(LAYER.NAR)
        GlobalScene.add(light);


        const hemiLight = new HemisphereLight(
            'white', // bright sky color
            'darkslategrey', // dim ground color
            0.3, // intensity
        );
        hemiLight.layers.enable(LAYER.NAR)
        GlobalScene.add(hemiLight);


       function trackFromLatLonCSV(id, csvID, latIndex, lonIndex, altIndex, viaMidpoints){
           var points = []
           var csv = FileManager.get(csvID)

           /*

           for (var row=0;row<csv.length;row++) {
               var lat = parseFloat(csv[row][latIndex])
               var lon = parseFloat(csv[row][lonIndex])
               var alt = altIndex >= 0 ? f2m(parseFloat(csv[row][altIndex])) : -altIndex;
//               console.log("LLA = "+lat+","+lon+","+alt)
               var pos = LLAToEUS(lat, lon, alt)
//               console.log("EUS = "+pos.x+","+pos.y+","+pos.z)
               points.push({position:pos})
           }
            */

           // try just recording when Lat or Lon changes
           var Keys = []

           var lastLat = -99999999
           var lastLon = -99999999
           var A,B,C;
           var rowA, rowB, rowC
           var lastAngle = -9999
           for (var row=0;row<csv.length;row++) {
               var lat = parseFloat(csv[row][latIndex])
               var lon = parseFloat(csv[row][lonIndex])
               var alt = altIndex >= 0 ? f2m(parseFloat(csv[row][altIndex])) : -altIndex;
               if (lat !== lastLat || lon !== lastLon) {
                   var pos = LLAToEUS(lat, lon, alt)

                   if (viaMidpoints) {
                       if (A === undefined) {
                           A = pos.clone();
                           rowA = row;
                           Keys.push([rowA, A.x, A.y,A.z])

                       } else if (B === undefined) {
                           B = pos.clone();
                           rowB = row;
                           lastAngle = Math.atan2(B.z - A.z, B.x - A.x)
                       } else {
                           // Now A-B is a straight line at "lastAngle"
                           // Get a new point C
                           C = pos.clone()
                           rowC = row;
                           const thisAngle = Math.atan2(C.z - B.z, C.x - B.x)
                           if (Math.abs(thisAngle - lastAngle) > 0.0001) {
//                               console.log("Turn at: " + thisAngle, " delta = "+ Math.abs(thisAngle - lastAngle))
                               DebugSphere("turnpoint"+row,B, 1)
                               // A->C is at a different angle to A->B
                               // so push the midpoint of the last segment A->B
                               Keys.push([Math.floor((rowA+rowB)/2), (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2])
                               // and B->C becomes the new segment we are looking at
                               A = B;
                               rowA = rowB
                               B = C;
                               rowB = rowC
                               lastAngle = thisAngle
                           } else {
                               // otherwise extend B to C
                               B = C
                               rowB = rowC
//                               console.log("Straight at: " + thisAngle)
                           }
                       }
                   }
                   else {
                       Keys.push([row, pos.x, pos.y, pos.z])
                   }

                   lastLat = lat;
                   lastLon = lon;
               }
           }

           // do the final A->B segment midpoint and then final segment to B
           if (viaMidpoints) {
               Keys.push([Math.floor((rowA + rowB) / 2), (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2])
               Keys.push([rowB, B.x,B.y,B.z])
           }

           // now we've got a sparse set of points, so we can do a curve fit on each X,Y,Z


           // this is a simple linear interpolation
           var xExp = ExpandKeyframes(Keys,csv.length,0,1)
           var yExp = ExpandKeyframes(Keys,csv.length,0,2)
           var zExp = ExpandKeyframes(Keys,csv.length,0,3)



           for (row=0;row<csv.length;row++) {
               points.push({position: V3(xExp[row], yExp[row], zExp[row])});

//               DebugSphere(id+"detail"+row, V3(xExp[row], yExp[row], zExp[row]),1)


           }


           const track = new CNodeArray({
               id:id,
               array:points,
           })

           return track;
       }

        trackFromLatLonCSV("jetTrackOLD", "aguaCSV", 53,54,36, false)
        trackFromLatLonCSV("jetTrack", "aguaCSV", 53,54,36, true)


        // The moving average smoothed jet track
        new CNodeSmoothedPositionTrack({ id:"jetTrackAverage",
            source: "jetTrack",
            smooth: new CNodeGUIValue({value: 200, start:1, end:500, step:1, desc:"Camera Smooth Window"},gui),
            iterations: new CNodeGUIValue({value: 6, start:1, end:100, step:1, desc:"Camera Smooth Iterations"},gui),

        })


        new CNodeSmoothedPositionTrack({ id:"jetTrackSpline",
            source: "jetTrack",
            // new spline based smoothing in 3D
            method:"catmull",
//            method:"chordal",
//            intervals: new CNodeGUIValue({value: 119, start:1, end:200, step:1, desc:"Catmull Intervals"},gui),
            intervals: new CNodeGUIValue({value: 20, start:1, end:200, step:1, desc:"Catmull Intervals"},gui),
            tension: new CNodeGUIValue({value: 0.5, start:0, end:5, step:0.001, desc:"Catmull Tension"},gui),
        })

//        new CNodeTransferSpeed({
        new CNodeTrackClosest({
            id:"jetTrackSmooth",
            from:"jetTrackAverage", // node with good speed
            to:"jetTrackSpline"
        })


        // GREY display the original jet track, so we can see if we are going along it.
        new CNodeDisplayTrack({
            id: "jetTrackDisplay",
            track: "jetTrack",
            color: new CNodeConstant({value:new THREE.Color(0.5,0.5,0.5)}),
            width: 0.5,
            autoSphere: 10,
        })

        // PINK old track
        new CNodeDisplayTrack({
            id: "jetTrackDisplayOLD",
            track: "jetTrackOLD",
            color: new CNodeConstant({value:new THREE.Color(1,0.5,0.5)}),
            width: 0.5,
            autoSphere: 10,
        })

        // MAGNETA Jet track spline
        new CNodeDisplayTrack({
            id: "jetTrackDisplaySpline",
            track: "jetTrackSpline",
            color: new CNodeConstant({value:new THREE.Color(0.8,0,0.8)}),
            width: 0.5,
            autoSphere: 10,
        })


        // YELLOW = smoothed average, the good velocity, bad position
        // this will appear closer to the middle of the circle
        new CNodeDisplayTrack({
            id: "jetTrackDisplayAverage",
            track: "jetTrackAverage",
            color: new CNodeConstant({value:new THREE.Color(1,1,0)}),
            width: 0.5,
            autoSphere: 10,
        })


        // CYAN smothed one, this is the one that is used
        new CNodeDisplayTrack({
            id: "jetTrackSmoothDisplay",
            track: "jetTrackSmooth",
            color: new CNodeConstant({value:new THREE.Color(0,1,1)}),
            width: 1,
            autoSphere: 10,

        })

        // debug short line  from final jet track to smoothed moving average
        new CNodeDisplayTrackToTrack({
            cameraTrack: "jetTrackSmooth",
            targetTrack: "jetTrackAverage",
            color: new CNodeConstant({value:new THREE.Color(1,1,0)}),
            width: 2,

        })


        // This is the track extracted from the ground gps coordinates
        trackFromLatLonCSV("targetTrack", "aguaCSV", 55,56,37)

        new CNodeSmoothedPositionTrack({ id:"targetTrackSmooth",
            source: "targetTrack",
            smooth: new CNodeGUIValue({value: 1, start:1, end:1000, step:1, desc:"Target Smooth Value"},gui)
        })


        // We maded a raised version just for display
        new CNodeMunge( { id:"targetTrackSmoothRaised",
            inputs:{p:"targetTrackSmooth"},
            munge:function(f) {
                var v2 = this.in.p.p(f);
                v2.y+=1
                return {position:v2}
            }})
/*

            // the jaggeg green target track
        new CNodeDisplayTrack({
            id: "targetTrackSmoothRaisedDisplay",
            track: "targetTrackSmoothRaised",
            color: new CNodeConstant({value:new THREE.Color(0,1,0)}),
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
            layers:LAYER.MASK_NAR,
        })
*/


        ////////////////////////////////////////////////////
        // GROUND SPLINE

        const groundSpline = new CNodeSplineEditor({
            id:"groundSplineEditor",
//            type:"linear",   // linear or catmull
            type:"chordal",   // chordal give smoother velocities
//            type:"catmull",   // linear or catmull
            scene: GlobalScene,
            camera: mainCamera,
            renderer: view.renderer,
            controls: view.controls,
            frames:this.frames,
            terrainClamp: "TerrainModel",

            initialPoints:[
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
                [7027, -3272.3626952821455, 58.271959977526684, -1685.8429173665213]

            ]
        })


        // CYAN track = Ground Spline Editor results
        new CNodeDisplayTrack({
            id: "groundSplineEditorDisplay",
            track: "groundSplineEditor",
            color: new CNodeConstant({value:new THREE.Color(0,1,1)}),
            width: 3,
        })

        
        
        ////////////////////////////////////////////////////
        // UAP SPLINE (similar ot ground spline)

        const uapSpline = new CNodeSplineEditor({
            id:"uapSplineEditor",
//            type:"linear",   // linear or catmull
            type:"chordal",   // chordal give smoother velocities
//            type:"catmull",   // linear or catmull
            scene: GlobalScene,
            camera: mainCamera,
            renderer: view.renderer,
            controls: view.controls,
            frames:this.frames,
            terrainClamp: "TerrainModel",

            snapCamera:"jetTrackSmooth",
            snapTarget:"groundSplineEditor",

            initialPoints:[
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
                [7027, -3240.3378067337408, 66.94459674428163, -1593.511999832821]

            ]
        })

        // We want this UAP spline to snap to the LOS we have determined
        // which in this case is the jetTrackSmooth and the ground Spline
        // This limits the motion of the spline control points
        // to slide along the LOS between snapCamera and snapTarget.
  //      uapSpline.splineEditor.snapCamera = NodeMan.get("jetTrackSmooth")
  //      uapSpline.splineEditor.snapTarget = NodeMan.get("groundSplineEditor")



       //  uapSpline.adjustUp(f2m(30), NodeMan.get("jetTrackSmooth") )


        // RED track = UAP (craft close to the ground) Spline Editor results
        const uapSplineDisplay = new CNodeDisplayTrack({
            id: "uapSplineEditorDisplay",
            track: "uapSplineEditor",
            color: new CNodeConstant({value:new THREE.Color(1,0,0)}),
            width: 3,
        })


        ////////////////////////////////////////////////////////////////
        // Lantern Spline

        const lanternSpline = new CNodeSplineEditor({
            id:"lanternSplineEditor",
//            type:"linear",   // linear or catmull
            type:"chordal",   // linear or catmull
            scene: GlobalScene,
            camera: mainCamera,
            renderer: view.renderer,
            controls: view.controls,
            frames:this.frames,
            terrainClamp: "TerrainModel",
            snapCamera:"jetTrackSmooth",
            snapTarget:"groundSplineEditor",

            initialPoints:[
                // [0, -1540.4440997050026, 294.8168987977034, -887.0099242402622],
                // [758, -1728.390495663607, 289.6166496106155, -778.52307591189],
                // [1395, -1896.9833460064995, 273.68242706075586, -694.6407760695475],
                // [2026, -2054.3518487782785, 260.00251739099616, -613.6558076928167],
                // [2641, -2174.8998468605564, 241.00675333319202, -553.8784683365909],
                // [3217, -2288.070059858875, 231.02698803395714, -511.58150864840803],
                // [4125, -2466.1305989553534, 210.03763988002945, -457.7013191877041],
                // [4585, -2550.3748662995113, 199.39607547614946, -429.97454286552744],
                // [5047, -2634.67388768681, 189.40388088154356, -398.1184455525155],
                // [5385, -2686.0343328974327, 181.97780658325368, -383.98651098437887],
                // [7027, -2854.3745381807425, 172.58941221630107, -279.8009248303654]

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
                [7027, -2828.7302583398914, 213.99156069947935, -275.35723284652886]


            ]
        })

        // SNAPPING! the lantern spline assumes the ground spline is correct
        // it's snapped to the ground spline LOS
        // so adjusting the ground spline will adjust the Lantern spline

        // YELLOW track = Lantern Spline Editor results
        const lanternSplineDisplay = new CNodeDisplayTrack({
            id: "lanternSplineEditorDisplay",
            track: "lanternSplineEditor",
            color: new CNodeConstant({value:new THREE.Color(1,1,0)}),
            width: 3,
        })




        // MAGENTA debug line from final jet track to ground spline
        // This will differ from other spline transits
        // mostly due to different spacing on nodes, and how we are not really going along the spline smoothly
        // a big TODO here is to fix this
        // new CNodeDisplayTrackToTrack({
        //     cameraTrack: "jetTrackSmooth",
        //     targetTrack: "groundSplineEditor",
        //     color: new CNodeConstant({value:new THREE.Color(1,0,1)}),
        //     width: 2,
        //
        // })

// The in-air target track that we use to intersect with the ground
        new CNodeSwitch({id:"LOSTargetTrack",
            inputs: {
                'Ground Path Editor': "groundSplineEditor",
        //       'Path Editor (Balloon)': "lanternSplineEditor",
                'Camera Ground Track': "targetTrackSmooth",
            },
            desc: "LOS Target Track"

        }, gui)


        new CNodeLOSTrackTarget({id:"JetLOS",
            cameraTrack: "jetTrackSmooth",
//            targetTrack: "targetTrackSmooth"
//            targetTrack: "splineEditor"
            targetTrack: "LOSTargetTrack"
        })

        /*
        // a track where the LOS intersect the terrain
        new CNodeLOSTraverseTerrain({
            id: "terrainTrack",
            LOS: "JetLOS",
            terrain: "TerrainModel"
        })
*/

/*
        SO, (New) we are either editing a ground track to get a traversable set up LOS to get the air track
        OR, (Old) we are editing an air track (linear) to get a ground track.
        OR MAYBE, a blend of the above.
*/


        new CNodeWind({
            id: "targetWind",
            from: 270,
            knots: 0,
            name: "Target",
            arrowColor: "cyan"

        }, guiTweaks)

        // zero wind for traversing
        // NOTE, this is not used, and needs setting up so that there's
        // a zero velocity for the balloon, and this wind variable
        // is used to solve the path based on LOS.
        new CNodeWind({
            id: "localWind",
            from: 70,
            knots: 0,
            name: "Local",
            arrowColor: "cyan"

        }, guiTweaks)

        new CNodeHeading({
            id: "initialHeading",
            heading: 0,
            name: "Initial",
            arrowColor: "green"

        }, guiTweaks)


        new CNodeGUIValue({
            id: "preferredHeading",
            value: -132,
            start: -180,
            end: 180,
            step: 0.01,
            desc: "Tgt Preferred Heading"
        }, gui)

        CreateTraverseNodes();

        // new CNodeLOSTraverseConstantSpeed({
        //     id: "LOSTraverseConstantSpeedPreferredDirection",
        //     inputs: {
        //         LOS: "JetLOS",
        //         startDist: "startDistance",
        //         speed: "speedScaled",
        //
        //         wind: "localWind", // might want to use a different wind, but it's a small space, so maybe not
        //         preferredDirection:"preferredHeading" // pick solutions closest to this
        //     },
        // })


        MakeTraverseNodesMenu(  {
      //      "Const Spd (pref dir)": "LOSTraverseConstantSpeedPreferredDirection",
            "Lantern Spline Editor":"lanternSplineEditor",
            "UAP Spline Editor":"uapSplineEditor",
            "Ground Spline Editor":"groundSplineEditor",
            "Constant Speed": "LOSTraverseConstantSpeed",
            "Constant Altitude": "LOSTraverseConstantAltitude",
        //    "Constant Vc (closing vel)": "LOSTraverse1",
            "Straight Line": "LOSTraverseStraightLine",
        })




//        new CNodeFramesVideoView({id:"video",
        new CNodeVideoWebCodecView({id:"video",
                inputs: {
                    zoom: new CNodeGUIValue({
                        value: 100, start: 100, end: 1000, step: 1,
                        desc: "Video Zoom x"
                    }, guiTweaks)
                },
                visible: true,
                left: 0.6250, top: 0, width: -1.5, height: 0.5,
                draggable: true, resizable: true,
                frames: Sit.frames,
                file: Sit.videoFile,

            }
        )


// THE FINAL TRAVERSAL, SMOOTHED
        new CNodeSmoothedPositionTrack({ id:"LOSTraverseSelectSmoothed",

            source: "LOSTraverseSelect",
//            source: "lanternSplineEditor",  // PATCH!!!!

            smooth: new CNodeGUIValue({value: 0, start:1, end:500, step:1, desc:"Traverse Smooth"},gui),
            copyColor: true,
        })


        // this just display the animating LOS between two tracks
        // here we draw from the plane to the target in WHITE.
        new CNodeDisplayTrackToTrack({
            id: "DisplayLOS1",
            cameraTrack: "jetTrackSmooth",
            targetTrack: "LOSTraverseSelectSmoothed",
            color: new CNodeConstant({value:new THREE.Color(1,1,1)}),
            width: 2,
            extensionColor: new CNodeConstant({value:new THREE.Color(0,1,0)}),

        })


        /*
        // the second half the the line is drawn in green
        // TODO: need a new second half calculating with smoothed value
        new CNodeDisplayTrackToTrack({
            id: "DisplayLOS2",
            cameraTrack: "LOSTraverseSelectSmoothed",
            targetTrack: "LOSTargetTrack",  // this was terrain track, should be a camera ground track
            color: new CNodeConstant({value:new THREE.Color(0,1,0)}),
            width: 2,

        })
*/

        new CNodeScale("sizeScaled", scaleF2M,
            new CNodeGUIValue({value:Sit.targetSize,start:1,end:2000, step:0.1, desc:"Target size ft"},gui)
        )

        // // traverse sphere in white, currently coincidenct with ufo spline
        // new CNodeDisplayTargetSphere({
        //     inputs: {
        //         track: "LOSTraverseSelectSmoothed",
        //         size: "sizeScaled",
        //     },
        //
        //     layers:LAYER.MASK_NAR,
        // })



        new CNodeDisplayTargetSphere({
            inputs: {
                //track: "lanternSplineEditor",
                track: "LOSTraverseSelect",
                size: "sizeScaled",
            },
            color:"white",
            layers:LAYER.MASK_NAR,
        })


        // // debug show the ground track sphere
        // new CNodeDisplayTargetSphere({
        //     inputs: {
        //         track: "groundSplineEditor",
        //         size: "sizeScaled",
        //     },
        //     color:"white",
        //     layers:LAYER.MASK_NAR,
        // })


        new CNodeCameraTrackToTrack({
            id:"narCamera",
            fov: this.NARFOV,
            aspect: window.innerWidth / window.innerHeight,
            near: this.nearClipNAR,
            far: this.farClipNAR,
            layers: LAYER.MASK_NARONLY,
            cameraTrack: "jetTrackSmooth",
            targetTrack: "LOSTraverseSelectSmoothed",


        })
        setNARCamera(NodeMan.get("narCamera").camera)

        new CNodeView3D({
            id: "NARCam",
            visible: true,
            draggable: true, resizable: true,
            showCursor: false,
            showLOSArrow: true,

            left: 0.6250, top: 1 - 0.5, width: -1.5, height: 0.5,
//    background: new THREE.Color().setRGB( 0.0, 0.0, 0.0 ),
            background: new THREE.Color().setRGB(0.2, 0.2, 0.2),
           // cameraTrack: "jetTrackSmooth",
           // targetTrack: "LOSTraverseSelectSmoothed",
            radiusMiles: "radiusMiles", // constant

            camera:NARCamera,

            effects: {
                FLIRShader: {},
            }

        })




        // The lines of sight with smoothed traversal points
        var JetLOSDisplayNode = new CNodeDisplayLOS({
            LOS:"JetLOS",
            traverse:"LOSTraverseSelectSmoothed",
            container:GlobalScene,
            clipSeaLevel: true,
            color: 0x0000ff,
            width: 1,


            // SCU lines
            highlightLines: {
                16: makeMatLine(0x993838, 5),  // 01:22:08 RED
                200: makeMatLine(0xAE9561, 5), // 01:22:14 ORANGE
                379: makeMatLine(0xD3CB94, 5), // 01:22:20 YELLOW
            }, // 34 sec PT5 green

        })

        // thick GREEN target/traverse track (i.e. the track used by the object)
        new CNodeDisplayTrack({
            id: "TraversePathDisplay",
            track: "LOSTraverseSelectSmoothed",
            color: new CNodeConstant({value:new THREE.Color(0.3,1,0.3)}),
            width: 4,
            depthFunc:AlwaysDepth,

        })

        AddSpeedGraph("LOSTraverseSelectSmoothed","Target", 0, 200, 0,0,0.6250,0.30)
   //     AddSpeedGraph("jetTrackSmooth","Plane", 150, 240, 0,0.15,0.6250,0.15)
   //     AddSpeedGraph("groundSplineEditor", "Ground", 0, 300,0,0.30,0.6250,0.15)







        // AddGenericNodeGraph("Debug", "",[
        //     ["red", 1, "jetTrack","position","x"],
        //     ["green", 1, "jetTrackSmooth","position","x"],
        //
        // ],{})


        // shoudl stick this inside the View
        var viewNar = ViewMan.list.NARCam.data;
        var farClipNAR = metersFromMiles(500)

        // really not sure about teh FOV here. Remember it's vertical
        // and we will eventually be making it variable (we have the data)

        // need to use this one instead
        //
        // var NARCamera = new THREE.PerspectiveCamera( 675/135/10, window.innerWidth / window.innerHeight, 1, farClipNAR );
        // NARCamera.layers.disable(LAYER.main)
        // NARCamera.layers.enable(LAYER.NAR)
        // NARCamera.lookAt(new THREE.Vector3(0,0,-1));
        // viewNar.camera = NARCamera;

        gui.add(Sit, 'NARFOV', 0.1, 10, 0.01).onChange(value => {
            NARCamera.fov = value
            NARCamera.updateProjectionMatrix()
            par.renderOne = true;
        }).listen().name("Narrow FOV")


    //    SetupTrackLOSNodes()

        initKeyboard()

        toggler('v', gui.add(par, 'showVideo').listen().name("[V]ideo").onChange(value =>
            ViewMan.iterateTest(
                (x) => {
                    console.log(x.constructor.name+" "+x.id)
                    return x.constructor.name === 'CNodeVideoWebCodecView'
                },
                (k,x) => {
                    x.setVisible(value)}
            )
        ))


        toggler('g', gui.add(par, 'showGraphs').listen().name("[G]raphs").onChange(value =>
            ViewMan.iterateTest(
                (x) => {return x.constructor.name === 'CNodeCurveEditorView'},
                (k,x) => {x.setVisible(value)}
            )
        ))


        showHider(JetLOSDisplayNode, "[L]OS", true, 'l')
        showHider(lanternSplineDisplay, "Lantern [S]pline", true, 's')
        showHider(uapSplineDisplay, "UA[P] Spline", true, 'p')


    }

}
