'use strict'

let _ = require('lodash');
let Promise = require('bluebird');
let io = require('socket.io-client');

let request_timeout = 15000;

function request() {
	let resolve;
	let reject;
	let promise = (new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	})).timeout(request_timeout);

	return {
		promise: promise,
		resolve: resolve,
		reject: reject
	}
}

function SocketConnectionMethod(server, port) {
	if (server.indexOf('http') !== 0) server = 'http://' + server;

	let awaits = [];
	let rid = 0;
	let socket = false;
	let auth_token = false;
	let auth_resolve;
	let auth_reject;
	let ready;
	let beats_left = 0;
	let interval_id = false;

	let dc_callback = (r) => console.log('disconnected:', r);
	let restore_callback = (r) => console.log('restored:', r);

	return {
		name: "socket",
		startHeartbeatCounter: function () {
			interval_id && clearInterval(interval_id);
			interval_id = setInterval(() => {
				beats_left += 1;

				if (beats_left > 5) {
					beats_left = 0;
					console.log('no heartbeat, reconnecting');
					if (socket.connected) socket.disconnect();
					socket.connect();
				}
			}, 12000);
		},
		lazyInit: function () {
			if (socket) return socket.connect();

			socket = io.connect(server + ':' + port);
			socket.io.timeout(10000);

			socket.on('connect', () => {

				socket.emit('message', {
					uri: '/auth',
					token: auth_token
				});
			});

			socket.on('disconnect', dc_callback.bind(this));

			socket.on('heartbeat', (d) => {
				beats_left = beats_left > 0 ? beats_left - 1 : 0;
			});

			socket.on('auth-accepted', (result) => {
				//@TODO: check result state and reason
				auth_resolve(true);
				restore_callback();
				this.resubscribe().then((r) => console.log('subs restored ', r.length));
				this.startHeartbeatCounter();
			});

			socket.on('message', (data) => {
				if (!data || !data.request_id || !awaits[data.request_id]) return false;

				let rid = data.request_id;
				let request = awaits[rid];

				if (request.promise.isPending())
					return data.state ? request.resolve(data.value) : request.reject(data.reason);
			});
		},
		resubscribe() {
			console.log('restore subscriptions');
			return Promise.all(_.map(this.subscriptions, (v, uri) => this.request('/subscribe', {
				event: uri
			})));
		},
		storeSubscribtion(uri) {
			//@NOTE: use MAP here
			this.subscriptions = this.subscriptions || {};
			this.subscriptions[uri] = true;
			console.log('subscription stored:', this.subscriptions);
		},
		removeSubscribtion(uri) {
			if (!this.subscriptions) return;
			delete this.subscriptions[uri];
			console.log('subscription removed:', this.subscriptions);
		},
		close: function () {
			socket.disconnect();
		},
		onDisconnect(cb) {
			dc_callback = cb;
		},
		onRestore(cb) {
			restore_callback = cb;
		},
		auth: function (token) {
			auth_token = token;

			ready = new Promise(function (res, rej) {
				auth_resolve = res;
				auth_reject = rej;
			}).timeout(request_timeout, 'operation timeout');

			ready.catch((e) => {
				console.log('connection closed');
				this.close();
			});

			this.lazyInit();

			return ready;
		},
		request: function (uri, data) {
			return ready.then(() => {
				data = data || {};
				console.log('request', uri, data);
				rid = (rid + 1) % 10000;
				data.request_id = rid;

				socket.emit('message', {
					uri: uri,
					data: data,
					request_id: rid
				});

				awaits[rid] = new request();

				return awaits[rid].promise;
			});
		},
		subscribe: function (uri, callback) {
			return this.request('/subscribe', {
				event: uri
			}).then((data) => {
				console.log('subscribed on', uri);
				this.storeSubscribtion(uri);
				socket.on(uri, callback);
				return true;
			});
		},
		unsubscribe: function (uri, callback) {
			return this.request('/unsubscribe', {
				event: uri
			}).then((data) => {
				this.removeSubscribtion(uri);
				socket.off(uri, callback);
				return true;
			});
		}
	};
}

module.exports = SocketConnectionMethod;