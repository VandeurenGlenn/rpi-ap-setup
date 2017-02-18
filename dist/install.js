var config = {
  "debug": true
};

const spawn = require('child_process').spawn;
const {platform} =  require('os');
if (platform() !== 'win32') {
  const install = spawn('sudo', ['apt-get', 'install', 'dnsmasq', 'hostapd', '-Y']);
  install.on('error', error => {
    console.error(error);
  });
  install.on('close', (code) => {
    if (code !== 0) {
      console.error('error installing apt-get packages');
    }
    install.stdin.end();
  });
} else {
  if (config.debug) {
    console.warn('running on windows::skiping apt-get for development');
  }
}
//# sourceMappingURL=install.js.map
