'use strict'

let _ = require('lodash');
let Connection = require('./connection-instance.js');
let connection = new Connection();

let storage = {};
let makeUri = function (entity_name) {
	return '/shared-entities/' + entity_name
};

let models = {
	'timezone': {
		store: function (data) {
			let server_time = data.current_time;
			let timezone = data.timezone;
			let current_time = Date.now();
			let offset = current_time - server_time;

			return {
				server_time,
				name: timezone,
				current_time,
				offset
			};
		}
	}
};

class SharedEntities {
	constructor() {
		throw new Error('singletone');
	}
	static store(namespace, data, method) {
		let value = models.hasOwnProperty(namespace) ? models[namespace].store(data) : data;

		if (method == "merge") {
			storage[namespace] = _.defaults(storage[namespace], value);
		} else {
			storage[namespace] = value;
		}

		this.emit('update.' + namespace, storage[namespace]);
	}
	static get(namespace, key) {
		if (namespace && !key) return storage[namespace];

		return storage.hasOwnProperty(namespace) ? storage[namespace][key] : undefined;
	}
	static request(entity_name, params, method) {
		if (_.isArray(entity_name)) {
			return Promise.all(_.map(entity_name, (single) => connection.request(makeUri(single.name), single.params).then((data) => {
				this.store(data.namespace, data.entities, single.method);
				return true;
			})));
		}
		let uri = makeUri(entity_name);

		return connection.request(uri, params).then((data) => {
			this.store(data.namespace, data.entities, method);
			return true;
		});
	}
	static on(update_event, cb) {
		this.cbs = this.cbs || {};
		this.cbs[update_event] = this.cbs[update_event] || [];
		this.cbs[update_event].push(cb);
	}
	static emit(update_event, data) {
		let cbs = _.get(this.cbs, update_event);
		if (cbs) _.forEach(cbs, cb => cb.call(this, data))
	}
}


module.exports = SharedEntities;
