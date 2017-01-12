"use strict";

'use strict'

let _ = require('lodash');
let Promise = require('bluebird');

let Connection = require('../access-objects/connection-instance.js');
let Ticket = require('../ticket.js');
let TicketRegister = require('./TicketRegister.js');
let SharedEntities = require('../access-objects/SharedEntities.js');

let connection = new Connection();

class CallCenterWorkstation extends TicketRegister {
	constructor(user) {
		super(user, 'call-center');
		this.refreshTicket();
	}
	bootstrap(data) {
		let attached_terminal = _.castArray(this.fields.attached_terminal);
		let departments = this.getAllowedDepartments("can-book");

		let bootstrap_uri = '/terminal/bootstrap';
		let boot = _.map(attached_terminal, id => connection.request(bootstrap_uri, {
			workstation: id
		}));

		return Promise.all(boot).then(result => {
			this.terminals = _.reduce(result, (acc, term) => {
				if (!~departments.indexOf(term.workstation.attached_to)) return acc;
				this._applyCustomFieldsTransform(term);

				acc.push(term);
				return acc;
			}, []);

			return true;
		});
	}
	getShared() {
		let ws_params = {
			workstation: this.getId()
		};

		let departments = this.getAllowedDepartments("can-book");

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
		}];

		// @TODO: rework it after patchwerk rework
		_.forEach(departments, (department) => {
			let params = {
				department: department
			};
			request_shared.push({
				name: 'departments',
				params: params,
				method: 'merge'
			})
		});
		return SharedEntities.request(request_shared);
	}
}

module.exports = CallCenterWorkstation;;
