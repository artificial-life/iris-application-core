'use strict'

let _ = require('lodash');
let Promise = require('bluebird');

var fetch = require('node-fetch');

function HttpConnectionMethod(server, port) {

	if (server.indexOf('http') !== 0) server = 'http://' + server;

	return {
		name: "http",
		auth: function () {
			return Promise.resolve(true)
		},
		close: function () {
			return Promise.resolve(true)
		},
		request: function (uri, data) {
			console.log(uri, data);
			let options = {
				method: 'POST',
				body: JSON.stringify(data),
				headers: {
					'Content-Type': 'application/json'
				}
			};
			let url = (server ? server : '') + (port ? ':' + port : '') + uri;
			return fetch(url, options)
				.then((d) => d.json()).catch((r) => {
					throw new Error('failed to fetch')
				})
		},
		subscribe: function (uri, callback) {
			throw new Error('not implemented yet')
		},
		unsubscribe: function (uri, callback) {
			throw new Error('not implemented yet')
		}
	}
};

module.exports = HttpConnectionMethod;