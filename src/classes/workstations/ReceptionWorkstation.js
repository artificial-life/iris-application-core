'use strict'

let BaseWorkstation = require('./BaseWorkstation.js');
let Connection = require('../access-objects/connection-instance.js');

let connection = new Connection();


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
