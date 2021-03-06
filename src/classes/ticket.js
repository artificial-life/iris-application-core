'use strict';

let _ = require('lodash');
let Promise = require('bluebird');
let moment = require('moment');

let secondsToTime = require('../utils/seconds-to-time.js');
let secondsToFullTime = require('../utils/seconds-to-full-time.js');
let SharedEntities = require('./access-objects/SharedEntities.js');

class Ticket {
	constructor(data, queue) {

		if (data instanceof Ticket) return data;

		this.queue = queue;
		_.defaults(this, data);
		this.utc_booking_date = data.booking_date;
		this.raw_label = this.label;

		if (!!this.inheritance_level) this.label = this.label + ' / ' + this.inheritance_level;
	}
	processFieldList() {
		let base = this.user_info_description || {};
		let description = _.defaults(base, SharedEntities.get('user-info-fields'));

		return _.reduce(this.user_info, (acc, item, name) => {
			if (description.hasOwnProperty(name)) {
				acc.push({
					label: _.get(description, [name, 'label']),
					value: item
				});
			}

			return acc;
		}, []);
	}
	get field_list() {
		return this.processFieldList();
	}
	get booking_date() {
		return moment.utc(this.utc_booking_date).valueOf();
	}
	hasEvent(event_name) {
		return !!_.find(this.history, ["event_name", event_name])
	}
	get is_prebook() {
		return this.hasEvent("book");
	}
	get is_activated() {
		return this.hasEvent("activate");
	}
	get is_postopned() {
		return this.hasEvent("postpone");
	}
	get is_routed() {
		return this.hasEvent("route") || !!this.inherits;
	}
	get just_routed() {
		let last = _.last(this.history);
		let event_name = _.get(last, "event_name");

		return event_name == "route";
	}
	get prebook_time() {
		if (!_.isArray(this.time_description)) return false;

		return {
			start: secondsToTime(this.time_description[0]),
			end: secondsToTime(this.time_description[1])
		};
	}
	get was_routed() {
		if (!!this.inherits) {
			return _.size(_.filter(this.history, ["event_name", "route"])) > 1;
		}

		return this.hasEvent("route");
	}
	getWaitingTime() {
		if (this.state != "registered" || this.hasEvent("restore") || this.hasEvent("route")) {
			return "";
		}

		let now = this.secondsFromDayStart();
		let start_time = this.is_prebook ? _.head(this.time_description) : this.secondsFromDayStart(this.booking_date);

		if (start_time > now) return "";

		return secondsToFullTime(now - start_time);
	}
	isToday() {
		let tz = SharedEntities.get('timezone');
		let time = (Date.now() - tz.offset);
		return moment(time).tz(tz.name).format('YYYY-MM-DD') == this.dedicated_date;
	}
	secondsFromDayStart(time) {
		let tz = SharedEntities.get('timezone');
		time = time || (Date.now() - tz.offset);

		return moment(time).tz(tz.name)
			.diff(moment.tz(tz.name)
				.startOf('day'), 'seconds');
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
	register() {
		return this.queue.registerTicket(this);
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
