'use strict'

let BaseWorkstation = require('./BaseWorkstation.js');
let Connection = require('../access-objects/connection-instance.js');

let connection = new Connection();
let SharedEntities = require('../access-objects/SharedEntities.js');

class ReceptionWorkstation extends BaseWorkstation {
	constructor(user) {
		super(user, 'reception');
	}
	getShared() {
		let ws_params = {
			workstation: this.getId()
		};
		let request_shared = [{
			name: 'timezone',
			params: ws_params
		}, {
			name: 'office',
			params: ws_params
		}, {
			name: 'services',
			params: ws_params
		}, {
			name: 'organization-chain',
			params: ws_params
		}];

		return SharedEntities.request(request_shared);
	}
	getServiceInfo(params) {
		return connection.request('/reception/service-info', params);
	}
	getServiceDetails(params) {
		return connection.request('/reception/service-details', params);
	}
	getWorkstationInfo(params) {
		return connection.request('/reception/workstation-info', params);
	}
	getAvailableSlots(params) {
		return connection.request('/prebook/service-stats', params);
	}
}


module.exports = ReceptionWorkstation;
