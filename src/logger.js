'use strict';
const chalk = require('chalk');
export default class {
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

}
