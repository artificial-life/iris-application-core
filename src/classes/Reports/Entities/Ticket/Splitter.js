'use strict'

module.exports = {
	discover: function (name) {
		if (_.isNaN(parseInt(name, 10))) {
			return this[name];
		}
		let interval = parseInt(name, 10);
		return (t) => this.minute(interval, t);
	},
	"minute": function (interval, ticket) {
		let is_prebook = ticket && Array.isArray(ticket.time_description);
		let now;
		if (!is_prebook) {
			now = moment.parseZone(ticket.booking_date);
		}

		let minutes = is_prebook ? ticket.time_description[0] / 60 : now.hour() * 60 + now.minute();

		return _.padStart((minutes / interval | 0), 4, '0');
	}
};
