// CNodeDisplaySkyOverlay takes a CNodeCanvas derived node, CNodeDisplayNightSky and a camera
// and displays star names on an overlay
import {CNodeViewUI} from "./CNodeViewUI";
import {GlobalDateTimeNode, guiShowHide, Sit} from "../Globals";
import {par} from "../par";
import {raDec2Celestial} from "../CelestialMath";
import {bestSat} from "../TLEUtils";
import {V3} from "../threeUtils";
import {ECEF2ENU, wgs84} from "../LLA-ECEF-ENU";
import {radians} from "../utils";

var satellite = require('satellite.js');

export class CNodeDisplaySkyOverlay extends CNodeViewUI {

    constructor(v) {
        super(v);
        this.addInput("startTime", GlobalDateTimeNode)

        this.camera = v.camera;
        this.nightSky = v.nightSky;

        this.showSatelliteNames = false;
        this.showStarNames = false;

        //    guiShowHide.add(this,"showSatelliteNames" ).onChange(()=>{par.renderOne=true;}).name(this.overlayView.id+" Sat names")
        guiShowHide.add(this, "showStarNames").onChange(() => {
            par.renderOne = true;
        }).name(this.overlayView.id + " Star names").listen();
        this.addSimpleSerial("showStarNames");


    }

    //
    renderCanvas(frame) {
        super.renderCanvas(frame);

        const camera = this.camera.clone();
        camera.position.set(0, 0, 0)
        camera.updateMatrix()
        camera.updateWorldMatrix()
        camera.updateProjectionMatrix()

//         var cameraECEF = ESUToECEF()
//         var cameraLLA = ECEFToLLA()

        var font_h = 9

        this.ctx.font = Math.floor(font_h) + 'px' + " " + 'Arial'
        this.ctx.fillStyle = "#ffffff";
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.textAlign = 'left';

        if (this.showStarNames) {
            for (var HR in this.nightSky.commonNames) {

                // HR is the HR number, i.e. the index into the BSC + 1
                // So we sub 1 to get the actual index.
                const n = HR - 1

                const ra = this.nightSky.BSC_RA[n]
                const dec = this.nightSky.BSC_DEC[n]
                const pos = raDec2Celestial(ra, dec, 100) // get equatorial
                pos.applyMatrix4(this.nightSky.celestialSphere.matrix) // convert equatorial to EUS
                pos.project(camera) // project using the EUS camera

                if (pos.z > -1 && pos.z < 1 && pos.x >= -1 && pos.x <= 1 && pos.y >= -1 && pos.y <= 1) {
                    var x = (pos.x + 1) * this.widthPx / 2
                    var y = (-pos.y + 1) * this.heightPx / 2
                    x += 5
                    y -= 5
                    this.ctx.fillText(this.nightSky.commonNames[HR], x, y)
                }
            }

            // // iterate over ALL the stars, not just the common ones
            // // and lable them with the index
            //   for (let n = 0; n < this.nightSky.BSC_NumStars; n++) {
            //       const ra = this.nightSky.BSC_RA[n]
            //       const dec = this.nightSky.BSC_DEC[n]
            //       assert(ra !== 0 || dec !== 0, "ra AND dec is 0 for star "+n + " "+this.nightSky.BSC_NAME[n]+" Mag="+this.nightSky.BSC_MAG[n])
            //       const pos1 = raDec2Celestial(ra, dec, 100) // get equatorial
            //       pos1.applyMatrix4(this.nightSky.celestialSphere.matrix) // convert equatorial to EUS
            //       pos1.project(camera) // project using the EUS camera
            //
            //       if (pos1.z > -1 && pos1.z < 1 && pos1.x >= -1 && pos1.x <= 1 && pos1.y >= -1 && pos1.y <= 1) {
            //           var x = (pos1.x + 1) * this.widthPx / 2
            //           var y = (-pos1.y + 1) * this.heightPx / 2
            //           x += 5
            //           y -= 5
            //           this.ctx.fillText(n, x, y)
            //       }
            //   }


            // Note this is overlay code, so we use this.nightSky.
            // CNodeDisplayNightSky would use this.planetSprites
            for (const [name, planet] of Object.entries(this.nightSky.planetSprites)) {
                var pos = planet.equatorial.clone()
                pos.applyMatrix4(this.nightSky.celestialSphere.matrix)

                pos.project(camera)

                this.ctx.strokeStyle = planet.color;
                this.ctx.fillStyle = planet.color;

                if (pos.z > -1 && pos.z < 1 && pos.x >= -1 && pos.x <= 1 && pos.y >= -1 && pos.y <= 1) {
                    var x = (pos.x + 1) * this.widthPx / 2
                    var y = (-pos.y + 1) * this.heightPx / 2
                    x += 5
                    y -= 5
                    this.ctx.fillText(name, x, y)
                }

            }
        }


        // draw satellite names
        if (this.showSatelliteNames && this.nightSky.TLEData) {
            const date = this.nightSky.in.startTime.dateNow;

            this.ctx.strokeStyle = "#8080FF";
            this.ctx.fillStyle = "#8080FF";

            for (const [index, satData] of Object.entries(this.nightSky.TLEData.satData)) {
                const best = bestSat(satData, date);

                const positionAndVelocity = satellite.propagate(best, date);

                if (positionAndVelocity && positionAndVelocity.position) {
                    const positionEci = positionAndVelocity.position;

                    var gmst = satellite.gstime(date);
                    var ecefK = satellite.eciToEcf(positionEci, gmst)
                    const ecef = V3(ecefK.x * 1000, ecefK.y * 1000, ecefK.z * 1000)
                    const enu = ECEF2ENU(ecef, radians(Sit.lat), radians(Sit.lon), wgs84.RADIUS)
                    const eus = V3(enu.x, enu.z, -enu.y)
                    //    pos.applyMatrix4(this.nightSky.celestialSphere.matrix)

                    const pos = eus

                    // we use the actual camera for satellites, as they are just in EUS
                    pos.project(this.camera)


                    if (pos.z > -1 && pos.z < 1 && pos.x >= -1 && pos.x <= 1 && pos.y >= -1 && pos.y <= 1) {
                        var x = (pos.x + 1) * this.widthPx / 2
                        var y = (-pos.y + 1) * this.heightPx / 2
                        x += 5
                        y -= 5
                        this.ctx.fillText(satData.name, x, y)
                    }
                }
            }
        }
    }
}