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
		this.multiuser = false;
		this.use_default_ws = true;
	}
	getId() {
		return this.fields.id;
	}
	useDefault(value) {
		this.use_default_ws = value;
	}
	setMulti() {
		this.multiuser = true;
	}
	getWorkstation(type) {
		return _.find(this.occupied_workstations, (ws) => ws.type == type);
	}
	getAllWorkstationsByType(type) {
		return _.filter(this.occupied_workstations, (ws) => ws.type == type);
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
			console.log('Login error');
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
			//@WARN: ITS TEMPORARY
			if (result.success) {
				try {
					window.location.reload();
				} catch (e) {
					console.log('Yeap, we are not in browser');
				} finally {
					return Promise.resolve(true).delay(1000);
				}
			}
			//@WARN: ITS TEMPORARY
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
		return this.leave(from_workstation)
			.then(() => this.initWS(_.castArray(to_workstation)));

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
	getSelectedWorkstation() {
		let selected = _.castArray(this.fields.default_workstation);
		var available = this.getAvailableWorkstations();
		let arm_id = _.chain(this.workstation_types)
			.castArray()
			.flatMap(type => {
				let ws = settings.getItem(type + '_arm_id');
				return _.split(ws, ',');
			})
			.reduce((acc, ws) => {
				if (ws && !available[ws]) throw new Error('ws anavailable');

				ws && acc.push(ws);
				return acc;
			}, [])
			.value();

		return this.use_default_ws ? _.concat(arm_id, selected) : arm_id;
	}
	getSelectedWorkstationTypes() {
		var selected = this.getSelectedWorkstation();
		var available = this.getAvailableWorkstations();

		selected = _.isEmpty(selected) ? this.getDefaultWorkstaions() : selected;

		return _.reduce(selected, (acc, ws) => {
			if (available[ws]) acc.push(available[ws].device_type);
			return acc;
		}, [])
	}
	getDefaultWorkstaions() {
		//@TODO: work with "workstation_types" like with an array
		let available = this.fields.workstations.available;

		let selected = this.getSelectedWorkstation();

		if (this.multiuser) {
			return selected;
		}

		let arms_by_type = _.reduce(selected, (acc, ws) => {
			let av = available[ws];
			if (!av) return acc;
			acc[av.device_type] = acc[av.device_type] || ws;
			return acc;
		}, {})

		if (!_.isEmpty(arms_by_type)) return _.values(arms_by_type);


		let arm_id = _.keys(available).slice(0, 1);
		return arm_id;
	}
	getAvailableWorkstations() {
		return this.fields.workstations.available;
	}
	initWS(selected_workstation) {
		//@NOTE: User should be active after login or ws switch
		this.fields.paused = false;

		let workstations = this.getAvailableWorkstations();
		let targets = selected_workstation || this.getDefaultWorkstaions();


		let init = _.map(targets, (ws_id) => {
			let init_data = workstations[ws_id];

			if (_.isEmpty(init_data)) throw new Error('Init: WS anavailable');

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

module.exports = User;;;;;
