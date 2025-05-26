// loader object for a
import {CNode} from "./CNode";
import {Map33, CMapTextureSource, ElevationMap} from '../js/map33/map33.js'
import {pointAbove, propagateLayerMaskObject} from "../threeExt";
import {cos, radians} from "../utils";
import {Globals, guiMenus, NodeMan, Sit} from "../Globals";
import {EUSToLLA, RLLAToECEFV_Sphere, wgs84} from "../LLA-ECEF-ENU";
import {Group, Raycaster} from "three";

// note for map33.js to not give errors, had to  add
// const process = require('process');
// to path.js
import {GlobalScene} from "../LocalFrame";
import {CNodeSwitch} from "./CNodeSwitch";
import {V3} from "../threeUtils";
import {assert} from "../assert";
import {isLocal, SITREC_APP, SITREC_SERVER} from "../configUtils";
import {configParams} from "../login";
import {CTileMappingGoogleCRS84Quad, CTileMappingGoogleMapsCompatible} from "../WMSUtils";
import {EventManager} from "../CEventManager";

const terrainGUIColor = "#c0ffc0";

let local = {}

export class CNodeTerrainUI extends CNode {
    constructor(v) {
        super(v);

       //this.debugLog = true;

        this.adjustable = v.adjustable ?? true;
        //
        // this.lat = 40;
        // this.lon = -110;
        // this.zoom = 10;
        // this.nTiles = 4;


        // terrain UI should always be called with the initial terrain node
        // even though it might make a new one later
        // this is a bit backwards
        if (v.terrain) {
            this.terrainNode = NodeMan.get(v.terrain);
            this.lat = this.terrainNode.lat;
            this.lon = this.terrainNode.lon;
            this.zoom = this.terrainNode.zoom;
            this.nTiles = this.terrainNode.nTiles;
            this.elevationScale = this.terrainNode.elevationScale;
        } else {
            assert(0, "CNodeTerrainUI: no terrain node specified, addTerrain is deprecated")
            this.gui.add(this, "addTerrain")
        }


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
                    return SITREC_APP + "data/images/grey-256x256.png?v=1";
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
                        return SITREC_APP + "data/images/colour_bars_srgb-255-128-64.png?v=1";
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
        this.mapTypeMenu = this.gui.add(local, "mapType", this.mapTypesKV).listen().name("Map Type")
            .tooltip("Map type for terrain textures (seperate from elevation data)")

//////////////////////////////////////////////////////////////////////////////////////////
        // same for elevation sources
        if (configParams.customElevationSources !== undefined) {
            this.elevationSources = configParams.customElevationSources;
        }
        else {
            this.elevationSources = {};
        }

        this.elevationSources = {
            ...this.elevationSources,
            // and some defaults
            Flat: {
                name: "Flat",
                url: "",
                maxZoom: 14,
                minZoom: 0,
                tileSize: 256,
                attribution: "",
            },
        }
        // and the KV pair for the GUI
        this.elevationTypesKV = {}
        for (const elevationType in this.elevationSources) {
            const elevationDef = this.elevationSources[elevationType]
            this.elevationTypesKV[elevationDef.name] = elevationType
        }
        // set the type to the first one to the
//        local.elevationType = Object.keys(this.elevationTypesKV)[0]
        local.elevationType = Object.keys(this.elevationSources)[0]
        // add the menu
        this.elevationTypeMenu = this.gui.add(local, "elevationType", this.elevationTypesKV).listen().name("Elevation Type")
            .tooltip("Elevation data source for terrain height data")

        this.elevationTypeMenu.onChange( v => {

            // elevation map has changed, so kill the old one
            log("Elevation type changed to " + v+ " so unloading the elevation map")
            this.terrainNode.elevationMap.clean()
            this.terrainNode.elevationMap = undefined;


            // bit brute force, but just unload and reload the terrain
            this.terrainNode.unloadMap(local.mapType);

            // for now, just reload the terrain
            // which will reload the elevation map (as it's null)
            // TODO: split loading of elevation and terrain maps
         //  this.setMapType(local.mapType).then(() => {
                this.terrainNode.loadMap(local.mapType)
         //   })
        })



/////////////////////////////////////////////////////


        this.oldLat = this.lat;
        this.oldLon = this.lon;
        this.oldZoom = this.zoom;
        this.oldNTiles = this.nTiles;
        this.oldElevationScale = this.elevationScale;


        this.mapTypeMenu.onChange( v => {

            // do this async, as we might need to wait for the capabilities to be loaded
            this.setMapType(v).then(() => { ;
                this.terrainNode.loadMap(v)
            })
        })

        this.debugElevationGrid = false;

        if (v.fullUI) {

            this.latController = this.gui.add(this, "lat", -85, 85, .001).onChange(v => {
                this.flagForRecalculation()
                this.startLoading = false;
            }).onFinishChange(v => {
                this.startLoading = true
            }).tooltip("Latitude of the center of the terrain")


            this.lonController = this.gui.add(this, "lon", -180, 180, .001).onChange(v => {
                this.flagForRecalculation()
                this.startLoading = false;
            }).onFinishChange(v => {
                this.startLoading = true
            }).tooltip("Longitude of the center of the terrain")

            this.zoomController = this.gui.add(this, "zoom", 2, 15, 1).onChange(v => {
                this.flagForRecalculation()
                this.startLoading = false;
            }).onFinishChange(v => {
                this.startLoading = true
            }).tooltip("Zoom level of the terrain. 2 is the whole world, 15 is few city blocks")

            this.nTilesController = this.gui.add(this, "nTiles", 1, 8, 1).onChange(v => {
                this.flagForRecalculation()
                this.startLoading = false;
            }).onFinishChange(v => {
                this.startLoading = true
            }).tooltip("Number of tiles in the terrain. More tiles means more detail, but slower loading. (NxN)")




            // adds a button to refresh the terrain
            this.gui.add(this, "doRefresh").name("Refresh")
                .tooltip("Refresh the terrain with the current settings. Use for network glitches that might have caused a failed load")

            // a toggle to show or hide the debug elevation grid

            this.gui.add(this, "debugElevationGrid").name("Debug Grids").onChange(v => {
                this.terrainNode.refreshDebugGrids();
            }).tooltip("Show a grid of ground textures (Green) and elevation data (Blue)")


            this.zoomToTrackSwitchObject = new CNodeSwitch({
                id: "zoomToTrack", kind: "Switch",
                inputs: {"-": "null"}, desc: "Zoom to track",
                tip: "Zoom to the extents of the selected track (for the duration of the Sitch frames)",
            }, this.gui).onChange(track => {
                this.zoomToTrack(track)
            })
        }

        this.elevationScaleController = this.gui.add(this, "elevationScale", 0, 10, 0.1).onChange(v => {
            this.flagForRecalculation()
        }).onFinishChange(v => {
            this.startLoading = true
        }).elastic(10,100)
            .tooltip("Scale factor for the elevation data. 1 is normal, 0.5 is half height, 2 is double height")


    }


    async setMapType(v)
    {
        const mapType = v;
        const mapDef = this.mapSources[mapType];

        assert(mapDef !== undefined, "CNodeTerrainUI: mapDef for " + mapType + " not found in mapSources");

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
        this.layersMenu = this.gui.add(this, "layer", this.localLayers).listen().name("Layer")
            .tooltip("Layer for the current map type's terrain textures")

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
        assert(trackNode.getLLAExtents !== undefined, "Track does not have getLLAExtents")
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

        const maxZoom = 15;
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
        this.log("Refreshing terrain")
        assert(this.terrainNode.maps[local.mapType].map !== undefined, "Terrain map not defined when trying the set startLoading")
        this.startLoading = true;
        this.flagForRecalculation();
    }

    flagForRecalculation() {
        this.recalculateSoon = true;
    }

    update() {
        if (this.recalculateSoon) {
            console.log("Recalculating terrain as recalculatedSoon is true. startLoading=" + this.startLoading)

            // something of a patch with terrain, as it's often treated as a global
            // by other nodes (like the track node, when using accurate terrain for KML polygons)
            // so we recalculate it first, and then recalculate all the other nodes
            this.recalculate();

            this.recalculateSoon = false;
        }

        // we need to wait for this.terrainNode.maps[local.mapType].map to be defined
        // because it's set async in setMapType
        // setMapType can be waiting for the capabilities to be loaded
        if (this.startLoading && this.terrainNode.maps[local.mapType].map !== undefined) {
            console.log("Starting to load terrain as startLoading is true, recalulateSoon=" + this.recalculateSoon)
            this.startLoading = false;
            assert(this.terrainNode.maps[local.mapType].map !== undefined, "Terrain map not defined")
            this.terrainNode.maps[local.mapType].map.startLoadingTiles();
            assert(this.terrainNode.elevationMap !== undefined, "Elevation map not defined")
            this.terrainNode.elevationMap.startLoadingTiles();
        }
    }

    recalculate() {
        // if the values have changed, then we need to make a new terrain node
        if (this.lat === this.oldLat && this.lon === this.oldLon && this.zoom === this.oldZoom
            && this.nTiles === this.oldNTiles
            && !this.refresh) {

            if (this.elevationScale === this.oldElevationScale)
                return;

            // // so JUST the elevation scale has changed, so we can just update the elevation map
            // this.terrainNode.elevationMap.elevationScale = this.elevationScale;
            // // and recalculate the curves for the tiles in the current map
            // this.maps[local.mapType].map.recalculateCurveMap(this.radius, true)

        }
        this.oldLat = this.lat;
        this.oldLon = this.lon;
        this.oldZoom = this.zoom;
        this.oldNTiles = this.nTiles;
        this.oldElevationScale = this.elevationScale;
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
                elevationScale: this.elevationScale,
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

     //   this.debugLog = true;

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
        this.elevationScale = v.elevationScale ?? 1;
        this.tileSegments = v.tileSegments ?? 100;


        if (Globals.quickTerrain) {
            this.nTiles = 1;
        }

        // Important: The tile size calculation assumes a SPHERICAL Earth, not ellipsoid
        // and it uses the WGS84 circumference, radius 6378137, -> 40075016
        // rounded slightly to 40075000
        // this circumference is for the tile APIs, and does NOT change with radius
        let circumference = 40075000*cos(radians(this.lat));
        this.tileSize = circumference/Math.pow(2,this.zoom) // tileSize is the width and height of the tile in meters



        // the origin is in the middle of the first tile
        // so we need to find the latitude and longitude of this tile center
        // this is all a bit dodgy


        if (Sit.legacyOrigin) {
            // legacy for some old sitches
            // that use world coordinates based on this origin
            // like the splines in Agua
            // these all use GoogleMapsCompatible projection
            const mapProjection = new CTileMappingGoogleMapsCompatible();
            var tilex = Math.floor(mapProjection.lon2Tile(this.position[1], this.zoom)) + 0.5 // this is probably correct
            var tiley = Math.floor(mapProjection.lat2Tile(this.position[0], this.zoom)) + 0.5 // this might be a bit off, as not linear?
            var lon0 = mapProjection.tile2Lon(tilex, this.zoom)
            var lat0 = mapProjection.tile2Lat(tiley, this.zoom)
            console.log("LL Tile" + tilex + "," + tiley + " = (Lat,Lon)" + lat0 + "," + lon0)

            // we need to adjust the LL origin to match the 3D map
            // but only if it's not already set
            if (Sit.lat === undefined) {
                Sit.lat = lat0
                Sit.lon = lon0
            }

        } else {


            // we need to adjust the LL origin to match the 3D map
            // but only if it's not already set
            if (Sit.lat === undefined) {
                // Sit.lat = lat0
                // Sit.lon = lon0
                Sit.lat = this.lat
                Sit.lon = this.lon
            }
        }

        local.mapType = v.mapType ?? configParams.defaultMapType ?? "mapbox";

        // always create a terrainUI, just with limited options for the legacy sitches
        // but for now, everything is include (will need to flag "everything" in custom)
        this.UINode = v.UINode ?? null;
        if (!this.UINode) {
            this.UINode = new CNodeTerrainUI({id: "terrainUI", terrain: v.id, fullUI: v.fullUI})
        }

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

        // the newly created UI node will not have the mapType set
        // so we need to set it here. It can be an async process if we need to load capabilities
        // so we need to wait for it to finish before the map is loaded
        this.UINode.setMapType(local.mapType).then(() => {
            this.log("Calling loadMap from constructor with local.mapType=" + local.mapType)
            this.loadMap(local.mapType, (this.deferLoad !== undefined) ? this.deferLoad : false)
        })
    }

    refreshDebugGrids() {
        this.elevationMap.refreshDebugGrid("#4040FF"); // sky blue for elevation

        // we might have multiple maps, so remove any existing debug grids
        for (const mapID in this.maps) {
            if (this.maps[mapID].map !== undefined) {
                this.maps[mapID].map.removeDebugGrid();
            }
        }
        this.maps[local.mapType].map.refreshDebugGrid("#00ff00"); // green for ground
    }

    // a single point for map33 to get the URL of the map tiles

    mapURLDirect(z, x, y) {
        // get the mapSource for the current mapType
        const sourceDef = this.UINode.mapSources[local.mapType];

        // if no layers, then don't pass any layers into the mapURL function
        if (sourceDef.layers === undefined) {
            return sourceDef.mapURL.bind(this)(z, x,y)
        }

        const layerName = this.UINode.layer;
        const layerDef  = sourceDef.layers[layerName];
        assert(layerDef !== undefined, "CNodeTerrain: layer def for " + layerName + " not found in sourceDef")
        // run it bound to this, so we can access the terrain node
        return sourceDef.mapURL.bind(this)(z, x, y, layerName, layerDef.type)
    }


    elevationURLDirect(z, x, y) {
        // get the elevation source for the current type
        const sourceDef = this.UINode.elevationSources[local.elevationType];

        if (!sourceDef.mapURL) {
            if (sourceDef.url === "" || sourceDef.url === undefined) {
                return null;
            }
            return sourceDef.url + "/" + z + "/" + x + "/" + y + ".png";
        }

        // no layers yet, so just call the mapURL function with nulls
        return sourceDef.mapURL.bind(this)(z, x, y, null, null)

    }



    serialize() {
        assert(0, "CNodeTerrain: serialize not implemented, see getCustomSitchString() 'modify the terrain model directly' code")
//         let out = super.serialize();
//         out = {
//             ...out, ...{
//                 lat: this.lat,
//                 lon: this.lon,
//                 zoom: this.zoom,
//                 nTiles: this.nTiles,
// //                mapType: this.mapType,
//             }
//         }
//         // when serializing, we don't want to include optional parameters that were
//         // not there in the original setup data
//         if (this.deferLoad !== undefined) {
//             out.deferLoad = this.deferLoad
//         }
//
//         if (this.in.flattening !== undefined) {
//             out.flattening = this.in.flattening.v0
//         }
//
//         return out;
    }

    dispose() {
        // first abort any pending request

        this.log("CNodeTerrain: disposing of this.maps")
        for (const mapID in this.maps) {
            if (this.maps[mapID].map !== undefined) {
                this.maps[mapID].map.clean()
                this.maps[mapID].map = undefined
            }
            GlobalScene.remove(this.maps[mapID].group)
            this.maps[mapID].group = undefined;
        }

        if (this.elevationMap !== undefined) {
            this.elevationMap.clean()
            this.log("Setting ElevatioMap to undefined")
            this.elevationMap = undefined;
        }

        super.dispose();
    }

    unloadMap(mapID) {
        this.log("CNodeTerrain: unloading map "+mapID)
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

        this.log("CNodeTerrain: loadMap, id = " + id + " deferLoad = " + deferLoad)

        assert(Object.keys(this.maps).length > 0, "CNodeTerrain: no maps found")
        assert(this.maps[id] !== undefined, "CNodeTerrain: map type " + id + " not found")

        let elevationNTiles = this.nTiles;




        const mapDef = this.maps[id].sourceDef;
        if (mapDef.mapping === 4326) {
            this.mapProjectionTextures = new CTileMappingGoogleCRS84Quad();
        } else {
            this.mapProjectionTextures = new CTileMappingGoogleMapsCompatible();

        }

        const elevationDef = this.UINode.elevationSources[local.elevationType];
        if (elevationDef.mapping === 4326) {
            this.mapProjectionElevation = new CTileMappingGoogleCRS84Quad();
        } else {
            this.mapProjectionElevation = new CTileMappingGoogleMapsCompatible();
        }

        // if they are different projections, add two tiles to the elevation map (adding a border of one tile)
        if (mapDef.mapping !== elevationDef.mapping) {
            elevationNTiles += 2;
        }


        // if we have an elevation map, then we need to check if it's the right size
        // if not, then we need to unload it
        // this can happen if we change the number of tiles due to the projection
        if (this.elevationMap !== undefined) {
            if (elevationNTiles !== this.elevationMap.nTiles) {
                log("CNodeTerrain: elevation map nTiles has changed, so unloading the elevation map")
                this.elevationMap.clean()
                this.elevationMap = undefined;
            }
        }

        // we do a single elevation map for all the maps
        // they will use this to get the elevation for the meshes via lat/lon
        // so the elevation map can use a different coordinate system to the textured geometry map
        if (this.elevationMap === undefined) {
            this.log("CNodeTerrain: creating elevation map")
            this.elevationMap = new ElevationMap(this, this.position, {
                nTiles: elevationNTiles,  // +2 to ensure we cover the image map areas when using different projections
                zoom: this.zoom,
                tileSize: this.tileSize,
                tileSegments: this.tileSegments,
                zScale: this.elevationScale,
                radius: this.radius,
                loadedCallback: () => {
                    this.log("CNodeTerrain: elevation map loaded")
                    this.recalculate();
                    this.refreshDebugGrids()

                    // we can't add outputs to the terrain node
                    // as it gets destroyed and recreated
                    // and other nodes access it via the NodeMan, not via inputs/outputs
                    // so to ensure collisions are recalculated, we need to do it here
                    // a bit brute force, but it's not that often
                    //NodeMan.recalculateAllRootFirst(false); // false means don't recalculate the terrain again

                    EventManager.dispatchEvent("terrainLoaded", this)
                    EventManager.dispatchEvent("elevationChanged", this)


                },
                deferLoad: deferLoad,
                //  mapURL: this.mapURLDirect.bind(this),
                elevationULR: this.elevationURLDirect.bind(this),

                // //mapProjection: new CTileMappingGoogleCRS84Quad(),
                // mapProjection: new CTileMappingGoogleMapsCompatible(), // works with AWS

                mapProjection: this.mapProjectionElevation,

                elOnly: true,
            })
        }


        // make the correct group visible
        for (const mapID in this.maps) {
            assert(this.maps[mapID].group !== undefined, "CNodeTerrain: map group is undefined")
            this.maps[mapID].group.visible = (mapID === id);
        }
        // check to see if the map has already been loaded
        // and if so we do nothing (other than the visibility setting)
        if (this.maps[id].map === undefined) {
            Globals.loadingTerrain = true;
//            console.log("CNodeTerrain: loading map "+id+" deferLoad = "+deferLoad)
            this.maps[id].map = new Map33(this.maps[id].group, this, this.position, {
                nTiles: this.nTiles,
                zoom: this.zoom,
                tileSize: this.tileSize,
                tileSegments: this.tileSegments,   // this can go up to 256, with no NETWORK bandwidth.
                zScale: 1,
                radius: this.radius,
                mapProjection: this.mapProjectionTextures,
                elevationMap: this.elevationMap,
                loadedCallback:  ()=> {
                    this.log("CNodeTerrain: id = "+id+" map loaded callback")

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
//                    console.log("CNodeTerrain: id = "+id+" map loaded");
                    propagateLayerMaskObject(this.maps[id].group)

                    // call the terrainLoadedCallback on any node that has it
                    NodeMan.iterate( (id, n) => {
                        if (n.terrainLoadedCallback !== undefined) {
                            n.terrainLoadedCallback()
                        }
                    })

                    Globals.loadingTerrain = false;

                    this.refreshDebugGrids()

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

        if (this.elevationMap === undefined) {
            console.warn("CNodeTerrain: elevation map is undefined, called recalculate while still loading - ignoring")
            return;
        }

        this.log("CNodeTerrain: recalculate")

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
        this.maps[local.mapType].map.recalculateCurveMap(this.radius, true)

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

    getPointBelow(A, agl = 0, accurate = false) {
        // given a point in EUS, return the point on the terrain (or agl meters above it, if not zero)
        // We use the terrain map to get the elevation
        // we use LL (Lat and Lon) to get the data from the terrain maps
        // using LL ensure the results are consistent with the display of the map
        // even if the map is distorted slightly in latitude dud to non-linear scaling
        // it's also WAY faster than using raycasting

        // however, we can use raycasting if we want more accurate results
        // that match the actual polygons
        // this is useful for things like building that sit on the terrain
        if (accurate) {
            // we are going to use a ray from 100000m above the point to
            const B = pointAbove(A, 100000)
            const BtoA = A.clone().sub(B).normalize()

            const rayCaster = new Raycaster(B, BtoA);
            const ground = this.getClosestIntersect(rayCaster);
            if (ground !== null) {
                let groundPoint = ground.point;
                groundPoint.add(BtoA.multiplyScalar(-agl))
                return groundPoint;
            }
        }


        const LLA = EUSToLLA(A)
        // elevation is the height above the wgs84 sphere
        let elevation = 0; // 0 if map not loaded
        if (this.maps[local.mapType].map !== undefined)
            elevation = this.maps[local.mapType].map.getElevationInterpolated(LLA.x, LLA.y)

        if (elevation < 0 ) {
            // if the elevation is negative, then we assume it's below sea level
            // so we set it to zero
            elevation = 0;
        }


        // then we scale a vector from the center of the earth to the point
        // so that its length is the radius of the earth plus the elevation
        // then the end of this vector (added to the center) is the point on the terrain
        const earthCenterENU = V3(0,-wgs84.RADIUS,0)
        const centerToA = A.clone().sub(earthCenterENU)
        const scale = (wgs84.RADIUS + elevation + agl) / centerToA.length()
        return earthCenterENU.add(centerToA.multiplyScalar(scale))
    }
}



