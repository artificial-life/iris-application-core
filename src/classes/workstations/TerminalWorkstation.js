'use strict'

let _ = require('lodash');
let Promise = require('bluebird');

let connection = require('../connection-instance.js');
let Ticket = require('../ticket.js');
let BaseWorkstation = require('./BaseWorkstation.js');
let SharedEntities = require('../SharedEntities.js');

class TerminalWorkstation extends BaseWorkstation {
	constructor(user) {
		super(user, 'terminal');
		this.refreshTicket();
	}
	bootstrap(data) {
		console.log('TERMINAL BOOT:', data);
		this.service_views = data.views;
		this.fields_model = data.fields_model;
		//@NOTE: interval in minutes
		this.reload_interval = data.workstation.reload_interval * 60 * 1000;

		this.attachValidators();
		return true;
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
	attachValidators() {
		_.forEach(this.fields_model, (field) => {
			if (!field.validate) return true;
			let validators = _.isArray(field.validate) ? field.validate : [field.validate];
			field.validate = _.map(validators, validator => {
				if (_.isString(validator) && _.isFunction(this[validator]))
					return this[validator].bind(this);
			});
		});
	}
	getQA(code) {
		let device_type = this.type;
		return connection.request('/qa/questions', {
			code,
			device_type
		});
	}
	storeQAResults(answers, code) {
		let workstation = this.getId();
		return connection.request('/qa/answers', {
			workstation,
			answers,
			code
		});
	}
	getTicketByPin(pin) {
		let request = connection.request('/ticket/by-code', {
			code: pin
		})

		return request.then((data) => data.length ? this.makeTicket(data[0]) : false);
	}
	makeTicket(data) {
		let ticket = new Ticket(data, this);
		return ticket;
	}
	refreshTicket(service_id) {

		let priorities = this.current_ticket_data ? _.cloneDeep(this.current_ticket_data.priority) : {};
		this.current_ticket_data = {
			service_count: 1,
			priority: priorities
		};

		if (service_id) this.current_ticket_data.service = service_id;

		return this.current_ticket_data;
	}
	preCheck() {
		return this.checkAvailability(this.current_ticket_data);
	}
	registerTicket(ticket) {
		if (!this.user.isLogged()) return Promise.reject('not logged');

		let ticket_id = ticket.getId();

		return connection.request('/queue/ticket-register', {
			ticket: ticket_id,
			workstation: this.getId(),
			reason: 'terminal registration'
		}).then((response) => this.transformPrintData(response));
	}
	checkAvailability(fields) {
		let copy = _.cloneDeep(fields);
		copy.workstation = this.getId();
		return connection.request('/queue/ticket-observe', copy).then((r) => {
			console.log('Observe ticket:', r);
			return r.success;
		})
	}
	confirmTicket(fields) {
		return this.confirm(fields, true)
	}
	confirmPrebook(fields) {
		return this.confirm(fields, false);
	}
	confirm(fields, is_live) {
		let copy = _.cloneDeep(fields);
		copy.workstation = this.getId();
		let module = is_live ? 'queue' : 'prebook';

		return connection.request('/' + module + '/ticket-confirm', copy).then((response) => this.transformPrintData(response));
	}
	prebookObserve(data) {
		data.workstation = this.getId();
		return connection.request('/prebook/ticket-observe', data)
	}
	prebookAvailable(data) {
		data.workstation = this.getId();
		return connection.request('/prebook/available-days', data)
	}
	transformPrintData(response) {
		// console.log('Confirm', response);
		if (!_.isEmpty(response.ticket)) response.ticket = this.makeTicket(response.ticket);
		return response;
	}
	addPriority(type, certificate_id) {
		this.current_ticket_data.priority[type] = {
			certificate_id: certificate_id
		};
	}
	removePriority(type, certificate_id) {
		_.unset(this.current_ticket_data.priority, type);
	}
	dropPriorities() {
		this.current_ticket_data.priority = {};
	}
	getServiceViews() {
		return this.service_views;
	}
	getFieldsModel() {
		return this.fields_model

	}
}

module.exports = TerminalWorkstation;
