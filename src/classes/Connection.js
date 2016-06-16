'use strict'

let _ = require('lodash');
let Promise = require('bluebird');

let EventEmitter2 = require('eventemitter2').EventEmitter2;
let settings = require('./Settings.js');

class Connection extends EventEmitter2 {
	constructor() {
		super();
		this.methods = {};
		this.token = false;
	}
	addConnectionProvider(provider) {
		let port = settings.getItem('api_port');
		let server = settings.getItem('api_server');
		let method = new provider(server, port);
		console.log('Connection: method added %s on ip %s:%s', method.name, server, port);

		if (_.isFunction(method.onDisconnect)) method.onDisconnect((reason) => {
			console.log('Connection method %s. Disconnect, coz %s', method.name, reason);
			this.emit('connection-shutdown', {
				method: method.name,
				reason: reason
			});
		})
		if (_.isFunction(method.onRestore)) method.onRestore(() => {
			console.log('Connection method %s. Restored.', method.name);
			this.emit('connection-restore', {
				method: method.name
			});
		})

		this.methods[method.name] = method;
		this.current_method = method.name;

	}
	getMethod(name) {
		let method_name = name || this.current_method;
		return this.methods[method_name];
	}
	setToken(token) {
		this.token = token || false;

		if (!token) return Promise.reject({
			reason: 'Invalid token'
		});

		let connections_notified = _.map(this.methods, (method) => method.auth(token));

		return Promise.all(connections_notified);
	}
	request(uri, data, method) {
		return this.getMethod(method).request(uri, data);
	}
	subscribe(uri, callback, method) {
		return this.getMethod(method).subscribe(uri, callback);
	}
	unsubscribe(uri, callback, method) {
		return this.getMethod(method).unsubscribe(uri, callback);
	}
	close() {
		return _.map(this.methods, (method) => method.close())
	}
}



module.exports = Connection;