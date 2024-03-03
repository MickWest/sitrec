// loader object for a
import {CNode} from "./CNode";
import { Map, Source} from '../js/map33/map33.js'
import {propagateLayerMaskObject, V3} from "../threeExt";
import {cos, metersFromMiles, radians} from "../utils";
import {Sit} from "../Globals";
import {ECEF2ENU, RLLAToECEFV_Sphere, LLAToEUS, getN} from "../LLA-ECEF-ENU";
import {Group} from "../../three.js/build/three.module";
import {gui} from "../Globals";

// note for map33.js to not give errors, had to  add
// const process = require('process');
// to path.js
import * as LAYER from "../LayerMasks.js"
import {GlobalScene} from "../LocalFrame";
import {altitudeAboveSphere, getLocalDownVector, getLocalUpVector, pointOnSphereBelow} from "../SphericalMath";
import {Raycaster} from "three";

export class CNodeTerrain extends CNode {
    constructor(v) {
        super(v);

        this.loaded = false;

        this.input("radiusMiles")
        this.input("flattening", true) //optional

        // attempt to load it from mapBox.
        this.lat = v.lat
        this.lon = v.lon
        // so maybe want to snap this to a grid?
        this.position = [this.lat, this.lon]

        // Tile resolution = length of line of latitude / (2^zoom)
        // ref: https://docs.mapbox.com/help/glossary/zoom-level/
        // Tiles in Mapbox GL are 512x512
        this.zoom = v.zoom;
        this.nTiles = v.nTiles;
        this.tileSegments = v.tileSegments ?? 100;

        // Important: The tile size calculation assumes a SPHERICAL Earth, not ellipsoid
        // and it uses the WGS84 circumference, radius 6378137, -> 40075016
        // rounded slightly to 40075000
        // this circumference is for the tile APIs, and does NOT change with radius
        let circumfrence = 40075000*cos(radians(this.lat));
        this.tileSize = circumfrence/Math.pow(2,this.zoom) // tileSize is the width and height of the tile in meters

        // the origin is in the middle of the first tile
        // so we need to find the latitude and longitude of this tile center
        // this is all a bit dodgy

        function long2tile (lon, zoom) {
            return (lon + 180) / 360 * Math.pow(2, zoom)
        }

        function lat2tile (lat, zoom) {
            return (
                (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)
            )
        }

        const d2r = Math.PI / 180
        const r2d = 180 / Math.PI;

        function tile2lon(x, z) {
            return x / Math.pow(2, z) * 360 - 180;
        }

        function tile2lat(y, z) {
            var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
            return r2d * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
        }

        var tilex = Math.floor(long2tile(this.position[1],this.zoom))+0.5 // this is probably correct
        var tiley = Math.floor(lat2tile(this.position[0],this.zoom))+0.5 // this might be a bit off, as not linear?
        var lon0 = tile2lon(tilex,this.zoom)
        var lat0 = tile2lat(tiley,this.zoom)
        console.log("LL Tile"+tilex+","+tiley+" = (Lat,Lon)"+lat0+","+lon0)

        // we need to adjust the LL origin to match the 3D map
        Sit.lat = lat0
        Sit.lon = lon0
        var enu;
        const radius = metersFromMiles(this.in.radiusMiles.v0)

        this.mapTypes = ["mapbox","osm","eox","wireframe"]

        this.maps = []
        this.mapTypes.forEach(m => {
            this.maps[m] = {
                group: new Group(),
                source: new Source(m, ''), // << Todo - allow the user to access it directly with their own token
            }
            GlobalScene.add(this.maps[m].group)
        })

        this.mapType = "mapbox"
        this.loadMap(this.mapType)

        gui.add(this,"mapType",this.mapTypes).onChange( v => {
            // set it visible
            for (const mapID in this.maps) this.maps[mapID].group.visible = (mapID === v);
            this.loadMap(v)

        })
        console.table(GlobalScene.children)
    }

    dispose() {
        // first abort any pending request

        for (const mapID in this.maps) {
            if (this.maps[mapID].map !== undefined) {
                this.maps[mapID].map.clean()
                this.maps[mapID].map = undefined
            }
            GlobalScene.remove(this.maps[mapID].group)
        }
    }


    loadMap(id) {
        if (this.maps[id].map == undefined) {
            this.maps[id].map = new Map(this.maps[id].group, this.maps[id].source, this.position, {
                nTiles: this.nTiles,
                zoom: this.zoom,
                tileSize: this.tileSize,
                tileSegments: this.tileSegments,   // this can go up to 256, with no NETWORK bandwidth.
                zScale: 1,
                radius: metersFromMiles(this.in.radiusMiles.v0),
                loadedCallback:  ()=> {
                    // Once map has finished lading, we can recalculate anything that depends on it
                    // like things that use the terrain height
                    this.outputs.forEach( o => {
                        o.recalculateCascade()
                    })
                    propagateLayerMaskObject(this.maps[id].group)
                }
            })
        }
    }

    recalculate(f) {
        console.log("recalcualting terrain")
        var radius = metersFromMiles(this.in.radiusMiles.v0)
        // flattening is 0 to 1, whenre 0=no flattening, 1=flat
        // so scale radius by (1/(1-flattening)
        if (this.in.flattening != undefined) {
            var flattening = this.in.flattening.v0
            if (flattening >= 1) flattening = 0.999999
            radius *= (1/(1-flattening))

        }
        Sit.originECEF = RLLAToECEFV_Sphere(radians(Sit.lat),radians(Sit.lon),0,radius)
        this.maps[this.mapType].map.recalculateCurveMap(radius)

        propagateLayerMaskObject(this.maps[this.mapType].group)

    }

    // return current group, for collision detection, etc
    getGroup() {
        return this.maps[this.mapType].group;
    }

    getIntersects(raycaster) {
        const collisionSet = this.getGroup().children
        return raycaster.intersectObjects(collisionSet, true)
    }

    getClosestIntersect(raycaster) {
        const intersects = this.getIntersects(raycaster)
        return intersects.length > 0 ? intersects[0] : null
    }

    getPointBelow(A) {
        // given a point in ENU, return the point on the terrain
        // by casting a ray from the point to the center of the earth
        // and finding the intersection with the terrain

        // TODO - altitude above ground is very slow
        // redo it useing the tiles, not the geometry

        // const down = getLocalDownVector(A)
        // const rayCaster = new Raycaster(A, down);
        // const intersect = this.getClosestIntersect(rayCaster);
        //
        // if (intersect !== null) {
        //     // only return the point if it's above sea level
        //     if (altitudeAboveSphere(intersect.point) >= 0)
        //         return intersect.point;
        // }


        return pointOnSphereBelow(A)
    }
}

