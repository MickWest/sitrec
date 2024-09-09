// given a urlBase like: https://geoint.nrlssc.org/nrltileserver/wms/category/Imagery?
// and name,


class CTileMapping {

}

class CTileMappingGoogleCRS84Quad extends CTileMapping {
    constructor() {
        super();
        this.name = "GoogleCRS84Quad";
    }
}

class CTileMappingGoogleMapsCompatible extends CTileMapping {
    constructor() {
        super();
        this.name = "GoogleMapsCompatible";
    }
}




// convert a tile x position to longitude
// x is the horizontal tile position
// it can be floating point which indicates a position inside the tile
// if no fraction, then it's the left edge of the tile. If 0.5, then the middle.
// 1.0 the right edge, coincident with the next tile
export function getLeftLongitude(x, z) {
    // Calculate the number of horizontal tiles at zoom level z
    let numTiles = Math.pow(2, z);

    // Calculate the left longitude (west edge)
    let leftLongitude = (x / numTiles) * 360 - 180;
    return leftLongitude;
}

// convert a tile y position to latitude
export function getNorthLatitude(y, z) {
    // Calculate the number of vertical tiles at zoom level z
    let numTiles = Math.pow(2, z);

    // Calculate the latitude of the northern edge of the tile
    let latNorthRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / numTiles)));
    let latNorth = latNorthRad * 180 / Math.PI;
    return latNorth;
}

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