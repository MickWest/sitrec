// given a urlBase like: https://geoint.nrlssc.org/nrltileserver/wms/category/Imagery?
// and name,


class CTileMapping {

// Latitude is common to both GoogleMapsCompatible and GoogleCRS84Quad
// convert a tile x position to longitude
// x is the horizontal tile position
// it can be floating point which indicates a position inside the tile
// if no fraction, then it's the left edge of the tile. If 0.5, then the middle.
// 1.0 the right edge, coincident with the next tile
    getLeftLongitude(x, z) {
        // Calculate the number of horizontal tiles at zoom level z
        let numTiles = Math.pow(2, z);

        // Calculate the left longitude (west edge)
        let leftLongitude = (x / numTiles) * 360 - 180;
        return leftLongitude;
    }

    lon2Tile (lon, zoom) {
        return (lon + 180) / 360 * Math.pow(2, zoom)
    }


    tile2Lon(x, z) {
        return x / Math.pow(2, z) * 360 - 180;
    }


}

// GoogleMapsCompatible is the standard Google Maps tile format
// used by Google Maps, Google Earth, and other Google mapping products.
// Maptiler, OpenStreetMap, Mapbox, and others also use this format.
// It's a Web Mercator projection, with the origin at the top-left corner.
// The x and y values are reversed from the TMS standard.
// The zoom level is the same as the TMS standard.
// The tile size is 256x256 pixels.
// Use EPSG:3857 for the projection.
class CTileMappingGoogleMapsCompatible extends CTileMapping {
    constructor() {
        super();
        this.name = "GoogleMapsCompatible";
    }

// convert a tile y position to latitude
    getNorthLatitude(y, z) {
        // Calculate the number of vertical tiles at zoom level z
        let numTiles = Math.pow(2, z);

        // Calculate the latitude of the northern edge of the tile
        let latNorthRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / numTiles)));
        let latNorth = latNorthRad * 180 / Math.PI;
        return latNorth;
    }


    lat2Tile (lat, zoom) {
        return (
            (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)
        )
    }

    tile2Lat(y, z) {
        const d2r = Math.PI / 180
        const r2d = 180 / Math.PI;
        var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
        return r2d * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    }

}

////////////////////////////////////////////////////////////////////////////
// GoogleCRS84Quad is equirectangular, EPSG:4326
// so latitude is linear;y mapped to y
// x is the horizontal tile position
// it can be floating point which indicates a position inside the tile
// if no fraction, then it's the left edge of the tile. If 0.5, then the middle.
// 1.0 the right edge, coincident with the next tile
// Note a significant difference is that GoogleMapsCompatible has a SQUARE grid
// of tiles, while GoogleCRS84Quad has a RECTANGULAR grid of tiles.
// i.e. the number of vertical tiles is half the number of horizontal tiles
// at each zoom level.
// so calculations of latitude essentially use half the zoom level

class CTileMappingGoogleCRS84Quad extends CTileMapping {
    constructor() {
        super();
        this.name = "GoogleCRS84Quad";
    }


// convert a tile y position to latitude
    // GoogleCRS84Quad is equirectangular, EPSG:4326
    // so latitude is linear;y mapped to y
    getNorthLatitude(y, zoom) {
        // Calculate the number of vertical tiles at zoom level z
        let numTiles = Math.pow(2, zoom-1);
        // Calculate the latitude of the northern edge of the tile
        return 90 - ( y / numTiles) * 180;

    }

    // simple linear mapping of y to latitude
    // y of 0 is 90 (north pole), y numTiles is -90 (south pole)
    tile2Lat(y, zoom) {
        // it's the same as getNorthLatitude
        return this.getNorthLatitude(y, zoom);
    }

    // simple linear mapping of latitude to y
    // latitude of 90 shoudl return 0
    lat2Tile(lat, zoom) {
        // linear mapping of latitude to y
        let numTiles = Math.pow(2, zoom-1);
        return (1 - (lat + 90) / 180) * numTiles;
    }



    // getMapURLFromTile(urlBase, name, z, x, y) {
    //     return `${urlBase}/1.0.0/${name}/default/GoogleCRS84Quad/${z}/${y}/${x}.jpg`
    // }

}




// temp for switching between the two
// export const mapProjection = new CTileMappingGoogleCRS84Quad();
export const mapProjection = new CTileMappingGoogleMapsCompatible();

export function wmsGetMapURLFromTile(urlBase, name, z, x, y) {

    // convert z,x,y to lat/lon
    const lat0 = getNorthLatitude(y, z);
    const lon0 = getLeftLongitude(x, z);
    const lat1 = getNorthLatitude(y + 1, z);
    const lon1 = getLeftLongitude(x + 1, z);

    const url =
        "https://geoint.nrlssc.org/nrltileserver/wms/category/Imagery?" +
        "SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1" +
        "&LAYERS=" + name +
        "&FORMAT=image/jpeg" +
        "&CRS=EPSG:4326" +
        `&BBOX=${lon0},${lat1},${lon1},${lat0}` +
        "&WIDTH=256&HEIGHT=256" +
        "&STYLES=";

    console.log("URL = " + url);
    return url;

}

export function wmtsGetMapURLFromTile(urlBase, name, z, x, y) {

    return `${urlBase}/1.0.0/${name}/default/GoogleCRS84Quad/${z}/${y}/${x}.jpg`
}