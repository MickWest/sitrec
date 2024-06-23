// manage a queue of file loading requests
// The goal is to reduce load on the server and client that comes from requesting 100s of files
// so we only have a handful of request open at once
// each file has a callback and a fallback
// fallback is a different URL if this one does not exist
// for example, if the file typically (but not always) redirects to a known location (like a cache)
// you can try that location first to avoid getting lots of redirects.

// NOT CURRENTLY USED

// npm install axios --save-dev
//
const axios = require('axios');

class CAsyncFileLoader {
  constructor() {
    this.queue = [];
    this.activeRequests = 0;
    this.maxActiveRequests = 5;
  }

  enqueue(file) {
    return new Promise((resolve, reject) => {
      this.queue.push({ file, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    while (
      this.activeRequests < this.maxActiveRequests &&
      this.queue.length > 0
    ) {
      const { file, resolve, reject } = this.queue.shift();
      this.activeRequests++;
      this.fetch(file).then(resolve).catch(reject);
    }
  }

  async fetch(file) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await axios.get(file);
        this.activeRequests--;
        resolve(response.data);
        this.processQueue();
      } catch (error) {
        this.activeRequests--;
        console.error(`Error fetching file: ${file}. Re-queueing.`);
        this.enqueue(file).then(resolve).catch(reject);
        this.processQueue();
      }
    });
  }
}

// Usage
// const asyncFileLoader = new AsyncFileLoader();
//
// async function fetch(file) {
//  try {
//   const data = await asyncFileLoader.enqueue(file);
//   return data;
//  } catch (error) {
//   console.error(`Failed to fetch ${file}: ${error}`);
//   throw error;
//  }
// }
//
// // Example usage of fetch
// fetch('https://example.com/file1.txt')
//     .then(data => {
//      console.log(`File 1 loaded: ${data}`);
//     })
//     .catch(error => {
//      console.error(`Failed to load File 1: ${error}`);
//     });
//
// // ... enqueue more files using fetch

export const AsyncFileLoader = new CAsyncFileLoader();
