'use strict'

let _ = require('lodash');
let Promise = require('bluebird');

let EventEmitter2 = require('eventemitter2').EventEmitter2;
let SharedEntities = require('../access-objects/SharedEntities.js');
let Connection = require('../access-objects/connection-instance.js');

let connection = new Connection();

let event_tempaltes = {
	"default": "{event_name}.{org_chain}.{owner_id}",
	"office.average-waiting-time": "{event_name}.{org_chain}",
	"office.max-waiting-time": "{event_name}.{org_chain}",
	"workstation.change-state": "{event_name}.{org_chain}",
	"service-stats": "{event_name}.{org_chain}"
};

class BaseWorkstation extends EventEmitter2 {
	constructor(user, type) {
		super({
			maxListeners: 100
		});
		this.user = user;
		this.type = type;
		this.stored_subscriptions = [];
	}
	init(id, data) {
		this.label = data.label;
		this.id = id;
		this.id = id;
		this.fields = data;
		console.log('init', id);
		let bootstrap_uri = '/' + this.type + '/bootstrap';

		return connection.request(bootstrap_uri, {
				workstation: id
			})
			.then((data) => this.bootstrap(data))
			.then(() => this.getShared())
			.then(() => this.middleware())
			.then(() => {
				this.active = true;
			})
			.then(() => this.ready());
	}
	getAllowedDepartments(permission_name) {
		let permission = _.get(this.user, ["fields", "permissions", permission_name]);
		let departments = _.reduce(permission, (accum, item, key) => {
			if (item)
				accum.push(key);
			return accum;
		}, []);

		return departments;
	}
	leave() {
		return connection.request('/workstation/leave', {
				workstation: this.id
			})
			.then(() => this.cleanUp())
			.then(() => {
				this.active = false;
				return this.id;
			});
	}
	ready() {
		return connection.request('/' + this.type + '/ready', {
			workstation: this.getId()
		});
	}
	getId() {
		return this.id;
	}
	getShared() {
		return true;
	}
	middleware() {
		return true;
	}
	cleanUp() {
		this.removeAllListeners();
		return true;
	}
	bootstrap(data) {
		if (_.has(data, "workstation")) _.forEach(data.workstation, (field, field_name) => _.set(this, ['fields', field_name], field));

		return true;
	}
	subscriptionName(event) {
		//@TODO: make computed path to current office and department
		let org_chain = this.makeOrgChain(event);
		//@NOTE: rework this after stable Event API
		let event_name = _.isString(event) ? event : event.name;
		let params = _.isString(event) ? {} : event;
		let owner_id = params.owner_id || this.user.id;

		return this.templatize({
			event_name: event_name,
			org_chain: org_chain,
			owner_id: owner_id
		});
	}
	makeOrgChain(event) {
		let offices = _.map(SharedEntities.get('hierarchy'), 'id');
		if (_.has(event, 'department')) {
			offices[0] = event.department;
		}
		if (_.has(event, 'office')) {
			offices[1] = event.office || offices[1];
		}
		return _.join(_.reverse(offices), '.');
	}
	templatize(params) {
		let template = event_tempaltes[params.event_name] || event_tempaltes.default;

		return _.reduce(params, (acc, value, key) => acc.replace('{' + key + '}', value), template);
	}
	subscribe(event_name, cb) {
		let name = this.subscriptionName(event_name);

		let callback = event_name.expose_as ? ((data) => {
			cb && cb(data); //@NOTE: u may just expose event and not handle it
			this.emit(event_name.expose_as, data)
		}) : cb;

		this.stored_subscriptions.push({
			name: name,
			callback: callback,
			original: cb
		});

		return connection.subscribe(name, callback)
	}
	unsubscribe(event_name, cb) {
		if (!cb) return this.unsubscribeByName(event_name);

		let name = this.subscriptionName(event_name);
		let callback = _.find(this.stored_subscriptions, ['original', cb]).callback;

		return this._unsub(name, callback);
	}
	_unsub(name, callback) {
		return connection.unsubscribe(name, callback).then(() => {
			_.remove(this.stored_subscriptions, ['callback', callback]);
			return true;
		});
	}
	unsubscribeByName(event_name) {
		if (!event_name) return this.unsubscribeAll();
		let unsubs = _.chain(this.stored_subscriptions)
			.filter(['name', event_name])
			.map(event_data => this._unsub(event_data.name, event_data.callback))
			.value();

		return Promise.all(unsubs);
	}
	unsubscribeAll() {
		console.log('unsubscirbe all');
		let unsubs = _.map(this.stored_subscriptions, event_data => this._unsub(event_data.name, event_data.callback));

		return Promise.all(unsubs);
	}
	getId() {
		return this.id;
	}
}

module.exports = BaseWorkstation;
