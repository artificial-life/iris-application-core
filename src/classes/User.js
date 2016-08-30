'use strict'

let _ = require('lodash');
let Promise = require('bluebird');

let EventEmitter2 = require('eventemitter2').EventEmitter2;
let Settings = require('./access-objects/Settings.js');
let Connection = require('./access-objects/connection-instance.js');

let connection = new Connection();
let settings = new Settings();


function discover(device_type) {
	let model_name = _.upperFirst(_.camelCase(device_type + '-workstation'));
	return window.IRIS[model_name];
	//@NOTE: do something with it later
	// @NOTE: may be it would be better to use npm install --save-dev aliasify
	// return require('./workstations/' + model_name + '.js');
}

class User extends EventEmitter2 {
	constructor(allowed_types) {
		super({
			maxListeners: 100
		});
		this.fields = {};
		this.workstation_types = allowed_types;
		this.occupied_workstations = [];
	}
	getId() {
		return this.fields.id;
	}
	getWorkstation(type) {
		return _.find(this.occupied_workstations, (ws) => ws.type == type);
	}
	getAvailableWorkstationTypes() {
		//@NOTE: this should be reworked!
		return _.chain(this.fields.workstations.available)
			.values()
			.uniqBy('device_type')
			.map('device_type')
			.value();
	}
	getWorkstationById(id) {
		return _.find(this.occupied_workstations, item => item.getId() == id)
	}
	login(login, password, params) {
		let login_sequence = connection.request('/login', {
				user: login,
				password: password
			}, 'http')
			.then((result) => {
				console.log('login result', result);
				return result;
			})
			.then((result) => result.state ? connection.setToken(result.value.token) : Promise.reject(result))
			.then(() => connection.request('/agent/info', params))
			.then((result) => this.setFields(result))
			.then(() => this.initWS())
			.then(() => {
				this.emit('user.fields.changed', this.fields);
				return true;
			});

		login_sequence.catch((e) => {
			this.clearFields();
			throw e;
		});

		return login_sequence;
	}
	isLogged() {
		return !!this.fields.logged_in;
	}
	isPaused() {
		return !!this.fields.paused;
	}
	logout() {
		let ids = _.map(this.occupied_workstations, ws => ws.getId());

		return connection.request('/logout', {
			workstation: ids
		}).then((result) => {
			console.log('<User> logout %s', result.success ? 'success' : 'failed');
			return result.success ? Promise.map(this.occupied_workstations, ws => ws.cleanUp()) : Promise.reject(result);
		}).then(() => {
			this.notifyLeave(this.occupied_workstations);
			this.clearFields();
			console.log('done');
		});
	}
	clearFields() {
		this.fields = {
			logged_in: false
		};
		this.occupied_workstations = [];

		connection.close();
		this.emit('user.fields.changed', this.fields);
		return true;
	}
	leave(workstation) {
		let to_leave = workstation ? _.map(_.castArray(workstation), id => this.getWorkstationById(id)) : this.occupied_workstations;
		let mass_leave = _.map(to_leave, ws => ws.leave());

		return Promise.all(mass_leave)
			.then((abandoned) => {
				_.remove(this.occupied_workstations, (ws) => ~_.indexOf(abandoned, ws.getId()));
				this.notifyLeave(abandoned);
				return true;
			})
	}
	notifyLeave(workstations) {
		_.chain(workstations)
			.map(ws => _.isObject(ws) ? ws.id : ws)
			.forEach(id => this.emit('workstation.leave', {
				id: id
			}))
			.value();
	}
	switchTo(to_workstation, from_workstation) {
		return this.leave(from_workstation).then(() => this.initWS(_.castArray(to_workstation)))
	}
	takeBreak() {
		return this.isPaused() ? this.resume() : this.pause()
	}
	pause() {
		let ids = _.map(this.occupied_workstations, ws => ws.id);

		return connection.request('/agent/pause', {
			workstation: ids
		}).then((r) => {
			r.method = 'pause';
			if (r.success) {
				this.fields.paused = !this.fields.paused;
				this.emit('user.fields.changed', this.fields);
			}
			return r;
		})
	}
	resume() {
		let ids = _.map(this.occupied_workstations, ws => ws.id);

		return connection.request('/agent/resume', {
			workstation: ids
		}).then((r) => {
			r.method = 'resume';
			if (r.success) {
				this.fields.paused = false;
				this.emit('user.fields.changed', this.fields);
			}
			return r;
		})
	}
	setFields(result) {
		console.log('Fields from agent', result);
		this.fields.logged_in = true;
		this.fields.paused = false;
		this.id = result.entity.id;
		this.fields.name = result.entity.first_name;
		this.fields.lastname = result.entity.last_name;
		this.fields.middlename = result.entity.middle_name;
		this.fields.default_workstation = result.entity.default_workstation || [];
		this.fields.permissions = result.entity.permissions;

		this.fields.workstations = Object.create(null);
		this.fields.workstations.available = result.ws_available;
		return true;
	}
	getDefaultWorkstaions() {
		//@TODO: work with "workstation_types" like with an array
		console.log('Allowed types:', this.workstation_types);
		let available = this.fields.workstations.available;

		let selected = _.castArray(this.fields.default_workstation);
		let arm_id = _.chain(this.workstation_types)
			.castArray()
			.map(type => {
				let ws = settings.getItem(type + '_arm_id');

				if (!available[ws]) throw new Error('ws anavailable');

				return ws;
			})
			.value();



		selected = _.concat(arm_id, selected);

		let arms_by_type = _.reduce(selected, (acc, ws) => {
			if (!available[ws]) return acc;
			let av = available[ws];
			acc[av.device_type] = acc[av.device_type] || ws;
			console.log(ws, acc);
			return acc;
		}, {})

		if (!_.isEmpty(arms_by_type)) return _.values(arms_by_type);


		arm_id = _.keys(available).slice(0, 1);
		return arm_id;
	}
	getAvailableWorkstations() {
		return this.fields.workstations.available;
	}
	initWS(selected_workstation) {
		let workstations = this.getAvailableWorkstations();
		let targets = selected_workstation || this.getDefaultWorkstaions();

		let init = _.map(targets, (ws_id) => {
			let init_data = workstations[ws_id];
			if (_.isEmpty(init_data)) throw new Error('WS anavailable');

			let Model = discover(init_data.device_type);
			let WS = new Model(this);

			return WS.init(ws_id, init_data)
				.then((result) => {
					console.log('<User> Emit Occupy #%s', ws_id);
					this.occupied_workstations.push(WS);
					this.emit('workstation.occupy', {
						id: ws_id,
						type: init_data.device_type
					});
					return result;
				});
		});

		return Promise.all(init);
	}
}

module.exports = User;
