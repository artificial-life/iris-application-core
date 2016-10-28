'use strict'

let TicketManager = require('./TicketManager.js');
let Connection = require('../access-objects/connection-instance.js');

let connection = new Connection();
let SharedEntities = require('../access-objects/SharedEntities.js');

class ReceptionWorkstation extends TicketManager {
	constructor(user) {
		super(user, 'reception');
	}
	middleware() {
		let remove_from_queue = (response) => {
			if (!response.data) return;

			this.emit('ticket-changed', this.makeTicket(response.data));
		};

		let permission = _.get(this.user, ["fields", "permissions", "can-manage"]);
		let departments = _.reduce(permission, (accum, item, key) => {
			if (item)
				accum.push(key);
			return accum;
		}, []);

		_.forEach(departments, department => {
			let office = _.get(SharedEntities.get('departments', department), 'unit_of');

			this.subscribe({
				name: 'ticket.*',
				owner_id: '*',
				department: department,
				office: office
			}, remove_from_queue);
		});
	}
	getShared() {
		let ws_params = {
			workstation: this.getId()
		};

		let permission = _.get(this.user, ["fields", "permissions", "can-manage"]);
		let departments = _.reduce(permission, (accum, item, key) => {
			if (item)
				accum.push(key);
			return accum;
		}, []);

		let request_shared = [{
			name: 'timezone',
			params: ws_params
		}, {
			name: 'office',
			params: ws_params
		}, {
			name: 'services',
			params: {
				department: departments
			}
		}, {
			name: 'organization-chain',
			params: ws_params
		}, {
			name: 'workstations',
			params: {
				department: departments
			}
		}, {
			name: 'operators',
			params: {
				department: departments
			}
		}, {
			name: 'departments',
			params: {
				department: departments
			}
		}];

		return SharedEntities.request(request_shared);
	}
	getServiceInfo(params) {
		return connection.request('/reception/service-info', params)
	}
	getServiceDetails(params) {
		return connection.request('/reception/service-details', params)
			.then(data => _.isEmpty(data) ? [] : _.map(data, item => this.makeTicket(item)));
	}
	getWorkstationInfo(params) {
		return connection.request('/reception/workstation-info', params);
	}
	getAvailableSlots(params) {
		return connection.request('/prebook/service-stats', params);
	}
	turnoffWorkstation(params) {
		params.workstation = this.getId();
		return connection.request('/workstation/user-logout', params);
	}
	queryTickes(params) {
		return connection.request('/reception/query-tickets', params)
			.then(data => _.isEmpty(data) ? [] : _.map(data, item => this.makeTicket(item)));
	}
}


module.exports = ReceptionWorkstation;
