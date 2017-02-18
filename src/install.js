'use strict';
const spawn = require('child_process').spawn;
const {platform} =  require('os');
import config from './sources/config.json';
import Logger from './logger.js';
const logger = new Logger();

if (platform() !== 'win32') {
  const install = spawn('sudo', ['apt-get', 'install', 'dnsmasq', 'hostapd', '-Y']);
  install.on('error', error => {
    logger.error(error);
  })
  install.on('close', (code) => {
    if (code !== 0) {
      logger.error('error installing apt-get packages');
    }
    install.stdin.end()
  });
} else {
  if (config.debug) {
    logger.warn('running on windows::skiping apt-get for development');
  }
}
