"use strict";

let CallCenterWorkstation = require('./CallCenterWorkstation.js');

class RegistryWorkstation extends CallCenterWorkstation {
	constructor(user) {
		super(user);
		this.route = "registry";
	}
}

module.exports = RegistryWorkstation;
