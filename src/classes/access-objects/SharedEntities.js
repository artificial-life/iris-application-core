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

		if (method == "replace") {
			storage[namespace] = value;
		} else {
			storage[namespace] = _.defaults(storage[namespace], value);
		}

		this.emit('update.' + namespace, storage[namespace]);
	}
	static get(namespace, key) {
		if (namespace && !key) return storage[namespace];

		return storage.hasOwnProperty(namespace) ? storage[namespace][key] : undefined;
	}
	static request(entity_name, params, method) {
		this._prepocessRequest(entity_name);
		return _.isArray(entity_name) ? Promise.map(entity_name, single => this._request(single.name, single.params, single.method)) : this._request(entity_name, params, method);
	}
	static _prepocessRequest(entity_name) {
		//@NOTE: hack before patchwerk ready; just disable it after
		if (_.isArray(entity_name)) {

			let mult = _.remove(entity_name, single => _.has(single, 'params.department') && _.isArray(single.params.department));
			_.forEach(mult, single => {
				_.forEach(single.params.department, dep => {
					let item = _.cloneDeep(single);
					item.params.department = dep;
					entity_name.push(item);
				});
			});
		}
	}
	static _request(entity_name, params, method) {
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


module.exports = SharedEntities;;;
