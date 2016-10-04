'use strict'

let _ = require('lodash');
let Promise = require('bluebird');

let Connection = require('../access-objects/connection-instance.js');
let Ticket = require('../ticket.js');
let TicketRegister = require('./TicketRegister.js');
let SharedEntities = require('../access-objects/SharedEntities.js');

let connection = new Connection();

class TerminalWorkstation extends TicketRegister {
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
	getServiceViews() {
		return this.service_views;
	}
	getFieldsModel() {
		return this.fields_model

	}
}

module.exports = TerminalWorkstation;
