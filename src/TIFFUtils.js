

// Convert a TIFF image to an array of elevation values
// image is a TIFF image loaded by GeoTIFF
// the data is in an ArrayBufferSource with contains an arrayBuffer
import {assert} from "./assert";

export function convertTIFFToElevationArray(image) {

    if (!image.isTiled) {
        throw new Error("TIFF image is not tiled");
    }

    const width = image.fileDirectory.ImageWidth;
    const height = image.fileDirectory.ImageLength;
    const tileWidth = image.fileDirectory.TileWidth;
    const tileHeight = image.fileDirectory.TileLength;
    const tileCount = image.fileDirectory.TileOffsets.length;
    const tileOffsets = image.fileDirectory.TileOffsets;
    const tileByteCounts = image.fileDirectory.TileByteCounts;

    const buffer = image.source.arrayBuffer;

    const bufferView = new DataView(buffer);

    const output = new Float32Array(width * width);

    const numTilesX = Math.ceil(width / tileWidth);
    const numTilesY = Math.ceil(height / tileHeight);
    // iterate over the tiles by row and column
    for (let tileX = 0; tileX < numTilesX ; tileX += 1) {
        for (let tileY = 0; tileY< numTilesY; tileY+=1) {
            const tileIndex = tileY * numTilesX + tileX;
            const tileOffset = tileOffsets[tileIndex];
            const tileByteCount = tileByteCounts[tileIndex];

//            console.log("tileOffset = " + tileOffset + " tileByteCount = " + tileByteCount);

            if (tileByteCount !== 0) {
                // read the tile data from the buffer
                //const tileBuffer = buffer.slice(tileOffset, tileOffset + tileByteCount);
                //const tileData = new DataView(tileBuffer);

                // iterate over the tile data by row and column
                for (let x = 0; x < tileWidth; x += 1) {
                    for (let y = 0; y < tileHeight; y += 1) {
                        const index = y * tileWidth + x;
                        assert(index * 4 < tileByteCount, "index out of range, tileByteCount = " + tileByteCount + " index = " + index);

                        // the value at index*4 is a 32 bit float, little endian
                        const value = bufferView.getFloat32(tileOffset + index * 4, true);

                        assert(!isNaN(value), "value is NaN at " + x + "," + y + "offset = " + (tileOffset + index*4));
                        const outputX = tileX * tileWidth + x;
                        const outputY = tileY * tileHeight + y;
                        const outputIndex = outputY * width + outputX;
                        if (outputX < width && outputY < height) {
                            output[outputIndex] = value;
                        }
                    }
                }
            }
        }
    }




    return output;
}