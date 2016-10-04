'use strict'

let BaseWorkstation = require('./BaseWorkstation.js');
let Connection = require('../access-objects/connection-instance.js');

let connection = new Connection();
let SharedEntities = require('../access-objects/SharedEntities.js');

class ReportsWorkstation extends BaseWorkstation {
	constructor(user) {
		super(user, 'reports');
	}
	getShared() {
		let ws_params = {
			workstation: this.getId()
		};

		let permission = _.get(this.user, ["fields", "permissions", "can-report"]);
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
		}, {
			name: 'qa-questions',
			params: ws_params
		}];

		_.forEach(departments, (department) => {
			let params = {
				department: department
			};

			request_shared.push({
				name: 'operators',
				params: params,
				method: 'merge'
			});
		});

		return SharedEntities.request(request_shared);
	}
	getTable(template) {
		return connection.request('/reports/get-table', template, 'http').then(r => r.value);
	}
}

module.exports = ReportsWorkstation;
