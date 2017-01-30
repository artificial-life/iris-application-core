'use strict'

const Source = require('./Source.js');

let DataSource = {
	setDefaultBucket(default_bucket) {

	},
	discover(data) {
		//@TEST
		return new Source(data);
	}
};

module.exports = DataSource;
