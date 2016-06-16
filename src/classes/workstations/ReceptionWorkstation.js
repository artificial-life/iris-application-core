'use strict'

let BaseWorkstation = require('./BaseWorkstation.js');
let connection = require('../connection-instance.js');

class ReceptionWorkstation {
  constructor(user) {
    // super(user, 'report');
  }
  getServiceInfo(params) {
    return connection.request('/reception/service-info', params);
  }
  getAvailableSlots(params) {
    return connection.request('/prebook/service-stats', params);
  }
}


module.exports = ReceptionWorkstation;