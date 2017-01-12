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
	_applyCustomFieldsTransform(data) {
		let custom_fields = data.workstation.custom_fields || {};

		_.forEach(custom_fields, (field, name) => {
			if (field === false) {
				data.fields_model[name].include = false;
			} else if (field === true && data.fields_model[name]) {
				data.fields_model[name].include = true;
			} else if (_.isPlainObject(field))
				data.fields_model[name] = field;
		});
	}
	makeTicket(data, hide_private_fields) {
		let ticket_data = hide_private_fields ? this.detachPrivateFields(data) : this.attachPrivateFields(data);
		let ticket = new Ticket(ticket_data, this);
		return ticket;
	}
	detachPrivateFields(data) {
		_.forEach(data.user_info_description, (value, name) => {
			(!!value.private) && _.unset(data.user_info, name);
		})

		return data;
	}
	attachPrivateFields(data) {
		_.forEach(this.private_fields, (value, name) => {
			data.user_info[name] = value;
		})

		return data;
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
		}).then((response) => this.transformPrintData(response, true));
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

		return connection.request('/' + module + '/ticket-confirm', copy).then((response) => {
			console.log(response);
			return this.transformPrintData(response);
		});
	}
	createPrivateFields(fields, fields_model) {
		let copy = _.cloneDeep(fields);
		this.private_fields = {};

		_.forEach(fields_model, (model, key) => {
			let name = model.key || key;
			let is_private = !!model.private;
			if (!is_private) return true;

			let value = copy[name];
			let hash = md5(value);
			this.private_fields[name] = value;
			copy[name] = hash;
		});

		return copy;
	}
	makeInfoDescription(fields_model) {

		return _.transform(fields_model, (acc, field, name) => {
			acc[field.key || name] = {
				private: !!field.private,
				label: field.label
			};
		}, {});
	}
	postprocessFields(fields, fields_model) {
		let copy = this.createPrivateFields(fields, fields_model);

		_.unset(copy, 'start');
		_.unset(copy, 'end');

		copy.workstation = copy.workstation || this.getId();
		copy.user_info_description = this.makeInfoDescription(fields_model);

		return copy;
	}
	prebookObserve(data) {
		data.workstation = data.workstation || this.getId();
		return connection.request('/prebook/ticket-observe', data)
	}
	prebookAvailable(data) {
		data.workstation = data.workstation || this.getId();
		return connection.request('/prebook/available-days', data)
	}
	transformPrintData(response, hide_private_fields) {
		if (!_.isEmpty(response.ticket) && response.success) {
			response.ticket = _.isArray(response.ticket) ? _.map(response.ticket, ticket => this.makeTicket(ticket, hide_private_fields)) : this.makeTicket(response.ticket, hide_private_fields);
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

module.exports = TicketRegister;
