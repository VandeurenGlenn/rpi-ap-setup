var config = {
  "debug": true
};

const chalk = require('chalk');
var Logger = class {
  _chalk(text, color='white') {
    return chalk[color](text);
  }

  log(text) {
    console.log(this._chalk(text));
  }

  warn(text) {
    console.warn(this._chalk(text, 'yellow'));
  }

  error(text) {
    console.error(this._chalk(text, 'red'));
  }

};

const spawn = require('child_process').spawn;
const logger = new Logger();

var Utils = class {

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
