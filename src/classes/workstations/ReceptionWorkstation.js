'use strict'

let BaseWorkstation = require('./BaseWorkstation.js');
let Connection = require('../access-objects/connection-instance.js');

let connection = new Connection();


class ReceptionWorkstation extends BaseWorkstation {
	constructor(user) {
		super(user, 'reception');
	}
	getServiceInfo(params) {
		return connection.request('/reception/service-info', params);
	}
	getWorkstationInfo(params) {
		return connection.request('/reception/workstation-info', params);
	}
	getAvailableSlots(params) {
		return connection.request('/prebook/service-stats', params);
	}
}


module.exports = ReceptionWorkstation;
