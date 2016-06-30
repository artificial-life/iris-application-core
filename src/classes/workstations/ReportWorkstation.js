'use strict'

let BaseWorkstation = require('./BaseWorkstation.js');
let Connection = require('../access-objects/connection-instance.js');

let connection = new Connection();


class ReportWorkstation {
	constructor(user) {
		// super(user, 'report');
	}
	getTable(template) {
		return connection.request('/reports/get-table', template);
	}
}

module.exports = ReportWorkstation;
