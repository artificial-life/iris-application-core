'use strict'

let _ = require('lodash');
let Promise = require('bluebird');

let Connection = require('../access-objects/connection-instance.js');
let Ticket = require('../ticket.js');
let BaseWorkstation = require('./BaseWorkstation.js');

let connection = new Connection();

class TicketRegister extends BaseWorkstation {
	constructor(user, type) {
		super(user, type);
	}
	getTicketByPin(pin, history) {
		let request = connection.request(history ? '/ticket/history' : '/ticket/by-code', {
			code: pin
		})

		return request.then((data) => data.success ? this.makeTicket(data.ticket) : false);
	}
	makeTicket(data) {
		let ticket = new Ticket(data, this);
		return ticket;
	}
	refreshTicket(service_id) {

		let priorities = this.current_ticket_data ? _.cloneDeep(this.current_ticket_data.priority) : {};
		this.current_ticket_data = {
			service_count: _.isArray(service_id) ? _.fill(Array(service_id.length), 1) : 1,
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
		copy.workstation = copy.workstation || this.getId();
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
	confirm(fields, is_live, fields_model) {
		let copy = this.postprocessFields(fields, fields_model);
		let module = is_live ? 'queue' : 'prebook';

		return connection.request('/' + module + '/ticket-confirm', copy).then((response) => this.transformPrintData(response));
	}
	postprocessFields(fields, fields_model) {
		let copy = _.cloneDeep(fields);
		copy.workstation = copy.workstation || this.getId();

		if (_.isEmpty(fields_model)) return copy;

		_.forEach(fields_model, (model, name) => {
			if (!model.hasOwnProperty('label')) return true;

			let prop_name = model.key || name;

			if (!copy.hasOwnProperty(prop_name)) return true;

			let value = copy[prop_name];
			copy[prop_name] = {
				value: value,
				label: model.label
			};
		});

		return copy;
	}
	prebookObserve(data) {
		data.workstation = this.getId();
		return connection.request('/prebook/ticket-observe', data)
	}
	prebookAvailable(data) {
		data.workstation = data.workstation || this.getId();
		return connection.request('/prebook/available-days', data)
	}
	transformPrintData(response) {
		// console.log('Confirm', response);
		if (!_.isEmpty(response.ticket)) {
			response.ticket = _.isArray(response.ticket) ? _.map(response.ticket, ticket => this.makeTicket(ticket)) : this.makeTicket(response.ticket);
		}
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
}

module.exports = TicketRegister;;
