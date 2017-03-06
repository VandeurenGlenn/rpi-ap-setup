'use strict';

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
const logger$1 = new Logger();
const inquirer = require('inquirer');
const logUpdate = require('log-update');


var Utils = class {

  spawn(command, args) {
    return spawn(command, args);
  }

  cp(path, destination) {
    const cp = spawn('cp', [path, destination]);

    cp.stderr.on('data', data => {
      logger$1.warn(data.toString());
    });
  }

  backup(paths) {
    for (let path of paths) {
      this.logUpdate('backing up');
      this.cp(path, `${path}.backup`);
    }
  }

  prompt(questions) {
    return new Promise((resolve, reject) => {
      inquirer.prompt(questions).then(answers => {
        resolve(answers);
      }).catch(error => {
        reject(error);
      });
    });
  }

  logUpdate(message) {
    logUpdate(logger$1._chalk(message, 'cyan'));
  }
};

const {stat, readFile, writeFile, unlink} = require('fs');
let utils = new Utils();
let logger = new Logger();
(() => {
  class RpiAPSetup {

    constructor() {
      const args = process.argv;
      const arg = args[args.length - 1];
      if (arg === '-y' || arg === 'yes' || arg === 'y') {
        this.yesForAll = true;
      }
      this.backupConfigs();
      this.installPackages().then(() => {
        this.setupAP();
      });
    }

    backupConfigs() {
      utils.backup([
        '/etc/udhcpd.conf',
        '/etc/default/udhcpd',
        '/etc/network/interfaces',
        '/etc/hostapd/hostapd.conf',
        '/etc/default/hostapd',
        '/etc/sysctl.conf',
        '/etc/iptables.ipv4.nat'
      ]);
    }

    installPackages() {
      return new Promise((resolve, reject) => {
        const install = utils.spawn('sudo', ['apt-get', 'install', 'udhcpd', 'hostapd', '-Y']);
        install.on('error', error => {
          logger.error(error);
        });
        install.on('close', (code) => {
          if (code !== 0) {
            logger.error('error installing apt-get packages');
            reject();
          }
          resolve();
          install.stdin.end();
        });
      });
    }

    promiseTemplates(opts={defaultDNS: true, router: 100, dns: '8.8.8.8 8.8.4.4'}) {
      return new Promise((resolve, reject) => {
        utils.logUpdate('Setting up templates');

        this.templates = [];

        const templates = [
          this.template(__dirname + '/templates/udhcpd.conf', opts),
          this.template(__dirname + '/templates/hostapd', opts),
          this.template(__dirname + '/templates/hostapd.conf', opts),
          this.template(__dirname + '/templates/interfaces', opts),
          this.template(__dirname + '/templates/sysctl.conf', opts),
          this.template(__dirname + '/templates/iptables.ipv4.nat', opts)
        ];

        Promise.all(templates).then(() => {
          resolve();
        });
      });
    }

    setupAP() {
      if (this.yesForAll) {
        this.promiseTemplates().then(() => {
          this.configure();
        });
      } else {
        this.promptUser().then(answers => {
          this.promiseTemplates(answers).then(() => {
            this.configure();
          });
        });
      }
    }

    promptUser() {
      return new Promise(resolve => {
        const questions = [{
          type: 'input',
          name: 'dns',
          message: 'Please provide DNS address.',
          default: '8.8.8.8 8.8.4.4'
        }, {
          type: 'input',
          name: 'ssid',
          message: 'AP SSID',
          default: 'RF-001'
        }, {
          type: 'input',
          name: 'password',
          message: 'AP password',
          hidden: true,
          default: 'CurlyEyebrows692'
        }, {
          type: 'input',
          name: 'router',
          message: 'IP 0.0.x.0',
          default: 100
        }];
        utils.prompt(questions).then(answers => {
          resolve(answers);
        });
      });
    }

    configure() {
      this.configureDHCP().then(() => {
        this.configureInterfaces().then(() => {
          this.configureApd().then(() => {
            this.configureNAT().then(() => {
              utils.spawn('touch', ['/var/lib/misc/udhcpd.leases']);

              utils.logUpdate('Initialising AP');
              utils.spawn('service', ['hostapd', 'start']);
              utils.spawn('update-rc.d', ['hostapd', 'enable']);

              utils.logUpdate('Initialising DHCP server');
              utils.spawn('service', ['udhcpd', 'start']);
              utils.spawn('update-rc.d', ['udhcpd', 'enable']);

              utils.logUpdate('Configuration finished!  Rebooting in 15 seconds');

              utils.spawn('sleep', [10]);
              utils.spawn('reboot');
            });
          });
        });
      });
    }

    configureDHCP() {
      utils.logUpdate('Configuring DHCP');
      return new Promise(resolve => {
          // this.transformFile('/etc/dhcpcd.conf', 'denyinterfaces wlan0'),
        this.transformFile('/etc/udhcpd.conf', this.templates['udhcpd.conf']).then(() => {
          resolve();
        });
      });
    }

    configureInterfaces() {
      return new Promise(resolve => {
        utils.logUpdate('Configuring interfaces');
        const transforms = [
          this.transformFile('/etc/network/interfaces', this.templates['interfaces'])
        ];
        Promise.all(transforms).then(() => {
          resolve();
        });
      });
    }

    configureApd() {
      utils.logUpdate('Configuring hostapd');
      console.log(this.templates['hostapd']);
      return new Promise(resolve => {
        const transforms = [
          this.transformFile('/etc/default/hostapd', this.templates['hostapd']),
          this.transformFile('/etc/hostapd/hostapd.conf', this.templates['hostapd.conf'])
        ];
        Promise.all(transforms).then(() => {
          resolve();
        });
      });
    }

    configureNAT() {
      return new Promise(resolve => {
        utils.logUpdate('Configuring NAT');
        const transforms = [
          this.transformFile('/etc/sysctl.conf', this.templates['sysctl.conf']),
          this.transformFile('/etc/iptables.ipv4.nat', this.templates['iptables.ipv4.nat'])
        ];
        Promise.all(transforms).then(() => {
          resolve();
        });
      });
    }

    /**
     * @return {string} someFilename
     * @param {string} path
     */
    nameFromPath(path) {
      return path.match(/\/(?:.(?!\/))+$/g)[0].replace('/', '');
    }

    /**
     * saves a template into templates
     * @param {string} path path/to/template
     * @param {object} args when {address: 0.0.0.0} is given <%= address %> will become 0.0.0.0
     */
    template(path, args) {
      return new Promise((resolve, reject) => {
        const name = this.nameFromPath(path);
        readFile(path, 'utf-8', (err, content) => {
          if (args.length) {
            for (let arg of Object.keys(args)) {
              if (content.includes(`<%= ${arg} %>`)) {
                let reg = new RegExp('<%= ' + arg + ' %>', ['g']);
                content = content.replace(reg, args[arg]);
                this.templates[name] = content;
              }
            }
          } else {
            this.templates[name] = content;
          }
          resolve();
        });
      });
    }

    /**
     * @param {string} path file location
     * @param {string} context the context to add or remove
     */
    transformFile(path, context) {
      return new Promise((resolve, reject) => {
        writeFile(path, data, err => {
          resolve();
        });
      });
    }

    readFile(path) {
      return new Promise((resolve, reject) => {
        stat(path, (err, stats) => {
          if (stats === undefined) resolve(String(''));
          else readFile(path, (err, data) => {
            resolve(data);
          });
        });
      });
    }

    addContext(data, context) {
      return data += context;
    }

    removeContext(data, context) {
      // probably replace(context, '')
      return data -= context;
    }
  }
  return new RpiAPSetup();
})();
//# sourceMappingURL=index.js.map
