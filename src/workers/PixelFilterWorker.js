// PixelFilterWorker

importScripts("../PixelFilters.js"+self.location.search);

onmessage = (e) => {
//    console.log('Message received from main script');
//    const workerResult = `Result: ${e.data[0] * e.data[1]}`;
//    console.log('Posting message back to main script');
//    postMessage(workerResult);
    const image = e.data[1]
   // console.log("got p len="+p.length)

    filterNoise(image.data)

    // pass back frame number and ImageData
    postMessage([e.data[0],image])
}