'use strict'

const TicketManager = require('./TicketManager.js');
const Connection = require('../access-objects/connection-instance.js');
const Bank = require('./TicketBank.js');
const WBank = require('./WorkstationBank.js');
const Report = require('../Reports/reports.js');
const Helper = require('../Reports/reception-helper.js');

const connection = new Connection();
const SharedEntities = require('../access-objects/SharedEntities.js');

class ReceptionWorkstation extends TicketManager {
	constructor(user) {
		super(user, 'reception');

		this.bank = new Bank(connection);
		this.wbank = new WBank(connection);
		this.report = new Report(this.bank);
		this.helper = new Helper(this.report);

		connection.on('connection-restore', () => {
			let permission = _.get(this.user, ["fields", "permissions", "can-manage"]);
			let departments = _.reduce(permission, (accum, item, key) => {
				if (item)
					accum.push(key);
				return accum;
			}, []);

			_.forEach(departments, department => this.bank.getAll(department));
		});
	}
	middleware() {
		let ticket_changed = (response) => {
			if (!response.data) return;

			let ticket = this.makeTicket(response.data);
			this.emit('ticket-changed', ticket);
			this.bank.update(ticket);
		};

		let permission = _.get(this.user, ["fields", "permissions", "can-manage"]);
		let departments = _.reduce(permission, (accum, item, key) => {
			if (item)
				accum.push(key);
			return accum;
		}, []);

		_.forEach(departments, department => {
			let office = _.get(SharedEntities.get('departments', department), 'unit_of');
			if (!office) return true;

			this.subscribe({
				name: 'ticket.*',
				owner_id: '*',
				department: department,
				office: office
			}, ticket_changed);

			this.subscribe({
				name: 'service-stats',
				department: department,
				office: office
			}, ({
				data
			}) => this.emit('service-stats', data));

			this.subscribe({
				name: 'workstation.change-state',
				department: department,
				office: office
			}, ({
				data
			}) => {
				(data.device_type == "control-panel") && this.wbank.update(data);
			});

			this.bank.getAll(department);
			this.wbank.getAll(department);
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
			name: 'services',
			params: {
				department: departments
			}
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
		}, {
			name: 'user-info-fields',
			params: ws_params
		}];

		return SharedEntities.request(request_shared);
	}
	getServiceInfo(params) {
		return this.helper.actionServiceInfo(params);
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
	queryTickets(params) {
		let request;

		if (params.field == "@id") {
			request = this.queryOne(params.text)
		} else {
			request = params.date ? connection.request('/reception/query-tickets', params) : this.helper.actionQueryTickets(params);
		};

		params.department = params.department || _.castArray(this.fields.attached_to);

		return request.then(data => _.isEmpty(data) ? [] : _.map(data, item => this.makeTicket(item)));
	}
	queryOne(ticket) {
		return connection.request('/ticket/by-id', {
			ticket
		});
	}
}


module.exports = ReceptionWorkstation;
