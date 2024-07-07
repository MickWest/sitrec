// loader object for a
import {CNode} from "./CNode";
import {Map, Source} from '../js/map33/map33.js'
import {propagateLayerMaskObject} from "../threeExt";
import {cos, metersFromMiles, radians} from "../utils";
import {Globals, gui, guiMenus, NodeMan, Sit} from "../Globals";
import {EUSToLLA, RLLAToECEFV_Sphere, wgs84} from "../LLA-ECEF-ENU";
import {Group} from "three";

// note for map33.js to not give errors, had to  add
// const process = require('process');
// to path.js
import {GlobalScene} from "../LocalFrame";
import {CNodeSwitch} from "./CNodeSwitch";
import {V3} from "../threeUtils";

const terrainGUIColor = "#c0ffc0";

// let terrainGUI;
// let mapTypeMenu;
let local = {}
//const mapTypes = ["mapbox","osm","eox","wireframe","RGBTest"];
const mapTypes = {"MapBox":"mapbox","Open Streetmap":"osm","EOX":"eox","Wireframe":"wireframe","RGB Test":"RGBTest"};

// function makeMapTypeMenu() {
//     if (terrainGUI === undefined) {
//         terrainGUI = gui.addFolder("Terrain").setLabelColor(terrainGUIColor)
//     }
//     if (mapTypeMenu === undefined) {
//         local.mapType = "mapbox";
//         mapTypeMenu = terrainGUI.add(local, "mapType", mapTypes).setLabelColor(terrainGUIColor)
//     }
// }

export class CNodeTerrainUI extends CNode {
    constructor(v) {
        super(v);
        
        this.lat = 40;
        this.lon = -110;
        this.zoom = 10;
        this.nTiles = 4;
        this.refresh = false;



        if (v.terrain) {
            this.terrainNode = NodeMan.get(v.terrain);
            this.lat = this.terrainNode.lat;
            this.lon = this.terrainNode.lon;
            this.zoom = this.terrainNode.zoom;
            this.nTiles = this.terrainNode.nTiles;
        } else {
            gui.add(this, "addTerrain")
        }

        this.oldLat = this.lat;
        this.oldLon = this.lon;
        this.oldZoom = this.zoom;
        this.oldNTiles = this.nTiles;


        this.gui = this.terrainNode.terrainGUI;
        this.mapTypeMenu = this.terrainNode.mapTypeMenu;

        this.latController = this.gui.add(this, "lat", -85, 85,.001).onChange( v => {
            this.flagForRecalculation()
        }).onFinishChange( v => {this.startLoading = true}).setLabelColor(terrainGUIColor)
        this.lonController = this.gui.add(this, "lon", -180, 180,.001).onChange( v => {
            this.flagForRecalculation()
        }).onFinishChange( v => {this.startLoading = true}).setLabelColor(terrainGUIColor)
        this.zoomController = this.gui.add(this, "zoom", 0, 15,1).onChange( v => {
            this.flagForRecalculation()
        }).onFinishChange( v => {this.startLoading = true}).setLabelColor(terrainGUIColor)
        this.nTilesController = this.gui.add(this, "nTiles", 1, 8, 1).onChange( v => {
            this.flagForRecalculation()
        }).onFinishChange( v => {this.startLoading = true}).setLabelColor(terrainGUIColor)

        // adds a button to refresh the terrain
        this.gui.add(this, "doRefresh").name("Refresh").setLabelColor(terrainGUIColor);

        this.zoomToTrackSwitchObject = new CNodeSwitch({id: "zoomToTrack", kind: "Switch",
            inputs: {"-":"null"}, desc: "Zoom to track"}, this.gui).onChange( track => {this.zoomToTrack(track)})

  //      makeMapTypeMenu();
    }

    // note this is not the most elegant way to do this
    // but if the terrain is being removed, then we assume the GUI is too
    // this might not be the case, in the future
    dispose() {
        super.dispose();
    }


    zoomToTrack(v) {
        if (Globals.dontAutoZoom) return;
        const trackNode = NodeMan.get(v);
        const {minLat, maxLat, minLon, maxLon, minAlt, maxAlt} = trackNode.getLLAExtents();

        this.zoomToLLABox(minLat, maxLat, minLon, maxLon)

    }

    // given two Vector3s, zoom to the box they define
    zoomToBox(min, max) {
        // min and max are in EUS, so convert to LLA
        const minLLA = EUSToLLA(min);
        const maxLLA = EUSToLLA(max);
        this.zoomToLLABox(minLLA.x, maxLLA.x, minLLA.y, maxLLA.y)
    }

    zoomToLLABox(minLat, maxLat, minLon, maxLon)
    {
        this.lat = (minLat + maxLat) / 2;
        this.lon = (minLon + maxLon) / 2;

        const maxZoom = 15

        // find the zoom level that fits the track, ignore altitude
        // clamp to maxZoom
        const latDiff = maxLat - minLat;
        const lonDiff = maxLon - minLon;
        if (latDiff < 0.0001 || lonDiff < 0.0001) {
            this.zoom = maxZoom;
        } else {
            const latZoom = Math.log2(360 / latDiff);
            const lonZoom = Math.log2(180 / lonDiff);
            this.zoom = Math.min(maxZoom, Math.floor(Math.min(latZoom, lonZoom)));
        }
        this.latController.updateDisplay();
        this.lonController.updateDisplay();
        this.zoomController.updateDisplay();
        this.nTilesController.updateDisplay();

        // reset the switch
        this.zoomToTrackSwitchObject.selectFirstOptionQuietly();


        this.doRefresh();
    }


    doRefresh() {
        this.startLoading = true;
        this.flagForRecalculation();
    }

    flagForRecalculation() {
        this.recalculateSoon = true;
    }

    update() {
        if (this.recalculateSoon) {
            this.recalculate();
            this.recalculateSoon = false;
        }

        if (this.startLoading) {
            this.startLoading = false;
            this.terrainNode.maps[local.mapType].map.startLoadingTiles();
        }
    }

    recalculate() {
        // if the values have changed, then we need to make a new terrain node
        if (this.lat === this.oldLat && this.lon === this.oldLon && this.zoom === this.oldZoom && this.nTiles === this.oldNTiles && !this.refresh) {
            return;
        }
        this.oldLat = this.lat;
        this.oldLon = this.lon;
        this.oldZoom = this.zoom;
        this.oldNTiles = this.nTiles;
        this.refresh = false;


        let terrainID = "TerrainModel"
        // remove the old terrain
        if (this.terrainNode) {
            terrainID = this.terrainNode.id;
            NodeMan.disposeRemove(this.terrainNode)
        }
        // and make a new one
        this.terrainNode = new CNodeTerrain({
                id: terrainID, lat: this.lat, lon: this.lon,
                zoom: this.zoom, nTiles: this.nTiles, deferLoad: true,
                mapTypeMenu: this.mapTypeMenu, terrainGUI: this.gui,
            }
        )
    }

    // one time button to add a terrain node
    addTerrain() {
        this.recalculate();
        this.gui.remove(this.addTerrain)
    }

}


export class CNodeTerrain extends CNode {
    constructor(v) {

        // for bac reasons, we need to set the id to TerrainModel
        // unless another is specified
        if (v.id === undefined) {
            v.id = "TerrainModel"
        }

        super(v);

        
        // if (terrainGUI === undefined) {
        //     terrainGUI = gui.addFolder("Terrain")
        // }

        // we only want to create the menu once
        // if the CNodeTerrainUI exits, then that will manage it
        // and pass these two values in
        // Bit of a patch for backwards compatibility when there's no CNodeTerrainUI
        if (!v.mapTypeMenu) {
            this.terrainGUI = guiMenus.terrain; // gui.addFolder("Terrain")
            this.mapTypeMenu = this.terrainGUI.add(local, "mapType", mapTypes).setLabelColor(terrainGUIColor).listen().name("Map Type")
        } else {
            this.terrainGUI = v.terrainGUI;
            this.mapTypeMenu = v.mapTypeMenu;
        }

        this.loaded = false;

        // terrain radius is deprecated
     //   this.input("radiusMiles")
        this.radius = wgs84.RADIUS;

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


        if (Globals.quickTerrain) {
            this.nTiles = 1;
        }

        // Important: The tile size calculation assumes a SPHERICAL Earth, not ellipsoid
        // and it uses the WGS84 circumference, radius 6378137, -> 40075016
        // rounded slightly to 40075000
        // this circumference is for the tile APIs, and does NOT change with radius
        let circumfrence = 40075000*cos(radians(this.lat));
        this.tileSize = circumfrence/Math.pow(2,this.zoom) // tileSize is the width and height of the tile in meters

        // the origin is in the middle of the first tile
        // so we need to find the latitude and longitude of this tile center
        // this is all a bit dodgy

        function lon2tile (lon, zoom) {
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

        var tilex = Math.floor(lon2tile(this.position[1],this.zoom))+0.5 // this is probably correct
        var tiley = Math.floor(lat2tile(this.position[0],this.zoom))+0.5 // this might be a bit off, as not linear?
        var lon0 = tile2lon(tilex,this.zoom)
        var lat0 = tile2lat(tiley,this.zoom)
        console.log("LL Tile"+tilex+","+tiley+" = (Lat,Lon)"+lat0+","+lon0)

        // we need to adjust the LL origin to match the 3D map
        // but only if it's not already set
        if (Sit.lat === undefined) {
            Sit.lat = lat0
            Sit.lon = lon0
        }



        var enu;
//        const radius = metersFromMiles(this.in.radiusMiles.v0)
        const radius = metersFromMiles(this.radius)



        this.maps = []
        // changed from an array to K/V pairs
        // so iterate over K/V
        for (const mapName in mapTypes) {
            const mapID = mapTypes[mapName]
            this.maps[mapID] = {
                group: new Group(),
                source: new Source(mapID, ''), // << Todo - allow the user to access it directly with their own token
            }
            GlobalScene.add(this.maps[mapID].group)

        }

        // mapTypes.forEach(m => {
        //     this.maps[m] = {
        //         group: new Group(),
        //         source: new Source(m, ''), // << Todo - allow the user to access it directly with their own token
        //     }
        //     GlobalScene.add(this.maps[m].group)
        // })

        local.mapType = v.mapType ?? "mapbox"
        this.deferLoad = v.deferLoad;
        this.loadMap(local.mapType, (this.deferLoad !== undefined) ? this.deferLoad:false)

//        makeMapTypeMenu();
        this.mapTypeMenu.onChange( v => {
            // set it visible
            for (const mapID in this.maps) this.maps[mapID].group.visible = (mapID === v);
            this.loadMap(v)
        })

        // NOTE
        // this call to console.table was passed the globalscene's children
        // which seemed to create a extra references to them
        // and caused a memory leak
        // console.table(GlobalScene.children)
    }

    serialize() {
        let out = super.serialize();
        out = {
            ...out, ...{
                lat: this.lat,
                lon: this.lon,
                zoom: this.zoom,
                nTiles: this.nTiles,
            }
        }
        // when serializing, we don't want to include optional parameters that were
        // not there in the original setup data
        if (this.deferLoad !== undefined) {
            out.deferLoad = this.deferLoad
        }

        if (this.in.flattening !== undefined) {
            out.flattening = this.in.flattening.v0
        }

        return out;
    }

    dispose() {
        // first abort any pending request

        for (const mapID in this.maps) {
            if (this.maps[mapID].map !== undefined) {
                this.maps[mapID].map.clean()
                this.maps[mapID].map = undefined
            }
            GlobalScene.remove(this.maps[mapID].group)
            this.maps[mapID].group = undefined;
        }

        super.dispose();
    }


    loadMap(id, deferLoad) {
        if (this.maps[id].map == undefined) {
            Globals.loadingTerrain = true;
            console.log("CNodeTerrain: loading map "+id+" deferLoad = "+deferLoad)
            this.maps[id].map = new Map(this.maps[id].group, this.maps[id].source, this.position, {
                nTiles: this.nTiles,
                zoom: this.zoom,
                tileSize: this.tileSize,
                tileSegments: this.tileSegments,   // this can go up to 256, with no NETWORK bandwidth.
                zScale: 1,
//                radius: metersFromMiles(this.in.radiusMiles.v0),
                radius: this.radius,
                loadedCallback:  ()=> {
                    // first check to see if it has been disposed
                    // this happnes and need fixing, but for now just warn and
                    if (this.maps[id].map === undefined) {
                        console.error("FIX NEEDED: CNodeTerrain: id = " + id + " map loaded callback called with no map object")
                        return;
                    }

                    // Once map has finished loading, we can recalculate anything that depends on it
                    // like things that use the terrain height
                    this.outputs.forEach( o => {
                        o.recalculateCascade()
                    })
                    console.log("CNodeTerrain: id = "+id+" map loaded");
                    propagateLayerMaskObject(this.maps[id].group)

                    // call the terrainLoadedCallback on any node that has it
                    NodeMan.iterate( (id, n) => {
                        if (n.terrainLoadedCallback !== undefined) {
                            n.terrainLoadedCallback()
                        }
                    })

                    Globals.loadingTerrain = false;

                },
                deferLoad: deferLoad,
            })
        }
    }

    recalculate() {

        console.log("recalculting terrain")
        //var radius = metersFromMiles(this.in.radiusMiles.v0)
        var radius = this.radius;
        // flattening is 0 to 1, whenre 0=no flattening, 1=flat
        // so scale radius by (1/(1-flattening)
        if (this.in.flattening != undefined) {
            var flattening = this.in.flattening.v0
            if (flattening >= 1) flattening = 0.999999
            radius *= (1/(1-flattening))

        }
        Sit.originECEF = RLLAToECEFV_Sphere(radians(Sit.lat),radians(Sit.lon),0,radius)
        this.maps[local.mapType].map.recalculateCurveMap(radius)

        propagateLayerMaskObject(this.maps[local.mapType].group)

    }

    // return current group, for collision detection, etc
    getGroup() {
        return this.maps[local.mapType].group;
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
        // redo it using the tiles, not the geometry

        // const down = getLocalDownVector(A)
        // const rayCaster = new Raycaster(A, down);
        // const intersect = this.getClosestIntersect(rayCaster);
        //
        // if (intersect !== null) {
        //     // only return the point if it's above sea level
        //     if (altitudeAboveSphere(intersect.point) >= 0)
        //         return intersect.point;
        // }

        // we use LLA to get the data from the terrain maps
        const LLA = EUSToLLA(A)
        // elevation is the height above the wgs84 sphere
        let elevation = this.maps[local.mapType].map.getElevationInterpolated(LLA.x, LLA.y)

        // then
        const earthCenterENU = V3(0,-wgs84.RADIUS,0)
        const centerToA = A.clone().sub(earthCenterENU)
        const scale = (wgs84.RADIUS + elevation) / centerToA.length()
        return earthCenterENU.add(centerToA.multiplyScalar(scale))


    }
}

