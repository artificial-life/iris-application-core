'use strict'

let Connection = require('./classes/Connection.js');

let _ = require('lodash');

let connection = new Connection();

class Iris {
	constructor(ConnectionProviders, SettingsStorage) {
		_.forEach(ConnectionProviders, provider => connection.addConnectionProvider(provider))
	}
}

let socket = require('./SocketConnection.js');
let http = require('./HTTPConnection.js');
let IRIS = new Iris({
	socket,
	http
}, {});

module.exports = IRIS
