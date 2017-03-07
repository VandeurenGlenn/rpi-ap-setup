'use strict';
const spawn = require('child_process').spawn;
import Logger from './logger.js';
const logger = new Logger();
const inquirer = require('inquirer');
const logUpdate = require('log-update');


export default class {

  spawn(command, args) {
    return spawn(command, args);
  }

  cp(path, destination) {
    const cp = spawn('cp', [path, destination]);

    cp.stderr.on('data', data => {
      logger.warn(data.toString());
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
        resolve(answers)
      }).catch(error => {
        reject(error);
      });
    });
  }

  logUpdate(message) {
    logUpdate(logger._chalk(message, 'cyan'));
  }
}
