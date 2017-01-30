"use strict"

const EventEmitter2 = require('eventemitter2').EventEmitter2;
const Ticket = require('../ticket.js');

class Bank extends EventEmitter2 {
	constructor(connection) {
		super({
			maxListeners: 100
		});
		this.connection = connection;
		this.list = [];
	}
	makeTicket(data) {
		let ticket = new Ticket(data, this);
		return ticket;
	}
	update(ticket) {
		let id = ticket.getId();
		let index = _.findIndex(this.list, list_ticket => list_ticket.getId() == id);

		if (!ticket.isToday()) return;

		(~index) ? (this.list[index] = ticket) : this.add(ticket);

		this.emit('bank-changed', ticket);
	}
	add(ticket) {
		this.list.push(ticket);
	}
	flush() {
		this.list = [];
	}
	getAll(department) {
		return this.queryTickets({
			department
		}).then(x => {
			this.list = x;
			this.emit('bank-changed', x);
		});
	}
	queryTickets(params) {
		return this.connection.request('/reception/query-tickets', params)
			.then(data => _.isEmpty(data) ? [] : _.map(data, item => this.makeTicket(item)));
	}
}

module.exports = Bank;
