import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3} from "../three.js/build/three.module";
import {GlobalScene} from "./LocalFrame";
import {radians} from "./utils";

const xAxis = new Vector3(1,0,0)
const yAxis = new Vector3(0,1,0)
const zAxis = new Vector3(0,0,1)

export class CSatellite {

    constructor(v) {
        const parent = v.parent ?? GlobalScene;

        const size = v.size ?? 0.001;

        this.color = v.color ?? '#404040'
        this.lit = '#FFFFFF'

        this.geometry = new SphereGeometry(size, 10, 10);
        this.material = new MeshBasicMaterial({color: this.color});
        this.sphere = new Mesh(this.geometry, this.material);

        this.lon = v.lon;
        this.tilt = v.tilt;
        this.offset = v.offset
        this.radius = v.radius
        this.altitude = v.altitude

        parent.add(this.sphere)
        this.update(0)
    }

    // given a time t, where 1 is all teh way around, the update teh position
    update(t) {
        // get a pair of orthogonal vectors.
        // pos is the position of the satellite
        // at the start it's just a point along the X axis
        var pos = xAxis.clone()
        // left is an axis perpendicular to this
        var left = zAxis.clone() // and axis to the left of this position

        // rotate them both by the longitude
        pos.applyAxisAngle(yAxis,this.lon)
        left.applyAxisAngle(yAxis,this.lon)

        // rotate the left axis around pos
        // which will tilt it up
        left.applyAxisAngle(pos, -this.tilt)

        // then rotate pos around this tilted left vector
        pos.applyAxisAngle(left,2*Math.PI*(t+this.offset))

        pos.multiplyScalar(this.radius + this.altitude)

        this.sphere.position.copy(pos)

        pos.applyAxisAngle(zAxis,radians(-23.5)) // PATCH: hard wiring the tilt

        var xR = Math.sqrt(pos.y*pos.y+pos.z*pos.z)

        const darkest = 0.05
        if (pos.x >= 0) {
            this.material.color.setScalar(1)
        } else {
            if (xR > this.radius) {
                var raised = (xR - this.radius) / this.altitude
                if (raised < darkest) raised = darkest;
                this.material.color.setScalar(raised)
            } else {
                this.material.color.setScalar(darkest)
            }
        }

    }

}


export class CSatellites {
    constructor (parent, n, radius, altitude) {

        this.sats = []
        this.n = n;
        for (var i=0;i<this.n;i++) {
            const longitude = radians(Math.random()*360 - 180)
            var tilt = radians(30)

            // the first few are allowed to cross the poles
            if (i<100) {
                tilt = (Math.random()*tilt)
            }

            this.sats.push(new CSatellite({
                parent: parent,
                lon: longitude, // where it crosses the equator
                tilt: tilt,
                offset: Math.random(), // how far around the orbit, 0..1
                radius: radius,
                altitude: altitude,
            }))
        }



    }

    update(t) {
        for (var i=0;i<this.n;i++) {
            this.sats[i].update(t)

        }
    }
}