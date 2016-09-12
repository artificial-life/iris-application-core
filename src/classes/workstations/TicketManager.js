'use strict'

let BaseWorkstation = require('./BaseWorkstation.js');
let Connection = require('../access-objects/connection-instance.js');
let Ticket = require('../ticket.js');

let connection = new Connection();

class TicketManager extends BaseWorkstation {
	constructor(user, type) {
		super(user, type);
	}
	makeTicket(data) {
		let ticket = new Ticket(data, this);
		return ticket;
	}
	changeState(state, ticket) {
		if (!this.user.isLogged()) return Promise.reject('not logged');

		let uri = `/queue/ticket-${state}`;

		return connection.request(uri, {
			ticket: ticket.getId(),
			workstation: this.getId()
		}).then((data) => {
			if (!data.success) throw new Error('can not change state to', state);

			return this.makeTicket(data.ticket);
		});
	}
	routeTicket(ticket, route) {
		return connection.request('/queue/set-route', {
			ticket: ticket.getId(),
			workstation: this.getId(),
			service: route.service,
			destination: route.workstation
		});
	}
	postponeTicket(ticket) {
		if (!this.user.isLogged()) return Promise.reject('not logged');

		let ticket_id = (ticket instanceof Ticket) ? ticket.getId() : ticket;

		return this.changeState('postpone', ticket);
	}
	getAvailableRoutes(ticket) {
		return connection.request('/queue/available-routes', {
			ticket: ticket.getId()
		});
	}
	getTicketById(ticket) {
		if (!this.user.isLogged()) return Promise.reject('not logged');

		let ticket_id = (ticket instanceof Ticket) ? ticket.getId() : ticket;

		return this.wakeUpNeo().then(() => connection.request('/queue/ticket-by-id', {
			ticket: ticket_id,
			workstation: this.getId()
		})).then((data) => {
			if (!data.success) throw new Error('can not get ticket');

			return this.makeTicket(data.ticket);
		});
	}
	callAgain(ticket) {
		if (!this.user.isLogged()) return Promise.reject('not logged');

		return connection.request('/queue/call-again', {
			ticket: ticket.getId(),
			workstation: this.getId()
		});
	}
}

module.exports = TicketManager;
