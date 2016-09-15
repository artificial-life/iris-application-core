'use strict';
let default_queue_data = {
	live: {
		tickets: [],
		count: 0
	},
	postponed: {
		tickets: [],
		count: 0
	}
};

let _ = require('lodash');
let Promise = require('bluebird');

let Connection = require('../access-objects/connection-instance.js');
let Ticket = require('../ticket.js');
let TicketManager = require('./TicketManager.js');
let SharedEntities = require('../access-objects/SharedEntities.js');

let connection = new Connection();

class ControlPanelWorkstation extends TicketManager {
	constructor(user) {
		super(user, 'control-panel');
	}
	bootstrap(data) {
		console.log('bootstrap:', data);
		this.emit('queue.update', {
			live: {
				count: 0,
				tickets: []
			},
			postponed: {
				count: 0,
				tickets: []
			}
		});
		return true;
	}
	getShared() {
		let ws_params = {
			workstation: this.getId()
		};
		let request_shared = [{
			name: 'timezone',
			params: ws_params
		}, {
			name: 'office',
			params: ws_params
		}, {
			name: 'services',
			params: ws_params
		}, {
			name: 'organization-chain',
			params: ws_params
		}];

		return SharedEntities.request(request_shared);
	}
	middleware() {
		let ready = () => this.ready();
		let id = _.floor(Math.random() * 1000);
		connection.on('connection-restore', ready);

		this.cleanUp = () => {
			super.cleanUp();
			connection.off('connection-restore', ready);
			return this.unsubscribe();
		};

		this.subscribe({
			name: 'command.logout',
			owner_id: this.getId(),
			expose_as: 'command-logout'
		}, () => {});

		//@TODO: use asterix route here office.*
		this.subscribe({
			name: 'office.max-waiting-time'
		}, (event) => {
			_.set(event, ['data', 'param'], "max-waiting-time");

			this.emit('office-status-change', event.data);
		});

		return this.subscribe({
			name: 'queue.head',
			owner_id: this.getId()
		}, (result) => {
			_.defaultsDeep(result, {
				data: default_queue_data
			});
			console.log('<SUB#%s> Queue Head Arrived:', id, result);
			let data = _.mapValues(result.data, (value, key) => {
				return key === 'room' ? value : {
					count: value.count,
					tickets: _.map(value.tickets, (ticket_data) => this.makeTicket(ticket_data))
				};
			});

			this.emit('queue.update', data);
		});
	}
	onUpdate(callback) {
		return this.on('queue.update', callback);
	}
	getNext() {

		if (!this.user.isLogged()) return Promise.reject('not logged');

		return this.wakeUpNeo().then(() => connection.request('/queue/ticket-next', {
			workstation: this.getId()
		})).then((data) => {
			if (!data.success) throw new Error('can not get ticket');

			return this.makeTicket(data.ticket);
		});
	}
	getQueuePage(state, limit, offset) {
		if (!this.user.isLogged()) return Promise.reject('not logged');

		return connection.request('/queue/list', {
			workstation: this.getId(),
			state,
			limit,
			offset
		});
	}
	changeState(state, ticket) {
		return this.wakeUpNeo().then(() => super.changeState(state, ticket));
	}
	routeTicket(ticket, route) {
		return this.wakeUpNeo().then(() => super.routeTicket(ticket, route));
	}
	wakeUpNeo() {
		return this.user.isPaused() ? this.user.resume() : Promise.resolve(true);
	}
}

module.exports = ControlPanelWorkstation;
