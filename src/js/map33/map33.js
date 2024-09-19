import {getPixels} from '../get-pixels-mick.js'
import {Mesh, MeshNormalMaterial, PlaneGeometry, Vector3,} from "three";
import QuadTextureMaterial from './material/QuadTextureMaterial'
import {SITREC_SERVER} from "../../../config";
import {LLAToEUS, wgs84} from "../../LLA-ECEF-ENU";
import {assert} from "../../assert.js";
import {DebugArrowAB, removeDebugArrow} from "../../threeExt";
import {GlobalScene} from "../../LocalFrame";
// MICK: map33 uses Z up, so coordinates are modified in a couple of places from the original source

const tileMaterial = new MeshNormalMaterial({wireframe: true})

class Utils {

  // Calculate the world position of a tile.
  // these are used for positioning the tiles in the scene
  // each tile is a mesh, and the mesh is positioned in the scene
  // the actual 3D points will be realtive to this.
  static tile2position(z, x, y, center, tileSize) {
    const result = {
      x: (x - center.x) * tileSize,
      y: (-y + center.y) * tileSize,
      z: 0
    }
    return result
  }

  static position2tile(z, x, y, center, tileSize) {
    const centerPosition = Utils.tile2position(z, center.x, center.y, center, tileSize)
    console.log(centerPosition)
    const deltaX = Math.round((x - centerPosition.x) / tileSize)
    const deltaY = Math.round(-(y - centerPosition.y) / tileSize)
    return {x: deltaX + center.x, y: deltaY + center.y, z}
  }
}

class Tile {
  constructor(map, z, x, y, size) {
    // check values are within range
    assert(z >= 0 && z <= 16, 'z is out of range, z='+z)
 //   assert(x >= 0 && x < Math.pow(2, z), 'x is out of range, x='+x)
    assert(y >= 0 && y < Math.pow(2, z), 'y is out of range, y='+y)

    this.map = map
    this.z = z
    this.x = x
    this.y = y
    this.size = size || this.map.options.tileSize
 //   this.elevationURLString = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium"
    this.shape = null
    this.elevation = null
    this.seamX = false
    this.seamY = false
  }


  // The "key" is portion of the URL that identifies the tile
  // in the form of "z/x/y"
  // where z is the zoom level, and x and y are the horizontal
  // (E->W) and vertical (N->S) tile positions
  // it's used here as a key to the tileCache
  key() {
    return `${this.z}/${this.x}/${this.y}`
  }
  // Neighbouring tiles are used to resolve seams between tiles
  keyNeighX() {
    return `${this.z}/${this.x + 1}/${this.y}`
  }
  keyNeighY() {
    return `${this.z}/${this.x}/${this.y + 1}`
  }

  elevationURL() {
    //if (this.elevationURLString === null || this.elevationURLString==="") return null
    //return `${this.elevationURLString}/${this.z}/${this.x}/${this.y}.png`

    return this.map.terrainNode.elevationURLDirect(this.z, this.x, this.y)

  }

  mapUrl() {
    return this.map.terrainNode.mapURLDirect(this.z, this.x, this.y)
  }

  // takes a 2D array of pixel RBGA and computes the elevation
  // note the A value is not used, as the source data is a PNG with no alpha.
  computeElevation(pixels) {
    this.shape = pixels.shape
    const elevation = new Float32Array(pixels.shape[0] * pixels.shape[1])
    for (let i = 0; i < pixels.shape[0]; i++) {
      for (let j = 0; j < pixels.shape[1]; j++) {
        const ij = i + pixels.shape[0] * j
        const rgba = ij * 4
        elevation[ij] =
          pixels.data[rgba] * 256.0 +
          pixels.data[rgba + 1] +
          pixels.data[rgba + 2] / 256.0 -
          32768.0
      }
    }
    this.elevation = elevation
  }

  buildGeometry() {
    const geometry = new PlaneGeometry(
      this.size,
      this.size,
      this.map.options.tileSegments,
      this.map.options.tileSegments
    )

    this.geometry = geometry
  }



  removeDebugGeometry() {
    if (this.debugArrows !== undefined) {
        this.debugArrows.forEach(arrow => {
            removeDebugArrow(arrow)
        })
    }
    this.debugArrows = []
  }

  buildDebugGeometry() {
    // patch in a debug rectangle around the tile using arrows
    // this is useful for debugging the tile positions - especially elevation vs map
    // arrows are good as they are more visible than lines

    this.removeDebugGeometry()

    if (!this.map.terrainNode.UINode.debugElevationGrid) return;


    const xTile = this.x;
    const yTile = this.y;
    const zoomTile = this.z;


    console.log ("Building Debug Geometry for tile "+xTile+","+yTile+" at zoom "+zoomTile)
    console.log ("Constructor of this.map.options.mapProjection = "+this.map.options.mapProjection.constructor.name)
    console.log ("Constructor of this.map.options.mapProjection = "+this.map.options.mapProjection.constructor.name)


    // get LLA of the tile corners
    const latSW = this.map.options.mapProjection.getNorthLatitude(yTile, zoomTile);
    const lonSW = this.map.options.mapProjection.getLeftLongitude(xTile, zoomTile);
    const latNW = this.map.options.mapProjection.getNorthLatitude(yTile + 1, zoomTile);
    const lonNW = this.map.options.mapProjection.getLeftLongitude(xTile, zoomTile);
    const latSE = this.map.options.mapProjection.getNorthLatitude(yTile, zoomTile);
    const lonSE = this.map.options.mapProjection.getLeftLongitude(xTile + 1, zoomTile);
    const latNE = this.map.options.mapProjection.getNorthLatitude(yTile + 1, zoomTile);
    const lonNE = this.map.options.mapProjection.getLeftLongitude(xTile + 1, zoomTile);

    // convert to EUS
    const alt = 10000;
    const vertexSW = LLAToEUS(latSW,lonSW,alt)
    const vertexNW = LLAToEUS(latNW,lonNW,alt)
    const vertexSE = LLAToEUS(latSE,lonSE,alt)
    const vertexNE = LLAToEUS(latNE,lonNE,alt)

    // use these four points to draw debug lines at 10000m above the tile
    //DebugArrowAB("UFO Ground V", jetPosition, groundVelocityEnd, "#00ff00", displayWindArrows, GlobalScene) // green = ground speed


    const id1 = "DebugTile"+(xTile*1000+yTile)+"_1"
    const id2 = "DebugTile"+(xTile*1000+yTile)+"_2"
    const id3 = "DebugTile"+(xTile*1000+yTile)+"_3"
    const id4 = "DebugTile"+(xTile*1000+yTile)+"_4"
    this.debugArrows.push(id1)
    this.debugArrows.push(id2)
    this.debugArrows.push(id3)
    this.debugArrows.push(id4)



    DebugArrowAB(id1, vertexSW, vertexNW, "#ff0000", true, GlobalScene) // red = north/south
    DebugArrowAB(id2, vertexSW, vertexSE, "#0000FF", true, GlobalScene) // blue = east/west
    DebugArrowAB(id3, vertexNW, vertexNE, "#0000FF", true, GlobalScene)
    DebugArrowAB(id4, vertexSE, vertexNE, "#ff0000", true, GlobalScene)



  }


  // recalculate the X,Y, Z values for all the verticles of a tile
  // at this point we are Z-up
  recalculateCurve(radius) {
    var geometry = this.geometry;
    if (this.mesh !== undefined){
      geometry = this.mesh.geometry;
      //    console.log("Recalculating Mesh Geometry"+geometry)
    } else {
      //    console.log("Recalculating First Geometry"+geometry)
    }

    assert(geometry !== undefined, 'Geometry not defined in map33.js')

    // we will be calculating the tile vertex positions in EUS
    // but they will be relative to the tileCenter
    //
    const tileCenter = this.mesh.position;

    // for a 100x100 mesh, that's 100 squares on a side
    // but an extra row and column of vertices
    // so 101x101 points = 10201 points
    //

    const nPosition = Math.sqrt(geometry.attributes.position.count) // size of side of mesh in points

    const xTile = this.x;
    const yTile = this.y;
    const zoomTile = this.z;


    for (let i = 0; i < geometry.attributes.position.count;i++) {

      const xIndex = i % nPosition
      const yIndex = Math.floor(i / nPosition)

      // calculate the fraction of the tile that the vertex is in
      const yTileFraction = yIndex / (nPosition - 1)
      const xTileFraction = xIndex / (nPosition - 1)

      // get that in world tile coordinates
      const xWorld = xTile + xTileFraction;
      const yWorld = yTile + yTileFraction;

      // convert that to lat/lon
      const lat = this.map.options.mapProjection.getNorthLatitude(yWorld, zoomTile);
      const lon = this.map.options.mapProjection.getLeftLongitude(xWorld, zoomTile);

      // get the elevation, independent of the display map coordinate system
      let elevation = this.map.getElevationInterpolated(lat, lon);

      // clamp to sea level to avoid z-fighting with ocean tiles
      if (elevation < 0 ) elevation = 0;

      // convert that to EUS
      const vertexESU = LLAToEUS(lat,lon,elevation)

      // subtract the center of the tile
      const vertex = vertexESU.sub(tileCenter)

      assert(!isNaN(vertex.x), 'vertex.x is NaN in map33.js i='+i)
      assert(!isNaN(vertex.y), 'vertex.y is NaN in map33.js')
      assert(!isNaN(vertex.z), 'vertex.z is NaN in map33.js')

      // set the vertex position in tile space
        geometry.attributes.position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    // Removed this as it's expensive. And seems not needed for just curve flattenog.
    geometry.computeVertexNormals()

    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()

    geometry.attributes.position.needsUpdate = true;
  }


  // returns the four children tiles of this tile
  // this is used to build the QuadTextureMaterial
  // and all we do is get the four URLs of the children's textures
  // and then combine them in
  children() {
    return [
      new Tile(this.map, this.z + 1, this.x * 2, this.y * 2),
      new Tile(this.map, this.z + 1, this.x * 2, this.y * 2 + 1),
      new Tile(this.map, this.z + 1, this.x * 2 + 1, this.y * 2),
      new Tile(this.map, this.z + 1, this.x * 2 + 1, this.y * 2 + 1),
    ]
  }

  // QuadTextureMaterial uses four textures from the children tiles
  // (which are not actually loaded, but we have the URLs)
  // there's a custom shader to combine them together
  //
  buildMaterial() {
    const urls = this.children().map(tile => tile.mapUrl())
    return QuadTextureMaterial(urls)
  }

  applyMaterial() {
    if (this.mapUrl(0,0,0) != null) {
      this.buildMaterial().then((material) => {
        this.mesh.material = material
      })
    }
  }

  buildMesh() {
    this.mesh = new Mesh(this.geometry, tileMaterial)
  }

  fetchElevationTile(signal) {
    const elevationURL = this.elevationURL()

    var url = SITREC_SERVER+"cachemaps.php?url="+encodeURIComponent(elevationURL)
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error('Aborted'));
        return;
      }
      if (this.map.elOnly) {

        if (elevationURL === null) {
          // no elevation URL, so we can't load the elevation
          // this would be either be in installs with no elevation data avaialble
          // or when the user has selected the "flat" option
          resolve(this);
          return;
        }

        getPixels(url, (err, pixels) => {
          if (err) console.error("fetchElevationTile() -> " + err)
          this.computeElevation(pixels)
          //this.applyMaterial()
          resolve(this)
        })
      } else {
        // if it's not elOnly, then we can immediately apply the material.
        // as elevation is handled later
        this.applyMaterial();
        resolve(this);
      }
    })
  }


  setPosition(center) {
    const position = Utils.tile2position(
        this.z,
        this.x,
        this.y,
      center,
      this.size
    )
    const correctPosition = new Vector3(position.x, position.z,-position.y) // MICK
    this.mesh.position.set(correctPosition.x, correctPosition.y,correctPosition.z) // MICK

    // we need to update the matrices, otherwise collision will not work until rendered
    // which can lead to odd asynchronous bugs where the last tiles loaded
    // don't have matrices set, and so act as holes, but this varies with loading order
    this.mesh.updateMatrix()
    this.mesh.updateMatrixWorld() //
  }

  resolveSeamY(neighbor) {
    const tPosition = this.mesh.geometry.attributes.position.count
    const nPosition = Math.sqrt(tPosition)
    const nPositionN = Math.sqrt(
      neighbor.mesh.geometry.attributes.position.count
    )
    if (nPosition !== nPositionN) {
      console.error("resolveSeamY only implemented for geometries of same size")
      return
    }

    // the positions are relative to the tile centers
    // so we need to adjust by the offset
    const tileCenter = this.mesh.position;
    const neighborCenter = neighbor.mesh.position;
    const offset = neighborCenter.clone().sub(tileCenter);

    for (let i = tPosition - nPosition; i < tPosition; i++) {
      // copy the entire position vector
        this.mesh.geometry.attributes.position.setXYZ(
            i,  // this is the index of the vertex in the mesh
            neighbor.mesh.geometry.attributes.position.getX(i - (tPosition - nPosition))+offset.x,
            neighbor.mesh.geometry.attributes.position.getY(i - (tPosition - nPosition))+offset.y,
            neighbor.mesh.geometry.attributes.position.getZ(i - (tPosition - nPosition))+offset.z
        )
    }
  }

  // TODO: this fixes the seams, but is not quite right, there are angular and texture discontinuities:
  // http://localhost/sitrec/?custom=http://localhost/sitrec-upload/99999999/Custom-8c549374795aec6f133bfde7f25bad93.json
  resolveSeamX(neighbor) {
    const tPosition = this.mesh.geometry.attributes.position.count
    const nPosition = Math.sqrt(tPosition)
    const nPositionN = Math.sqrt(
      neighbor.mesh.geometry.attributes.position.count
    )
    if (nPosition !== nPositionN) {
      console.error("resolveSeamX only implemented for geometries of same size")
      return
    }

    // the positions are relative to the tile centers
    // so we need to adjust by the offset
    const tileCenter = this.mesh.position;
    const neighborCenter = neighbor.mesh.position;
    const offset = neighborCenter.clone().sub(tileCenter);

    for (let i = nPosition - 1; i < tPosition; i += nPosition) {
      // copy the entire position vector
      this.mesh.geometry.attributes.position.setXYZ(
          i,  // this is the index of the vertex in the mesh
          neighbor.mesh.geometry.attributes.position.getX(i - nPosition + 1)+offset.x,
          neighbor.mesh.geometry.attributes.position.getY(i - nPosition + 1)+offset.y,
          neighbor.mesh.geometry.attributes.position.getZ(i - nPosition + 1)+offset.z
      )
    }
  }

  resolveSeams(cache,doNormals=true) {
    let worked = false
    const neighY = cache[this.keyNeighY()]
    const neighX = cache[this.keyNeighX()]
    if (this.seamY === false && neighY && neighY.mesh) {
      this.resolveSeamY(neighY)
      this.seamY = true
      worked = true
    }
    if (this.seamX === false && neighX && neighX.mesh) {
      this.resolveSeamX(neighX)
      this.seamX = true
      worked = true
    }
    if (worked) {
      this.mesh.geometry.attributes.position.needsUpdate = true
      if (doNormals)
        this.mesh.geometry.computeVertexNormals()
    }
  }
}

class Map33 {
  constructor (scene,  terrainNode, geoLocation, options={}) {
    this.scene = scene
    this.terrainNode = terrainNode
    this.geoLocation = geoLocation

    this.options = this.getOptions(options)
    this.nTiles = this.options.nTiles
    this.zoom = this.options.zoom
    this.tileSize = this.options.tileSize
    this.radius = wgs84.RADIUS; // force this
    this.loadedCallback = options.loadedCallback; // function to call when map is all loaded
    this.loaded = false; // mick flag to indicate loading is finished

    this.elOnly = options.elOnly ?? false;
    this.elevationMap = options.elevationMap;

    this.tileCache = {};

    this.init(this.options.deferLoad)
  }

  defaultOptions = {
    nTiles: 3,
    zoom: 11,
    tileSize: 600,
    tileSegments: 100,
    zScale: 1,
  }

  getOptions(providedOptions) {
    const options = Object.assign({}, this.defaultOptions, providedOptions)
    options.tileSegments = Math.min(256, Math.round(options.tileSegments))
    return options
  }

  init(deferLoad=false) {
    this.center = this.options.mapProjection.geo2Tile(this.geoLocation, this.zoom)
    const tileOffset = Math.floor(this.nTiles / 2)
    this.controller = new AbortController();

    for (let i = 0; i < this.nTiles; i++) {
      for (let j = 0; j < this.nTiles; j++) {
        const x = this.center.x + i - tileOffset;
        const y = this.center.y + j - tileOffset;
        // only add tiles that are within the bounds of the map
        // we allow the x values out of range
        // because longitude wraps around
        if (y>0 && y<Math.pow(2,this.zoom)) {
          const tile = new Tile(this, this.zoom, x, y)
          this.tileCache[tile.key()] = tile
          // make the meshes immediately instead of when the tile is loaded
          // because we want to display something while waiting
          if (!this.elOnly) {
            tile.buildGeometry()
            tile.buildMesh()
            tile.setPosition(this.center)
            tile.recalculateCurve(wgs84.RADIUS)
            this.scene.add(tile.mesh)
          } else {
            tile.buildDebugGeometry();
          }
        }
      }
    }

    // we might want to defer this to a later time
    // so we can move the mesh around
    // like, allow the user to drag it, or change the UI values
    if (!deferLoad) {
      this.startLoadingTiles()
    }

    // To abort the loading of tiles, call controller.abort()
    // controller.abort();
  }

  startLoadingTiles() {
    const promises = Object.values(this.tileCache).map(tile => {

          return tile.fetchElevationTile(this.controller.signal).then(tile => {
            if (this.controller.signal.aborted) {
              // flag that it's aborted, so we can filter it out later
              return Promise.resolve('Aborted');
            }

            // do an initial setting of the vertex positions
            // to accurate EGS84 positions
            // the height map should be loaded by now.
            if (!this.elOnly) {
              tile.recalculateCurve(wgs84.RADIUS)
            }
            return tile
          })

        }
    )

    Promise.all(promises).then(tiles => {
      // Filter out the 'Aborted' values
      tiles = tiles.filter(tile => tile !== 'Aborted');

      if (!this.elOnly) {
        tiles.reverse().forEach(tile => {
          tile.recalculateCurve(this.radius)
          tile.resolveSeams(this.tileCache)
        })
      }
      if (this.loadedCallback) this.loadedCallback();
      this.loaded = true; // mick flag loading is finished
    })
  }

  recalculateCurveMap(radius, force=false) {

    if (!force && radius == this.radius) {
      console.log('map33 recalculateCurveMap Radius is the same - no need to recalculate, radius = '+radius);
      return;
    }

    if (!this.loaded) {
      console.warn('Map not loaded yet - only call recalculateCurveMap after loadedCallback')
      return;
    }
    this.radius = radius
    Object.values(this.tileCache).forEach(tile => {
      tile.recalculateCurve(radius)
    })
  }

  refreshDebugGrid() {
    Object.values(this.tileCache).forEach(tile => {
      tile.buildDebugGeometry()
    })
  }


  addFromPosition(posX, posY) {
    const {
      x,
      y,
      z
    } = Utils.position2tile(this.zoom, posX, posY, this.center, this.tileSize)
    console.log({x, y, z})
    const tile = new Tile(this, this.zoom, x, y)

    if (tile.key() in this.tileCache) return

    this.tileCache[tile.key()] = tile
    tile.fetchElevationTile().then(tile => {
      tile.setPosition(this.center)
      this.scene.add(tile.mesh)
      console.log("Adding "+posX+","+posY)
    }).then(() => {
      Object.values(this.tileCache).forEach(tile => {
        tile.recalculateCurve(this.radius)
        tile.resolveSeams(this.tileCache)
      })
    })
  }

  clean() {
      console.log("map33 clean()");


    // abort the pending loading of tiles
    this.controller.abort();

    Object.values(this.tileCache).forEach(tile => {
      tile.removeDebugGeometry(); // any debug arrows, etc
      if (tile.mesh !== undefined) {
        this.scene.remove(tile.mesh)
        tile.mesh.geometry.dispose();
        if (tile.mesh.material.uniforms !== undefined) {
            assert(tile.mesh.material.uniforms !== undefined, 'Uniforms not defined');

          ['mapSW', 'mapNW', 'mapSE', 'mapNE'].forEach(key => {
            tile.mesh.material.uniforms[key].value.dispose();
          });

        }

        tile.mesh.material.dispose()
      }
    })
    this.tileCache = {}
    this.scene = null; // MICK - added to help with memory management
  }

  // interpolate the elevation at a lat/lon
  // does not handle interpolating between tiles (i.e. crossing tile boundaries)
  getElevationInterpolated(lat, lon) {

    if (this.elevationMap !== undefined) {
      return this.elevationMap.getElevationInterpolated(lat, lon);
    }

    // using geo2tileFraction to get the position in tile coordinates
    // i.e. the coordinates on the 2D grid source texture
    // TODO - altitude map might be different format to the source texture
    // even different coordinate system. So this might not work.
    const {x, y} = this.options.mapProjection.geo2TileFraction([lat, lon], this.zoom)
    const intX = Math.floor(x)
    const intY = Math.floor(y)
    const tile = this.tileCache[`${this.zoom}/${intX}/${intY}`]
    if (tile && tile.elevation) {
      const nElevation = Math.sqrt(tile.elevation.length)
      const xIndex = (x - tile.x) * nElevation
      const yIndex = (y - tile.y) * nElevation
      let x0 = Math.floor(xIndex)
      let x1 = Math.ceil(xIndex)
      let y0 = Math.floor(yIndex)
      let y1 = Math.ceil(yIndex)

      // clamp to the bounds of the elevation map 0 ... nElevation-1
      x0 = Math.max(0, Math.min(nElevation - 1, x0))
      x1 = Math.max(0, Math.min(nElevation - 1, x1))
      y0 = Math.max(0, Math.min(nElevation - 1, y0))
      y1 = Math.max(0, Math.min(nElevation - 1, y1))

      const f00 = tile.elevation[y0 * nElevation + x0]
      const f01 = tile.elevation[y0 * nElevation + x1]
      const f10 = tile.elevation[y1 * nElevation + x0]
      const f11 = tile.elevation[y1 * nElevation + x1]
      const f0 = f00 + (f01 - f00) * (xIndex - x0)
      const f1 = f10 + (f11 - f10) * (xIndex - x0)
      const elevation = f0 + (f1 - f0) * (yIndex - y0)
      return elevation * this.options.zScale;
    }
    return 0  // default to sea level if elevation data not loaded
  }

}

export {Map33}
