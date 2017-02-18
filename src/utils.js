'use strict';
const spawn = require('child_process').spawn;
export default class {
  constructor() {

  }

  online() {
    return new Promise((resolve, reject) => {
      const ping = spawn('ping', ['google.com']);
      
      ping.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          resolve(false);
        }
        if (global.debug) {
          console.log(`child process exited with code ${code}`);
        }
      });
    });
  }
}
