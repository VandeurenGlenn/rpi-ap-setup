'use strict';
import config from './../sources/config.json';
import Utils from './../utils';

let utils = new Utils();

export default class RpiWifi {
  constructor() {

    this.config = config;
    if (config && config.debug) {
      global.debug = config.debug;
    } else {
      global.debug = false;
    }

    utils.online().then(isOnline => {
      if (isOnline) {
        if (global.debug) {
          console.log(isOnline);
        }
      } else {

      }
    });
  }
}
