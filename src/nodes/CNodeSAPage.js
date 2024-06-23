import { cos, metersFromNM, radians, sin } from '../utils';
import { CNodeDDI } from './CNodeDDI';
import { Sit } from '../Globals';
import { par } from '../par';
import { trackVelocity } from '../trackUtils';

const pipText = [
  'N',
  '⦁',
  '⦁',
  '3',
  '⦁',
  '⦁',
  '6',
  '⦁',
  '⦁',
  'E',
  '⦁',
  '⦁',
  '12',
  '⦁',
  '⦁',
  '15',
  '⦁',
  '⦁',
  'S',
  '⦁',
  '⦁',
  '21',
  '⦁',
  '⦁',
  '24',
  '⦁',
  '⦁',
  'W',
  '⦁',
  '⦁',
  '30',
  '⦁',
  '⦁',
  '33',
  '⦁',
  '⦁',
];

/*
SA Controls
SCL/XX - toggles zoom level 160-80-40-20-10-5

DDI = Data Display Indicator the 20 button screen

HAFU = Hostile, Ambiguous, Friendly, Unknown
Threat Ring = dashed ring around a threat, indicating danger zone (pre-programmed, not detected )
Locked (target) HAFU has a star on it

Hostile = diamond
Ambiguous = square, triple thickness line (a bar) on top and bottom
Friendly = circle
Unknown = square, constant line thickness


toggling modes box it
DCNTR toggle button puts aircraft down at the bottom

https://www.digitalcombatsimulator.com/upload/iblock/9e2/DCS_FA-18C_Early_Access_Guide_EN.pdf

 */

class CHAFU {
  constructor(node, topType, bottomType, erraticAspect = 0) {
    this.node = node;
    this.topType = topType ?? 'Unknown'; // top is onboard sensors
    this.bottomType = bottomType ?? 'None'; // bottom is donor (link16) sensors
    this.erraticAspect = erraticAspect;
  }

  render(f) {
    const pos = this.node.v(f);
  }
}

export class CNodeSAPage extends CNodeDDI {
  constructor(v) {
    v.defaultFontColor = '#00c000';
    v.defaultFontSize = 4;
    super(v);
    this.input('jetTrack');
    this.input('windLocal');
    this.input('windTarget');
    this.radius = 40; // %
    this.pips = [];
    this.hafus = [];
    for (let i = 0; i < 36; i++) {
      const angle = radians(i * 10);
      this.pips.push(this.addText(`PIP${i}`, pipText[i], 0, 0, 4, '#E0E0E0'));
    }

    // this.friendlyColor = "#00ff00";
    // this.hostileColor = "#ff0000";
    // this.unknownColor = "#c0c000";

    // make it all green to match Graves' mockup
    const gravesGreen = '#6d9039';
    this.friendlyColor = gravesGreen;
    this.hostileColor = gravesGreen;
    this.unknownColor = gravesGreen;

    this.ambiguousColor = '#c0c000';

    this.scale = 20;
    this.decentered = false;
    this.showMap = false;
    this.northUp = false;
    this.showWind = false;

    this.setButton(6, 'MAP', true, (button) => {
      this.showMap = button.textObject.boxed;
    });
    //   this.setButton(7,"DCLTR")
    this.setButton(8, `SCL/${this.scale}`, false, (button) => {
      this.scale /= 2;
      if (this.scale < 5) this.scale = 160;
      this.updateScaleDisplay();
    });
    //    this.setButton(9,"MK1")
    this.setButton(10, 'DCNTR', true, (button) => {
      if (button.textObject.boxed) {
        this.jetX = 50;
        this.jetY = 86;
        this.decentered = true;
      } else {
        this.jetX = 50;
        this.jetY = 50;
        this.decentered = false;
      }
      this.updateScaleDisplay();
    });
    //  this.setButton(16,"AUTO")
    //  this.setButton(17,"TXDSG")
    this.setButton(20, 'N-UP', true, (button) => {
      this.northUp = button.textObject.boxed;
    });

    this.setButton(16, 'WIND', true, (button) => {
      this.showWind = button.textObject.boxed;
    });

    //  this.setButton(19,"STEP")
    //  this.setButton(20,"EXP")

    this.jetX = 50;
    this.jetY = 50;

    this.updateScaleDisplay();
    this.update(0); // set everything to frame 0
  }

  buttonBoxed(n) {
    return this.buttons[n].textObject.boxed;
  }

  updateScaleDisplay() {
    this.buttons[8].textObject.text = `SCL/${
      this.scale * (this.decentered ? 2 : 1)
    }`;
  }

  update(frame) {
    super.update(frame);
    let heading = this.in.jetTrack.v(frame).heading;
    if (this.northUp) heading = 0;
    for (let i = 0; i < 36; i++) {
      const angle = radians(i * 10 - heading);
      this.pips[i].setPosition(
        this.cx + this.radius * sin(angle),
        this.cy - this.radius * cos(angle) + 1.5
      );
    }
  }

  addHAFU(node, topType, bottomType, erraticAspect) {
    this.hafus.push(new CHAFU(node, topType, bottomType, erraticAspect));
  }

  worldToSA(pos, clamp = false) {
    // convert to xp,yp percentages
    const xp = (100 * (pos.x - this.camX)) / this.scaleM;
    const yp = (100 * (pos.z - this.camZ)) / this.scaleM;
    // rotate?

    let xr = xp * cos(this.angleSA) + yp * sin(this.angleSA);
    let yr = -xp * sin(this.angleSA) + yp * cos(this.angleSA);

    xr += this.jetX;
    yr += this.jetY;

    if (clamp) {
      // check for "doghouse" (i.e. outside the circle)
      // and clamp if needed
      xr -= 50;
      yr -= 50;
      const fromCenter = Math.sqrt(xr * xr + yr * yr);
      if (fromCenter > this.radius) {
        xr *= this.radius / fromCenter;
        yr *= this.radius / fromCenter;
      }
      xr += 50;
      yr += 50;
    }

    // xr,yr is now the percentage coordiantes of the hafu on screen
    return [xr, yr];
  }

  drawHalfHafu(c, topType, xr, yr, w, h) {
    if (topType === 'Unknown') {
      c.strokeStyle = this.unknownColor;
      c.lineWidth = 1.5;
      c.beginPath();
      // top of a square
      this.moveTo(xr - w, yr);
      this.lineTo(xr - w, yr - h);
      this.lineTo(xr + w, yr - h);
      this.lineTo(xr + w, yr);
      c.stroke();
    } else if (topType === 'Friendly') {
      c.strokeStyle = this.friendlyColor;

      c.beginPath();

      if (h < 0) this.arc(xr, yr, w, 0, 180);
      else this.arc(xr, yr, w, 180, 360);
      c.stroke();
    } else if (topType === 'Hostile') {
      c.strokeStyle = this.hostileColor;
      c.lineWidth = 1.5;

      c.beginPath();
      // top of a diamond
      this.moveTo(xr - w, yr);
      this.lineTo(xr, yr - h);
      this.lineTo(xr + w, yr);
      c.stroke();
    }
  }

  // render for CNodeSAPage
  renderCanvas(frame) {
    super.renderCanvas(frame);

    const camPos = this.in.jetTrack.p(frame);
    const heading = this.in.jetTrack.v(frame).heading;
    this.angleSA = radians(heading);
    if (this.northUp) this.angleSA = 0;
    this.camX = camPos.x;
    this.camZ = camPos.z; // z as overhead is the xz plane

    const c = this.ctx;

    c.strokeStyle = this.defaultFontColor;
    c.lineWidth = 1.5;
    c.beginPath();

    let a = 0;
    if (this.northUp) a = -radians(heading);

    const oldCy = this.cy;
    this.cy = this.jetY;

    this.rLine(this.jetX, this.jetY - 2, this.jetX, this.jetY - 0.5, a);
    this.rLine(this.jetX, this.jetY + 0.5, this.jetX, this.jetY + 8, a);

    this.rLine(this.jetX - 0.5, this.jetY, this.jetX - 5, this.jetY, a);
    this.rLine(this.jetX + 0.5, this.jetY, this.jetX + 5, this.jetY, a);

    this.rLine(this.jetX - 1, this.jetY + 7, this.jetX + 1, this.jetY + 7, a);

    c.stroke();

    this.cy = oldCy;

    let circleHeading = heading;
    if (this.northUp) circleHeading = 0;
    c.strokeStyle = this.friendlyColor;
    c.setLineDash([8, 4]);
    c.beginPath();
    this.arc(50, 50, 37, 0 - circleHeading, 360 - circleHeading);
    c.stroke();
    c.setLineDash([]);

    // scale is in NM, so convert to meters
    this.scaleM = metersFromNM(this.scale);
    // we want scaleM to be the width of the display in meters
    // but it's "distance from the aircraft to the inside edge of compass rose."
    // Source: A1-F18AC-NFM-000

    // when in DCNTR mode it will be displayed at twice the value
    this.scaleM *= 100 / this.radius;

    this.hafus.forEach((h) => {
      const pos = h.node.p(frame);

      const [xr, yr] = this.worldToSA(pos, true);

      let w = 1.4;
      // Frie
      if (h.topType === 'Friendly') {
        w = w * 0.8;
      }

      this.drawHalfHafu(c, h.topType, xr, yr, w, w);
      this.drawHalfHafu(c, h.bottomType, xr, yr, w, -w);

      // now the aspect (vector showing direction)
      let fAspect = frame;
      if (frame === 0) {
        fAspect = 1;
      }
      const aspectVector = h.node.p(fAspect).sub(h.node.p(fAspect - 1));
      let aspectAngle = this.angleSA;
      if (h.erraticAspect !== 0) {
        aspectAngle += radians((Math.random() - 0.5) * h.erraticAspect);
      }
      const ax = aspectVector.x;
      const ay = aspectVector.z; // z as in xz plane
      const aLen = Math.sqrt(ax * ax + ay * ay);
      const axr = (ax * cos(aspectAngle) + ay * sin(aspectAngle)) / aLen;
      const ayr = (-ax * sin(aspectAngle) + ay * cos(aspectAngle)) / aLen;
      c.beginPath();
      this.moveTo(xr + axr * w, yr + ayr * w);

      this.lineTo(xr + axr * 3.4, yr + ayr * 3.5);
      c.stroke();

      // if we want the bottom half, add it here.
      // ....

      // restore defualt color
      c.strokeStyle = this.defaultFontColor;

      if (this.showMap) {
        // draw the "map", the full tracks
        c.strokeStyle = '#00ffff';
        c.lineWidth = 0.75;
        c.beginPath();
        for (let f = 0; f < Sit.frames; f++) {
          const [xr, yr] = this.worldToSA(h.node.p(f));
          if (f === 0) {
            this.moveTo(xr, yr);
          } else {
            this.lineTo(xr, yr);
          }
        }
        c.stroke();
      }
    });

    // "Map" the jet track
    if (this.showMap) {
      // draw the "map", the full tracks
      c.strokeStyle = '#ffffff';
      c.lineWidth = 0.75;
      c.beginPath();
      for (let f = 0; f < Sit.frames; f++) {
        const [xr, yr] = this.worldToSA(this.in.jetTrack.p(f));
        if (f === 0) {
          this.moveTo(xr, yr);
        } else {
          this.lineTo(xr, yr);
        }
      }
      c.stroke();
    }

    if (this.showWind) {
      const vScale = 3000;

      const windVelocityScaledLocal = this.in.windLocal
        .v(par.frame)
        .multiplyScalar(vScale);

      const jetPosition = this.in.jetTrack.p(par.frame);
      const jetVelocityScaled = trackVelocity(
        this.in.jetTrack,
        par.frame
      ).multiplyScalar(vScale);
      this.windVelocityVectors(
        jetPosition,
        jetVelocityScaled,
        windVelocityScaledLocal
      );

      const windVelocityScaledTarget = this.in.windTarget
        .v(par.frame)
        .multiplyScalar(vScale);

      const gimbalPosition = this.hafus[0].node.p(par.frame);
      const gimbalVelocityScaled = trackVelocity(
        this.hafus[0].node,
        par.frame
      ).multiplyScalar(vScale);
      this.windVelocityVectors(
        gimbalPosition,
        gimbalVelocityScaled,
        windVelocityScaledTarget
      );
    }
  }

  windVelocityVectors(jetPosition, jetVelocityScaled, windVelocityScaled) {
    const groundVelocityEnd = jetPosition.clone().add(jetVelocityScaled);
    const airVelocityEnd = groundVelocityEnd.clone().sub(windVelocityScaled);

    const [x0, y0] = this.worldToSA(jetPosition);
    const [x1, y1] = this.worldToSA(groundVelocityEnd);
    const [xa, ya] = this.worldToSA(airVelocityEnd);
    this.arrowAB(x0, y0, x1, y1, 2, '#00ff00'); // green = ground speed
    this.arrowAB(xa, ya, x1, y1, 2, '#00ffff'); // cyan = wind speed
    this.arrowAB(x0, y0, xa, ya, 2, '#0000ff'); // blue = air speed
  }
}
