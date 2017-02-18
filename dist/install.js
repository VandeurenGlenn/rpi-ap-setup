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
const {platform} =  require('os');
const logger = new Logger();

if (platform() !== 'win32') {
  const install = spawn('sudo', ['apt-get', 'install', 'dnsmasq', 'hostapd', '-Y']);
  install.on('error', error => {
    logger.error(error);
  });
  install.on('close', (code) => {
    if (code !== 0) {
      logger.error('error installing apt-get packages');
    }
    install.stdin.end();
  });
} else {
  if (config.debug) {
    logger.warn('running on windows::skiping apt-get for development');
  }
}
//# sourceMappingURL=install.js.map
