const assert = require('assert');
const crypto = require('crypto');
const JSZip = require('jszip');

describe('JSZip Compression/Decompression Test', function () {
    it('should compress and decompress a 1MB random file accurately', async function () {
        // Generate a random 1MB Buffer
        const oneMB = 1024 * 1024;
        const originalData = crypto.randomBytes(oneMB);

        // Create a new JSZip instance and add the random file
        const zip = new JSZip();
        zip.file('random.bin', originalData);

        // Compress the content into a Node.js Buffer
        const zipData = await zip.generateAsync({ type: 'nodebuffer' });

        // Load the zip back from the generated buffer
        const newZip = await JSZip.loadAsync(zipData);

        // Retrieve and decompress the file
        const decompressedData = await newZip.file('random.bin').async('nodebuffer');

        // Compare the original and decompressed data
        assert(
            originalData.equals(decompressedData),
            'Decompressed data does not match the original'
        );
    });
});
