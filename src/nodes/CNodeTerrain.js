// loader object for a
import {CNode} from "./CNode";
import {Map33, CMapTextureSource} from '../js/map33/map33.js'
import {propagateLayerMaskObject} from "../threeExt";
import {cos, radians} from "../utils";
import {Globals, guiMenus, NodeMan, Sit} from "../Globals";
import {EUSToLLA, RLLAToECEFV_Sphere, wgs84} from "../LLA-ECEF-ENU";
import {Group} from "three";

// note for map33.js to not give errors, had to  add
// const process = require('process');
// to path.js
import {GlobalScene} from "../LocalFrame";
import {CNodeSwitch} from "./CNodeSwitch";
import {V3} from "../threeUtils";
import {assert} from "../assert";
import {isLocal, SITREC_ROOT, SITREC_SERVER} from "../../config";
import {configParams} from "../login";
import {CTileMappingGoogleCRS84Quad, CTileMappingGoogleMapsCompatible} from "../WMSUtils";

const terrainGUIColor = "#c0ffc0";

let local = {}

export class CNodeTerrainUI extends CNode {
    constructor(v) {
        super(v);

        this.adjustable = v.adjustable ?? true;
        
        this.lat = 40;
        this.lon = -110;
        this.zoom = 10;
        this.nTiles = 4;
        this.refresh = false;


        if (configParams.customMapSources !== undefined) {
            // start with the custom map sources
            this.mapSources = configParams.customMapSources;
        } else {
            this.mapSources = {};
        }

        // add the default map sources, wireframe and flat shading
        this.mapSources = {
            ...this.mapSources,
            wireframe: {
                name: "Wireframe",
                mapURL: (z, x, y) => {
                    return null;
                },
            },
            FlatShading: {
                name: "Flat Shading",
                mapURL: (z, x, y) => {
                    return SITREC_ROOT + "data/images/grey-256x256.png?v=1";
                },
            },
        }

        // local debugging, add a color test map
        if (isLocal) {
            this.mapSources = {
                ...this.mapSources,
                RGBTest: {
                    name: "RGB Test",
                    mapURL: (z, x, y) => {
                        return SITREC_ROOT + "data/images/colour_bars_srgb-255-128-64.png?v=1";
                    },
                },
            }
        }


        // extract a K/V pair from the mapSources
        // for use in the GUI.
        // key is the name, value is the id
        this.mapTypesKV = {}
        for (const mapType in this.mapSources) {
            const mapDef = this.mapSources[mapType]
            this.mapTypesKV[mapDef.name] = mapType

        }

        this.gui = guiMenus.terrain;
        this.mapTypeMenu = this.gui.add(local, "mapType", this.mapTypesKV).setLabelColor(terrainGUIColor).listen().name("Map Type")


        // WHY local???
        this.setMapType(local.mapType)


        if (v.terrain) {
            this.terrainNode = NodeMan.get(v.terrain);
            this.lat = this.terrainNode.lat;
            this.lon = this.terrainNode.lon;
            this.zoom = this.terrainNode.zoom;
            this.nTiles = this.terrainNode.nTiles;
        } else {
            this.gui.add(this, "addTerrain")
        }



        this.oldLat = this.lat;
        this.oldLon = this.lon;
        this.oldZoom = this.zoom;
        this.oldNTiles = this.nTiles;


        this.mapTypeMenu.onChange( v => {

            // do this async, as we might need to wait for the capabilities to be loaded
            this.setMapType(v).then(() => { ;
                this.terrainNode.loadMap(v)
            })
        })

        if (v.fullUI) {

            this.latController = this.gui.add(this, "lat", -85, 85, .001).onChange(v => {
                this.flagForRecalculation()
            }).onFinishChange(v => {
                this.startLoading = true
            }).setLabelColor(terrainGUIColor)

            this.lonController = this.gui.add(this, "lon", -180, 180, .001).onChange(v => {
                this.flagForRecalculation()
            }).onFinishChange(v => {
                this.startLoading = true
            }).setLabelColor(terrainGUIColor)

            this.zoomController = this.gui.add(this, "zoom", 0, 15, 1).onChange(v => {
                this.flagForRecalculation()
            }).onFinishChange(v => {
                this.startLoading = true
            }).setLabelColor(terrainGUIColor)

            this.nTilesController = this.gui.add(this, "nTiles", 1, 8, 1).onChange(v => {
                this.flagForRecalculation()
            }).onFinishChange(v => {
                this.startLoading = true
            }).setLabelColor(terrainGUIColor)

            // adds a button to refresh the terrain
            this.gui.add(this, "doRefresh").name("Refresh").setLabelColor(terrainGUIColor);

            this.zoomToTrackSwitchObject = new CNodeSwitch({
                id: "zoomToTrack", kind: "Switch",
                inputs: {"-": "null"}, desc: "Zoom to track"
            }, this.gui).onChange(track => {
                this.zoomToTrack(track)
            })
        }

    }


    async setMapType(v)
    {
        const mapType = v;
        const mapDef = this.mapSources[mapType];

        // does it have pre-listed layers in the mapDef?
        if (mapDef.layers !== undefined) {
            // nothing needed here
        } else {
            // no layers, so we check for WMS capabilities
            // if there's one, then we load it
            // and extract the layers from it

            // also, if we have a capabilities URL, then start loading it
            if (mapDef.capabilities !== undefined) {
                const response = await fetch(mapDef.capabilities);
                const data = await response.text();
                console.log("Capabilities for " + mapType)
                //console.log(data)
                // convert XML to object
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(data, "text/xml");

                // two different types of WMS capabilities
                // WMS uses "Layer" and WMTS uses "Contents"
                // so we need to check for both
                const contents = xmlDoc.getElementsByTagName("Contents");
                mapDef.layers = {}

                if (contents.length > 0) {
                    console.log("Contents:")
                    const layers = xmlDoc.getElementsByTagName("Layer");
                     for (let layer of layers) {
                         const layerName = layer.getElementsByTagName("ows:Identifier")[0].textContent;
                         mapDef.layers[layerName] = {
                          // nothing yet, extract more later
                         }
                     }
                } else {
                    const layers = xmlDoc.getElementsByTagName("Layer");
                    for (let layer of layers) {
                        const layerName = layer.getElementsByTagName("Name")[0].childNodes[0].nodeValue;
                        mapDef.layers[layerName] = {
                        }
                    }
                }
            }
        }

        // use either the passed in mapDef, or the one we just extracted from the capabilities
        this.mapDef = mapDef;
        this.layer = this.mapDef.layer;
        // Remove any layer menu now, as this might not have on
        this.layersMenu?.destroy()
        this.layersMenu = null;
        this.updateLayersMenu(mapDef.layers);
    }

    updateLayersMenu(layers) {
        // layers is an array of layer names
        // we want a KV pair for the GUI
        // where both K and V are the layer name
        this.localLayers = {}

        // iterate over keys (layer names) to make the identicak KV pair for the GUI
        for (let layer in layers) {
            this.localLayers[layer] = layer
        }

        // set the layer to the specified default, or the first one in the capabilities
        if (this.mapDef.layer !== undefined) {
            this.layer = this.mapDef.layer;
        } else {
            this.layer = Object.keys(this.localLayers)[0]
        }
        this.layersMenu = this.gui.add(this, "layer", this.localLayers).setLabelColor(terrainGUIColor).listen().name("Layer")

        // if the layer has changed, then unload the map and reload it
        // new layer will be handled by the mapDef.layer
        this.layersMenu.onChange( v => {

            this.terrainNode.unloadMap(local.mapType)
            this.terrainNode.loadMap(local.mapType)
        })

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
        const minZoom = 3;

        // find the zoom level that fits the track, ignore altitude
        // clamp to maxZoom
        // NOTE THIS IS NOT ACCOUNTING FOR WEB MERCATOR PROJECTION
        const latDiff = maxLat - minLat;
        const lonDiff = maxLon - minLon;
        if (latDiff < 0.0001 || lonDiff < 0.0001) {
            this.zoom = maxZoom;
        } else {
            const latZoom = Math.log2(360 / latDiff);
            const lonZoom = Math.log2(180 / lonDiff);
            this.zoom = Math.min(maxZoom, Math.floor(Math.min(latZoom, lonZoom)-1));
            this.zoom = Math.max(minZoom, this.zoom);
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
            this.terrainNode.elevationMap.startLoadingTiles();
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
                mapTypes: this.mapSources,
                mapType: local.mapType,
                UINode: this,
            }
        )
    }

    // one time button to add a terrain node
    addTerrain() {
        this.recalculate();
        this.gui.remove(this.addTerrain)
    }

}
//////////////////////////////////////////////////////////////////////////////////////
//                                                                                  //
// CNodeTerrain                                                                     //
//                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////

export class CNodeTerrain extends CNode {
    constructor(v) {

        // for bac reasons, we need to set the id to TerrainModel
        // unless another is specified
        if (v.id === undefined) {
            v.id = "TerrainModel"
        }

        super(v);

        this.loaded = false;

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

        // we need to adjust the LL origin to match the 3D map
        // but only if it's not already set
        if (Sit.lat === undefined) {
            // Sit.lat = lat0
            // Sit.lon = lon0
            Sit.lat = this.lat
            Sit.lon = this.lon
        }

        local.mapType = v.mapType ?? "mapbox"

        // always create a terrainUI, just with limited options for the legacy sitches
        // but for now, everything is include (will need to flag "everything" in custom)
        this.UINode = v.UINode ?? null;
        if (!this.UINode) {
            this.UINode = new CNodeTerrainUI({id: "terrainUI", terrain: v.id, fullUI: v.fullUI})
        }


        // Create a single elevation source here
        // ....


        this.maps = []
        for (const mapName in this.UINode.mapTypesKV) {
            const mapID = this.UINode.mapTypesKV[mapName]
            this.maps[mapID] = {
                group: new Group(),
                sourceDef:this.UINode.mapSources[mapID],

            }
            GlobalScene.add(this.maps[mapID].group)
        }

        this.deferLoad = v.deferLoad;
        this.loadMap(local.mapType, (this.deferLoad !== undefined) ? this.deferLoad:false)
    }

    // a single point for map33 to get the URL of the map tiles

    mapURLDirect(z, x, y) {
        // get the mapSource for the current mapType
        const sourceDef = this.UINode.mapSources[local.mapType];

        // if no layers, then don't pass any layers into the mapURL function
        if (sourceDef.layers === undefined) {
            return sourceDef.mapURL(z, x,y)
        }

        const layerName = this.UINode.layer;
        const layerDef  = sourceDef.layers[layerName];
        assert(layerDef !== undefined, "CNodeTerrain: layer def for " + layerName + " not found in sourceDef")
        // run it bound to this, so we can access the terrain node
        return sourceDef.mapURL.bind(this)(z, x,y, layerName, layerDef.type)
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

        console.log("CNodeTerrain: disposing of this.maps")
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

    unloadMap(mapID) {
        if (this.maps[mapID].map !== undefined) {
            this.maps[mapID].map.clean()
            this.maps[mapID].map = undefined
        }
        // we are just unloading it, so the group remains
        // might be better to not create all the groups at the start
        // GlobalScene.remove(this.maps[mapID].group)
        // this.maps[mapID].group = undefined;
    }

    loadMap(id, deferLoad) {
        // TODO - More graceful handling of errors
        // currently it seems to never load another map if we get errors
        // maybe the global loadingTerrain should be set to false, eventually, if loading fails

        console.log("CNodeTerraina: loadMap, expecting  this.maps")

        assert(Object.keys(this.maps).length > 0, "CNodeTerrain: no maps found")
        assert(this.maps[id] !== undefined, "CNodeTerrain: map type " + id + " not found")

        const mapDef = this.maps[id].sourceDef;
        if (mapDef.mapping === 4326) {
            this.mapProjection = new CTileMappingGoogleCRS84Quad()
        } else {
            this.mapProjection = new CTileMappingGoogleMapsCompatible();
        }

        // we do a single elevation map for all the maps
        // they will use this to get the elevation for the meshes via lat/lon
        // so the elevation map can use a different coordinate system to the textured geometry map
        if (this.elevationMap === undefined) {
            this.elevationMap = new Map33(this.maps[id].group, this, this.position, {
                nTiles: this.nTiles,
                zoom: this.zoom,
                tileSize: this.tileSize,
                tileSegments: this.tileSegments,
                zScale: 1,
                radius: this.radius,
                loadedCallback: ()=> {
                    console.log("CNodeTerrain: elevation map loaded")
                    this.recalculate();
                },
                deferLoad: deferLoad,
                mapURL: this.mapURLDirect.bind(this),
                mapProjection: new CTileMappingGoogleMapsCompatible(),
                elOnly: true,
            })
        }


        // make the correct group visible
        for (const mapID in this.maps) this.maps[mapID].group.visible = (mapID === id);

        // check to see if the map has already been loaded
        // and if so we do nothing (other than the visibility setting)
        if (this.maps[id].map === undefined) {
            Globals.loadingTerrain = true;
            console.log("CNodeTerrain: loading map "+id+" deferLoad = "+deferLoad)
            this.maps[id].map = new Map33(this.maps[id].group, this, this.position, {
                nTiles: this.nTiles,
                zoom: this.zoom,
                tileSize: this.tileSize,
                tileSegments: this.tileSegments,   // this can go up to 256, with no NETWORK bandwidth.
                zScale: 1,
                radius: this.radius,
                elevationMap: this.elevationMap,
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

        if (this.maps[local.mapType].map === undefined) {
            console.warn("CNodeTerrain: map is undefined, called recalculate while still loading - ignoring")
            return;
        }

        console.log("recalculating terrain")
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
        assert(this.maps[local.mapType].map !== undefined, "CNodeTerrain: map is undefined")
        this.maps[local.mapType].map.recalculateCurveMap(radius, true)

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
        // We use the terrain map to get the elevation
        // we use LL (Lat and Lon) to get the data from the terrain maps
        // using LL ensure the results are consistent with the display of the map
        // even if the map is distorted slightly in latitude dud to non-linear scaling
        // it's also WAY faster than using raycasting

        const LLA = EUSToLLA(A)
        // elevation is the height above the wgs84 sphere
        let elevation = 0; // 0 if map not loaded
        if (this.maps[local.mapType].map !== undefined)
            elevation = this.maps[local.mapType].map.getElevationInterpolated(LLA.x, LLA.y)

        // then we scale a vector from the center of the earth to the point
        // so that its length is the radius of the earth plus the elevation
        // then the end of this vector (added to the center) is the point on the terrain
        const earthCenterENU = V3(0,-wgs84.RADIUS,0)
        const centerToA = A.clone().sub(earthCenterENU)
        const scale = (wgs84.RADIUS + elevation) / centerToA.length()
        return earthCenterENU.add(centerToA.multiplyScalar(scale))
    }
}



