var config = {
  "debug": true
};

const spawn = require('child_process').spawn;
var Utils = class {
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
};

let utils = new Utils();

class RpiWifi {
  constructor() {

    this.config = config;
    if (config && config.debug) {
      global.debug = config.debug;
    } else {
      global.debug = false;
    }

    utils.online().then(isOnline => {
      if (isOnline) {
        console.log(isOnline);
      } else {

      }
    });
  }
}

new RpiWifi();
//# sourceMappingURL=rpi-wifi.js.map
