import {FileManager, GlobalDateTimeNode, NodeMan} from "../Globals";
import {ECEFToLLAVD_Sphere, EUSToECEF, LLAToEUS} from "../LLA-ECEF-ENU";
import {DebugSphere, removeDebugSphere} from "../threeExt";
import {Group, Raycaster, Vector2} from "three";
import {GlobalScene} from "../LocalFrame";
import {makeMouseRay} from "../mouseMoveView";
import {MASK_MAINRENDER} from "../LayerMasks";
import * as LAYERS from "../LayerMasks";
import {CNodeViewUI} from "../nodes/CNodeViewUI";
import {par} from "../par";
import {ViewMan} from "../CViewManager";

export const SitFAA2023 = {
    include_nightsky: true,
    name: "faa2023",
    menuName: "FAA 2023",
    isTextable: false,

    files2: {
        data: "faa2023/Responsive Records for 2024-01435_January 1 2023 to April 30 2023.csv",
    },

    localLatLon: false,

    lat: 38.48,
    lon: -99.16,

    startCameraPositionLLA: [41.004248, -91.330286, 16358862.102478],
    startCameraTargetLLA: [41.004270, -91.330361, 16357862.396449],

    showFlareBand: true,
    showSunArrows: true,

    setup3: function () {
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

        if (this.Sit !== undefined && this.Sit.markerIndex !== undefined) {
            this.markerIndex = this.Sit.markerIndex;
        }

        // for each row, get time, lat, lon, alt
        for (let i = 0; i < csv.length; i++) {
            const row = csv[i]
//            console.log("row"+i+":"+row[3]+" "+ row[10] + " "+row[11] +" "+ row[17])
            const time = new Date(row[3] + " UTC")
            const lat = parseFloat(row[10])
            const lon = parseFloat(row[11])
            //const alt = parseFloat(row[17]) // alt format is inconsistent
//            console.log("time", time, "lat", lat, "lon", lon)

            // check if lat and lon are valid numbers
            if (isNaN(lat) || isNaN(lon)) {
                console.log("Invalid lat/lon", lat, lon)
                continue;
            }

            const position = LLAToEUS(lat, lon, 10000)
            const sphere = DebugSphere("FAA_marker_" + i, position, 50000, 0x00ff00, this.markerGroup)
            sphere.userData.time = time;
            sphere.userData.rowNumber = i;
            sphere.userData.markerNumber = this.numMarkers;
            sphere.userData.sourceRow = row;
            this.numMarkers++;

        }

        this.labelView = new CNodeViewUI({id: "labelFAA", overlayView: "mainView"});
        this.labelView.setVisible(true);


        this.redoIndexSphere();


        const mainView = ViewMan.get("mainView");
        mainView.div.addEventListener("pointermove", (event) => {
            this.handleMouseMove(event)
        })
        mainView.div.addEventListener("pointerdown", (event) => {
            this.handleMouseMove(event)
        })


        window.addEventListener('keydown', (e) => {

            const key = e.key.toLowerCase();
            let nextMarker;
            if (key === "n") {
                nextMarker = Math.max(0, this.markerIndex - 1)
                this.selectMarker(nextMarker)
            }
            if (key === "m") {
                nextMarker = Math.min(this.numMarkers - 1, this.markerIndex + 1)
                this.selectMarker(nextMarker)
            }


        })


    },

    handleMouseMove: function (event) {
        const mainView = ViewMan.get("mainView");
        let mouseX = (event.clientX);
        let mouseY = (event.clientY);
        var mouseYUp = mainView.heightPx - (mouseY - mainView.topPx)
        var mouseRay = makeMouseRay(mainView, mouseX, mouseYUp);

        //  console.log("pointermove" + event.clientX + event.clientY)
        const raycaster = new Raycaster();
        raycaster.layers.mask = LAYERS.MASK_MAINRENDER
        raycaster.setFromCamera(mouseRay, mainView.camera);
        const intersects = raycaster.intersectObjects(this.markerGroup.children);


        if (intersects.length > 0) {
            //  console.log("INTERSECTED", intersects[0].object.userData.time);
            // if left button pressed
            if (event.buttons === 1) {
                this.selectMarker(intersects[0].object.userData.markerNumber)
            } else {
                this.selectHover(intersects[0].object.userData.markerNumber)
            }
        } else {
            removeDebugSphere("FAA_hover_index")
        }
    },

    redoIndexSphere() {
        removeDebugSphere("FAA_marker_index")

        const marker = this.markerGroup.children[this.markerIndex]

        DebugSphere("FAA_marker_index", marker.position, 60000, 0xff0000)

        this.labelView.removeAllText()

        this.text = this.labelView.addText("caseInfo", "Case "+(marker.userData.rowNumber+1),  25, 2, 1.6, "#00ff00", "left");
        // get the text from column 2 of the csv
        const desc = marker.userData.sourceRow[2];
        // might have newlines in it, so split into lines and iterate over them
        const lines = desc.split("\n");
        // if any line is too long, split it into multiple lines
        // splitting over maxLen characters, on the last space before 50, or on 50 if no space
        // making a new array entry for each new line
        const maxLen = 80;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].length > maxLen) {
                let newLines = [];
                let line = lines[i];
                while (line.length > maxLen) {
                    let splitIndex = line.lastIndexOf(" ", maxLen);
                    if (splitIndex === -1) splitIndex = maxLen;
                    newLines.push(line.substring(0, splitIndex));
                    line = line.substring(splitIndex);
                }
                newLines.push(line);
                lines.splice(i, 1, ...newLines);
            }
        }


        // add each line using this.labelView.addLine()
        for (let i = 0; i < lines.length; i++) {
            this.labelView.addLine(lines[i]);
        }


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
            par.renderOne = true;

        }
    },

    selectHover: function(index) {
        if (this.hoverIndex !== index) {
            this.hoverIndex = index;
            console.log("Hovering over marker " + index + " of " + this.numMarkers);
            removeDebugSphere("FAA_hover_index")
            const marker = this.markerGroup.children[index]

            DebugSphere("FAA_hover_index", marker.position, 70000, 0xFFFFFF)


        }
    }

}