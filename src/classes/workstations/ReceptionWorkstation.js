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

		this.subscribe({
			name: 'ticket.*',
			owner_id: '*'
		}, remove_from_queue);
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
			params: ws_params
		}, {
			name: 'organization-chain',
			params: ws_params
		}];
		//@TODO: rework it after patchwerk rework
		_.forEach(departments, (department) => {
			let params = {
				department: department
			};

			request_shared.push({
				name: 'workstations',
				params: params,
				method: 'merge'
			})
			request_shared.push({
				name: 'operators',
				params: params,
				method: 'merge'
			});
		});
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
	queryTickes(params) {
		return connection.request('/reception/query-tickets', params)
			.then(data => _.isEmpty(data) ? [] : _.map(data, item => this.makeTicket(item)));
	}
}


module.exports = ReceptionWorkstation;;
