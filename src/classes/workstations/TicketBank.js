"use strict"

const EventEmitter2 = require('eventemitter2').EventEmitter2;
const Ticket = require('../ticket.js');

class Bank extends EventEmitter2 {
	constructor(connection, queue) {
		super({
			maxListeners: 100
		});
		this.connection = connection;
		this.list = [];
		this.queue = queue;
	}
	setTTL(seconds) {
		(this.int_id) && clearInterval(this.int_id);

		if (!seconds) return this;

		this.int_id = setInterval(() => this.refresh(), seconds * 1000);
		return this;
	}
	makeTicket(data) {
		let ticket = new Ticket(data, this.queue);
		return ticket;
	}
	update(ticket) {
		if (!ticket.isToday()) return;

		const id = ticket.getId();

		const index = _.findIndex(this.list, list_ticket => list_ticket.getId() == id);

		if (ticket.pack_member && ticket.state == "processing") {
			const session = ticket.session;
			_.forEach(this.list, lt => {
				if (lt.session != session || lt.state != "registered") return true;

				lt.state = "processing";
				this.emit('bank-changed', lt);
			});
		}

		(~index) ? (this.list[index] = ticket) : this.add(ticket);

		this.emit('bank-changed', ticket);
	}

	add(ticket) {
		this.list.push(ticket);
	}
	flush() {
		this.list = [];
	}
	refresh() {
		return this.getAll();
	}
	getAll(department) {
		if (!department && !this.department) return Promise.reject(new Error('no dep specified'));

		this.department = department || this.department;
		return this.queryTickets({
			department: this.department
		}).then(x => {
			this.list = x;
			console.log('BANK', x);
			this.emit('bank-changed', x);
		});
	}
	queryTickets(params) {
		return this.connection.request('/reception/query-tickets', params)
			.then(data => _.isEmpty(data) ? [] : _.map(data, item => this.makeTicket(item)));
	}
}

module.exports = Bank;
