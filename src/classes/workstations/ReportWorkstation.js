'use strict'

let BaseWorkstation = require('./BaseWorkstation.js');
let connection = require('../connection-instance.js');

class ReportWorkstation {
  constructor(user) {
    // super(user, 'report');
  }
  getTable(template) {
    return connection.request('/reports/get-table', template);
  }
}

module.exports = ReportWorkstation;