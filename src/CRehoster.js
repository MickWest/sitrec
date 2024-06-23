import { SITREC_SERVER } from '../config';
import { assert } from './assert.js';

class CRehoster {
  constructor() {
    // this.rehostedFiles = [];
    this.rehostPromises = [];
  }

  // Function to promise to rehostFile the file from the client to the server
  //
  async rehostFilePromise(filename, data) {
    assert(filename !== undefined, 'rehostFile needs a filename');
    try {
      const formData = new FormData();
      formData.append('fileContent', new Blob([data]));
      formData.append('filename', filename);

      const serverURL = `${SITREC_SERVER}rehost.php`;

      const response = await fetch(serverURL, {
        method: 'POST',
        body: formData, // Send FormData with file and filename
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const resultUrl = await response.text();

      // // Remove existing instance of resultUrl, if present
      // // this will ensure we load the files in the same order, but each file just once (the most recent)
      // // e.g. A,B,C,A will be B,C,A
      //
      // const index = this.rehostedFiles.indexOf(resultUrl);
      // if (index > -1) {
      //     this.rehostedFiles.splice(index, 1);
      // }
      //
      // // Push the new resultUrl
      // this.rehostedFiles.push(resultUrl);

      console.log('File uploaded:', resultUrl);

      // // copy the URL to the clipboard
      // navigator.clipboard.writeText(resultUrl).then(() => {
      //     console.log('URL copied to clipboard:', resultUrl);
      // })

      return resultUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Upload problem, maybe not logged in?');
    }
  }

  rehostFile(filename, data) {
    const promise = this.rehostFilePromise(filename, data);
    this.rehostPromises.push(promise);
    return promise;
  }

  waitForAllRehosts() {
    return Promise.all(this.rehostPromises)
      .then(() => {
        console.log('All files have been successfully rehosted.');
        // Perform any action after all files are uploaded
      })
      .catch((error) => {
        console.error(
          'An error occurred during file upload for rehost: ',
          error
        );
        // Handle errors here
      });
  }
}

export const Rehoster = new CRehoster();
