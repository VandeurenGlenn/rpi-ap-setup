'use strict';

const chalk = require('chalk');
var Logger = class {
  _chalk(text, color = 'white') {
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
const { stat: stat$1 } = require('fs');
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
  restore(paths) {
    for (let path of paths) {
      this.logUpdate('undoing AP changes, restoring the network');
      this.cp(`${path}.backup`, path);
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
  stat(path) {
    return new Promise((resolve, reject) => {
      stat$1(path, (error, stats) => {
        if (error) return resolve(false);
        resolve(true);
      });
    });
  }
  logUpdate(message) {
    logUpdate(logger$1._chalk(message, 'cyan'));
  }
};

const { stat, readFile, writeFile, unlink } = require('fs');
const { extend } = require('underscore');
let utils = new Utils();
let logger = new Logger();
class RpiAPSetup {
  constructor(auto = false) {
    this.answers = { password: 'CurlyEyebrows692', ssid: 'RL-001', router: 100, dns: '8.8.8.8 8.8.4.4' };
    const args = process.argv;
    const arg = args[args.length - 1];
    if (arg === '-y' || arg === 'yes' || arg === 'y') {
      this.yesForAll = true;
    }
    process.on('exit', code => {
      if (code !== 0) {
        this.restore();
      }
    });
    if (auto) this.init();
  }
  init(yes = false) {
    this.yesForAll = yes ? yes : this.yesForAll;
    return new Promise((resolve, reject) => {
      try {
        this.backupConfigs();
        this.installPackages().then(() => {
          this.setupAP().then(() => {
            resolve();
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  backupConfigs() {
    utils.backup(['/etc/udhcpd.conf', '/etc/network/interfaces', '/etc/hostapd/hostapd.conf', '/etc/default/hostapd', '/etc/sysctl.conf', '/etc/iptables.ipv4.nat']);
  }
  installPackages() {
    return new Promise(resolve => {
      const install = utils.spawn('apt-get', ['install', 'udhcpd', 'hostapd', '-y']);
      install.on('error', error => {
        logger.error(error);
      });
      install.on('close', code => {
        if (code !== 0) {
          logger.error('error installing apt-get packages');
        }
        resolve();
        install.stdin.end();
      });
    });
  }
  promiseTemplates(opts) {
    return new Promise((resolve, reject) => {
      utils.logUpdate('Setting up templates');
      this.templates = [];
      const templates = [this.template(__dirname + '/templates/udhcpd.conf', opts), this.template(__dirname + '/templates/hostapd'), this.template(__dirname + '/templates/hostapd.conf', opts), this.template(__dirname + '/templates/interfaces', opts), this.template(__dirname + '/templates/sysctl.conf'), this.template(__dirname + '/templates/iptables.ipv4.nat')];
      Promise.all(templates).then(() => {
        resolve();
      });
    });
  }
  setupAP() {
    return new Promise((resolve, reject) => {
      try {
        this.promptUser().then(answers => {
          this.promiseTemplates(answers).then(() => {
            this.configure().then(() => {
              resolve();
            });
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  restoreNetwork() {
    return new Promise((resolve, reject) => {
      utils.restore(['/etc/udhcpd.conf', '/etc/network/interfaces', '/etc/hostapd/hostapd.conf', '/etc/default/hostapd', '/etc/sysctl.conf', '/etc/iptables.ipv4.nat']);
    });
  }
  promptUser() {
    return new Promise(resolve => {
      if (this.yesForAll) {
        return resolve(this.answers);
      }
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
        resolve(extend(this.answers, answers));
      });
    });
  }
  configure() {
    return new Promise((resolve, reject) => {
      try {
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
                utils.logUpdate('Configuration finished!');
                resolve(0);
              });
            });
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  configureDHCP() {
    utils.logUpdate('Configuring DHCP');
    return new Promise(resolve => {
      this.transformFile('/etc/udhcpd.conf', this.templates['udhcpd.conf']).then(() => {
        resolve();
      });
    });
  }
  configureInterfaces() {
    return new Promise(resolve => {
      utils.logUpdate('Configuring interfaces');
      const transforms = [this.transformFile('/etc/network/interfaces', this.templates['interfaces'])];
      Promise.all(transforms).then(() => {
        resolve();
      });
    });
  }
  configureApd() {
    utils.logUpdate('Configuring hostapd');
    return new Promise(resolve => {
      const transforms = [this.transformFile('/etc/default/hostapd', this.templates['hostapd']), this.transformFile('/etc/hostapd/hostapd.conf', this.templates['hostapd.conf'])];
      Promise.all(transforms).then(() => {
        resolve();
      });
    });
  }
  configureNAT() {
    return new Promise(resolve => {
      utils.logUpdate('Configuring NAT');
      const transforms = [this.transformFile('/etc/sysctl.conf', this.templates['sysctl.conf']), this.transformFile('/etc/iptables.ipv4.nat', this.templates['iptables.ipv4.nat'])];
      Promise.all(transforms).then(() => {
        resolve();
      });
    });
  }
  nameFromPath(path) {
    return path.match(/\/(?:.(?!\/))+$/g)[0].replace('/', '');
  }
  template(path, args) {
    return new Promise((resolve, reject) => {
      const name = this.nameFromPath(path);
      readFile(path, 'utf-8', (err, content) => {
        if (args && Object.keys(args).length) {
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
  promiseBackupRestore(key) {
    return new Promise((resolve, reject) => {
      try {
        utils.stat(key + '.backup').then(exists => {
          if (exists) {
            utils.spawn('sudo', ['rm', '-rf', key]);
            utils.spawn('sudo', ['cp', key + '.backup', key]);
          }
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  transformFile(path, context) {
    return new Promise((resolve, reject) => {
      writeFile(path, context, err => {
        resolve();
      });
    });
  }
  restore() {
    try {
      utils.logUpdate('Restoring to normal mode');
      const promises = [];
      const arr = ['/etc/udhcpd.conf', '/etc/default/udhcpd', '/etc/network/interfaces', '/etc/hostapd/hostapd.conf', '/etc/default/hostapd', '/etc/sysctl.conf', '/etc/iptables.ipv4.nat'];
      for (let key of arr) {
        promises.push(this.promiseBackupRestore(key));
      }
      Promise.all(promises).then(() => {
        utils.spawn('touch', ['/var/lib/misc/udhcpd.leases']);
        utils.spawn('service', ['hostapd', 'stop']);
        utils.spawn('update-rc.d', ['hostapd', 'disable']);
        utils.logUpdate('Initialising DHCP server');
        utils.spawn('service', ['udhcpd', 'stop']);
        utils.spawn('update-rc.d', ['udhcpd', 'disable']);
        utils.logUpdate('Restore finished!');
        utils.spawn('sudo', ['reboot']);
      });
    } catch (error) {
      throw error;
    }
  }
}
var index = new RpiAPSetup();

module.exports = index;
//# sourceMappingURL=index.js.map
