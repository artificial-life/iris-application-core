'use strict';

let _ = require('lodash');
let Promise = require('bluebird');
let moment = require('moment');

let secondsToTime = require('../utils/seconds-to-time.js');

class Ticket {
	constructor(data, queue) {
		this.queue = queue;
		_.defaults(this, data);
		this.utc_booking_date = data.booking_date;
		this.raw_label = this.label;

		if (!!this.inheritance_level) this.label = this.label + ' / ' + this.inheritance_level;
	}
	get booking_date() {
		return moment.utc(this.utc_booking_date).valueOf();
	}
	hasEvent(event_name) {
		return !!_.find(this.history, ["event_name", event_name])
	}
	get is_prebook() {
		return this.hasEvent("book")
	}
	get is_postopned() {
		return this.hasEvent("postpone")
	}
	get is_routed() {
		let route = this.hasEvent("route");

		if (route) return true;

		return !!this.inherits;
	}
	get just_routed() {
		let last = _.last(this.history);
		let event_name = _.get(last, event_name);

		return event_name == "route";
	}
	get prebook_time() {
		if (!_.isArray(this.time_description)) return false;

		return {
			start: secondsToTime(this.time_description[0]),
			end: secondsToTime(this.time_description[1])
		};
	}
	getId() {
		return this.id || this['@id'];
	}
	getLabel() {
		return this.label;
	}
	getHistory() {
		return this.history;
	}
	returnToQueue() {
		let action = 'open';
		return this.queue.changeState(action, this);
	}
	priorityUp() {
		return this.queue.changePriority(1, this);
	}
	priorityDown() {
		return this.queue.changePriority(-1, this);
	}
	arrived() {
		let action = 'process';
		return this.queue.changeState(action, this);
	}
	close() {
		let action = 'close';
		return this.queue.changeState(action, this);
	}
	remove() {
		let action = 'remove';
		return this.queue.changeState(action, this);
	}
	restore() {
		let action = 'restore';
		return this.queue.changeState(action, this);
	}
	postpone() {
		let action = 'postpone';
		return this.queue.changeState(action, this).then((r) => {
			if (r.success) {
				this.state = r.ticket.state;
			}
			return r;
		});
	}
	callAgain() {
		return this.queue.callAgain(this);
	}
	byId() {
		return this.queue.getTicketById(this)
	}
	register() {
		return this.queue.registerTicket(this);
	}
}



module.exports = Ticket;
