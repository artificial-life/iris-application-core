'use strict'

let BaseWorkstation = require('./BaseWorkstation.js');
let SharedEntities = require('../access-objects/SharedEntities.js');
let Connection = require('../access-objects/connection-instance.js');
let Ticket = require('../ticket.js');

let connection = new Connection();

class RoomdisplayWorkstation extends BaseWorkstation {
	constructor(user) {
		super();
		this.user = user;
		this.type = 'roomdisplay';
		this.queue = [];
		this.queue_to_play = [];
		this.queue_length = 40;
	}
	middleware() {
		this.default_voice_duration = this.fields.default_voice_duration || 40000;
		//@NOTE: hacky way to emebed external design, pls rework whole concept
		if (!this.fields.display_design) this.fields.display_design = window.location.pathname + "design/default.html";

		if (!this.fields.history_enabled) {
			let remove_from_queue = (event) => {
				let ticket = event.data;
				_.remove(this.queue, queue_ticket => _.get(queue_ticket, 'id') == _.get(ticket, 'id'));

				let first = _.head(this.queue_to_play);
				first = first ? first.id : false;

				_.remove(this.queue_to_play, (queue_ticket) => {
					return (_.get(queue_ticket, 'id') != first && _.get(queue_ticket, 'id') == _.get(ticket, 'id'))
				});

				this.emit('queue.change');
			};

			let events = ['postpone', 'processing', 'route', 'expire'];

			_.forEach(events, event => this.subscribe({
				name: 'ticket.' + event,
				owner_id: '*'
			}, remove_from_queue));
		}


		return this.subscribe({
			name: 'roomdisplay.command',
			owner_id: this.getId()
		}, (event) => {
			console.log('ticket called with data:', event);
			let event_data = event.data;
			let ticket = new Ticket(event_data.ticket);
			ticket.workstation = event_data.workstation;
			ticket.voice = event_data.voice;
			ticket.voice_duration = event_data.voice_duration || this.default_voice_duration;

			this.addToQueue(ticket);
			this.emit('queue.change');
		})
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
			name: 'organization-chain',
			params: ws_params
		}];

		return SharedEntities.request(request_shared);
	}
	makeTicket(data) {
		let ticket = new Ticket(data, this);
		return ticket;
	}
	onChange(cb) {
		this.on('queue.change', cb)
	}
	autoFlush() {
		if (this.flush_interval) clearInterval(this.flush_interval);
		if (!this.queue_to_play.length) return;

		console.log('Auto flush every 45 sec');
		this.flush_interval = setInterval(() => {
			console.log('Autoflush');
			this.queue_to_play.shift();
			this.emit('queue.change');
		}, 45000)
	}
	isSameID(ticket1, ticket2) {
		if (!(ticket1 instanceof Ticket) || !(ticket2 instanceof Ticket)) return false;
		return ticket1.getId() == ticket2.getId();
	}
	isSameWorkstation(ticket1, ticket2) {
		if (!(ticket1 instanceof Ticket) || !(ticket2 instanceof Ticket)) return false;
		return ticket1.workstation.id == ticket2.workstation.id;
	}
	played(ticket) {
		console.log('report played', ticket.getId());

		return connection.request('/roomdisplay/report-played', {
			ticket: ticket.getId(),
			success: true
		}).then(() => this.clearQueueToPlay(ticket));
	}
	clearQueueToPlay(ticket) {
		console.log('before clear queue', this.queue_to_play);

		_.remove(this.queue_to_play, queue_ticket => this.isSameID(queue_ticket, ticket) && this.isSameWorkstation(queue_ticket, ticket));

		console.log('clear queue', this.queue_to_play);

		this.emit('queue.change');
		this.autoFlush();
	}
	failed(ticket) {
		console.log('report failed', ticket.getId());

		return connection.request('/roomdisplay/report-played', {
			ticket: ticket.getId(),
			success: false
		}).then(() => this.clearQueueToPlay(ticket));
	}
	addToQueue(ticket) {
		if (this.queue_to_play.length == 0) this.autoFlush();

		_.remove(this.queue_to_play, (queue_ticket, index) => index && this.isSameID(queue_ticket, ticket) && !this.isSameWorkstation(queue_ticket, ticket));

		this.queue_to_play.push(ticket);

		_.remove(this.queue, queue_ticket => this.isSameID(queue_ticket, ticket));

		this.queue.unshift(ticket);

		this.queue = _.slice(this.queue, 0, this.queue_length);
	}
}

module.exports = RoomdisplayWorkstation;
