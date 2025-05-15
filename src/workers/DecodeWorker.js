/* global self */

// Message ≡ { frameNumber, frame }
self.onmessage = async ({ data }) => {
    const { frameNumber, frame } = data;       // VideoFrame now owned by worker

    // Heavy work happens off-thread
    const bitmap = await createImageBitmap(frame);
    frame.close();                             // always release the VideoFrame

    // OPTIONAL: do RGB/YUV filtering here on an OffscreenCanvas
    // const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    // const ctx = canvas.getContext('2d');
    // ctx.drawImage(bitmap, 0, 0);
    // … filter …

    // Send the finished ImageBitmap back; zero-copy transfer again
    self.postMessage({ frameNumber, bitmap }, [bitmap]);
};
