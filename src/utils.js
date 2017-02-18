'use strict';
const spawn = require('child_process').spawn;
import Logger from './logger.js';
const logger = new Logger();

export default class {

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
          logger.warn(`child process exited with code ${code}`);
        }
      });
    });
  }
}
