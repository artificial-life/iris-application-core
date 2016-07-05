'use strict'

let BaseWorkstation = require('./BaseWorkstation.js');
let Connection = require('../access-objects/connection-instance.js');

let connection = new Connection();


class ReportWorkstation extends BaseWorkstation {
	constructor(user) {
		super(user, 'reports');
	}
	getTable(template) {
		return connection.request('/reports/get-table', template, 'http').then(r => r.value);
	}
}

module.exports = ReportWorkstation;
