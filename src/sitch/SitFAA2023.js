import {FileManager, GlobalDateTimeNode, NodeMan} from "../Globals";
import {ECEFToLLAVD_Sphere, EUSToECEF, LLAToEUS} from "../LLA-ECEF-ENU";
import {DebugSphere, removeDebugSphere} from "../threeExt";
import {Group, Raycaster, Vector2} from "three";
import {GlobalScene} from "../LocalFrame";
import {ViewMan} from "../nodes/CNodeView";
import {makeMouseRay} from "../mouseMoveView";
import {MASK_MAINRENDER} from "../LayerMasks";
import * as LAYERS from "../LayerMasks";

export const SitFAA2023 = {
    include_nightsky: true,
    name: "faa2023",
    menuName: "FAA 2023",
    files2: {
        data: "faa2023/Responsive Records for 2024-01435_January 1 2023 to April 30 2023.csv",
    },

    localLatLon: false,

    lat: 38.48,
    lon: -99.16,

    startCameraPositionLLA:[41.004248,-91.330286,16358862.102478],
    startCameraTargetLLA:[41.004270,-91.330361,16357862.396449],

    setup3: function() {
        const csv = FileManager.get("data")
        // a parse csv file is just a 2D array, [row][column]
        // the first row is the header
        // Using zero indexing,
        // column 1  = Name
        // column 2  = Description
        // column 3  = Date and time in MM/DD/YYYY HH:MM format (UTC)
        // column 10 = Latitude
        // column 11 = Longitude
        // column 17 = Altitude

        this.markerGroup = new Group();
        GlobalScene.add(this.markerGroup);

        this.markerIndex = 0;
        this.numMarkers = 0;

        // for each row, get time, lat, lon, alt
        for (let i = 0; i < csv.length; i++) {
            const row = csv[i]
            console.log("row"+i+":"+row[3]+" "+ row[10] + " "+row[11] +" "+ row[17])
            const time = new Date(row[3] + " UTC")
            const lat = parseFloat(row[10])
            const lon = parseFloat(row[11])
            //const alt = parseFloat(row[17]) // alt format is inconsistent
            console.log("time", time, "lat", lat, "lon", lon)

            // check if lat and lon are valid numbers
            if (isNaN(lat) || isNaN(lon)) {
                console.log("Invalid lat/lon", lat, lon)
                continue;
            }

            const position = LLAToEUS(lat, lon, 10000)
            const sphere = DebugSphere("FAA_marker_"+i, position, 50000, 0x00ff00, this.markerGroup)
            sphere.userData.time = time;
            sphere.userData.index = i;
            this.numMarkers++;

        }

        this.redoIndexSphere();



        const mainView = ViewMan.get("mainView");
        mainView.div.addEventListener("pointermove", (event) => {

            let mouseX = (event.clientX);
            let mouseY = (event.clientY);
            var mouseYUp = mainView.heightPx - (mouseY-mainView.topPx)
            var mouseRay = makeMouseRay(mainView, mouseX, mouseYUp);

          //  console.log("pointermove" + event.clientX + event.clientY)
            const raycaster = new Raycaster();
            raycaster.layers.mask = LAYERS.MASK_MAINRENDER
            raycaster.setFromCamera( mouseRay, mainView.camera );
            const intersects = raycaster.intersectObjects( this.markerGroup.children );
            if ( intersects.length > 0 ) {
              //  console.log("INTERSECTED", intersects[0].object.userData.time);
                this.selectMarker(intersects[0].object.userData.index)
            }

        })



        window.addEventListener( 'keydown', (e) => {

            let nextMarker;
            if (e.key === "n") {
                nextMarker = Math.max(0, this.markerIndex - 1)
                this.selectMarker(nextMarker)
            }
            if (e.key === "m") {
                nextMarker = Math.min(this.numMarkers - 1, this.markerIndex + 1)
                this.selectMarker(nextMarker)
            }


        })


    },

    redoIndexSphere() {
        removeDebugSphere("FAA_marker_index")
        DebugSphere("FAA_marker_index", this.markerGroup.children[this.markerIndex].position, 60000, 0xff0000)
    },

    selectMarker: function(index) {
        if (this.markerIndex !== index) {
            console.log("Selecting marker "+ index+ " of "+this.numMarkers);
            this.markerIndex = index;
            GlobalDateTimeNode.setStartDateTime(this.markerGroup.children[this.markerIndex].userData.time)

            const ecef = EUSToECEF(this.markerGroup.children[this.markerIndex].position);
            const LLA = ECEFToLLAVD_Sphere(ecef)

            // we set the values in the UI nodes, which creates an
            // automatic cascade recalculation for anything that uses them.
            NodeMan.get("cameraLat").value = LLA.x
            NodeMan.get("cameraLon").value = LLA.y
            NodeMan.get("cameraAlt").value = 12000;


            this.redoIndexSphere();
        }
    },


}