'use strict'

let _ = require('lodash');
let Promise = require('bluebird');

let EventEmitter2 = require('eventemitter2').EventEmitter2;

let settings = require('./Settings.js');
let connection = require('./connection-instance.js');


function discover(device_type) {
	let model_name = _.upperFirst(_.camelCase(device_type + '-workstation'));
	return require('./workstations/' + model_name + '.js');
}

class User extends EventEmitter2 {
	constructor(allowed_types) {
		super();
		this.fields = {};
		this.workstation_types = allowed_types;
		this.occupied_workstations = [];
	}
	getId() {
		return this.fields.id;
	}
	getWorkstation(type) {
		return _.find(this.occupied_workstations, (ws) => {
			return ws.type == type
		});
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
			console.log(e);
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
		let ids = _.map(this.occupied_workstations, ws => ws.id);

		return connection.request('/logout', {
			workstation: ids
		}).then((result) => {
			console.log('logout success');
			if (!result.success) return Promise.reject(result);
			return this.clearFields();
		});
	}
	clearFields() {
		this.fields = {};
		this.fields.logged_in = false;
		this.occupied_workstations = [];

		connection.close();
		this.emit('user.fields.changed', this.fields);
		return true;
	}
	leave(workstation) {
		let to_leave = workstation ? _.map(_.castArray(workstation), id => this.getWorkstationById(id)) : this.occupied_workstations;

		return Promise.all(_.map(to_leave, ws => {
				return ws.leave().then((r) => {
					this.emit('workstation.leave', {
						id: ws.id,
						type: ws.type
					});
					return r;
				});
			}))
			.then((result) => {
				_.remove(this.occupied_workstations, (ws) => ~_.indexOf(result, ws.getId()));
				return true;
			})
	}
	switchTo(selected_workstation) {
		return this.leave().then(() => this.initWS(_.castArray(selected_workstation)))
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
		this.fields.default_workstation = result.entity.default_workstation;
		this.fields.permissions = result.entity.permissions;

		this.fields.workstations = Object.create(null);
		this.fields.workstations.available = result.ws_available;
		return true;
	}
	getDefaultWorkstaions() {
		console.log('Allowed types:', this.workstation_types);
		let arm_id = settings.getItem(this.workstation_types + '_arm_id') || this.fields.default_workstation;

		if (arm_id && !_.isEmpty(arm_id)) return _.castArray(arm_id);

		let workstations = this.fields.workstations.available;
		arm_id = _.keys(workstations).slice(0, 1);
		return arm_id;
	}
	getAvailableWorkstations() {
		return this.fields.workstations.available;
	}
	initWS(selected_workstation) {
		let workstations = this.getAvailableWorkstations();
		let targets = selected_workstation || this.getDefaultWorkstaions();

		let init = _.map(targets, (ws) => {
			let init_data = workstations[ws];

			if (_.isEmpty(init_data)) throw new Error('WS anavailable')




			let Model = discover(init_data.device_type);
			let WS = new Model(this);

			this.occupied_workstations.push(WS);

			let boot = WS.init(init_data.id, init_data);

			boot.then(() => {
				this.emit('workstation.occupy', {
					id: init_data.id,
					type: init_data.device_type
				});
			});

			return boot;
		});

		return Promise.all(init);
	}
}

module.exports = User;