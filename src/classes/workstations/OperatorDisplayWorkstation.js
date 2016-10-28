'use strict'

let Settings = require('../access-objects/Settings.js');
let BaseWorkstation = require('./BaseWorkstation.js');
let Ticket = require('../ticket.js');
let SharedEntities = require('../access-objects/SharedEntities.js');
let Connection = require('../access-objects/connection-instance.js');

let connection = new Connection();
let settings = new Settings();

class OperatorDisplayWorkstation extends BaseWorkstation {
	constructor(user) {
		super(user, 'operator-display');
		let parent_id = settings.getItem('operator_arm_id');
		this.parent = parent_id;
	}
	bootstrap(data) {
		console.log('<OD> BOOT:', data);
		return true;
	}
	middleware() {
		return this.subscribe({
			name: 'ticket.*',
			owner_id: this.parent
		}, (event) => {
			this.emit('parent.action', {
				ticket: event.data
			});
		});
	}
	getShared() {
		let ws_params = {
			workstation: this.getId()
		};
		let dep = (this.fields.attached_to);

		let request_shared = [{
			name: 'office',
			params: ws_params
		}, {
			name: 'organization-chain',
			params: ws_params
		}, {
			name: 'workstations',
			params: {
				department: dep
			}
		}];

		return SharedEntities.request(request_shared);
	}
	makeTicket(data) {
		let ticket = new Ticket(data, this);
		return ticket;
	}
}

module.exports = OperatorDisplayWorkstation;
