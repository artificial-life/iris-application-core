'use strict'


let TicketTransforms = {
	processTime(ticket) {
		var history = ticket.history;
		var total = 0;
		var start_time = false;

		for (var i = 0; i < history.length; i++) {
			var item = history[i];
			var name = item.event_name;
			var is_start = name == 'processing';
			var is_end = is_start ? false : name == 'route' || name == 'postpone' || name == 'close' || name == 'remove';

			if (is_start) {
				start_time = item.time;
			} else if (is_end && start_time) {
				total += item.time - start_time;
				start_time = false;
			}
		}

		ticket.processTime = !!total ? total : -1;
	},
	waitingTime(ticket) {

		// var register = _.findLast(ticket.history, ['event_name', 'route']) || _.find(ticket.history, ['event_name', 'register']) || _.find(ticket.history, ['event_name', 'activate']);
		var register = _.find(ticket.history, ['event_name', 'register']) || _.find(ticket.history, ['event_name', 'activate']);
		var call = _.find(ticket.history, ['event_name', 'call']);


		if (!register) {
			ticket.waitingTime = -1;
			return;
		}

		if (!call && (ticket.state == 'closed' || ticket.state == 'expired' || ticket.state == 'removed')) {
			ticket.waitingTime = -1;
			return;
		}
		//@NOTE: in case of routing
		// if (call && (call.time - register.time < 0)) call = false;

		if (register.event_name == 'activate') {
			let time = moment.parseZone(register.local_time);
			let day_start = time.startOf('day').format('x');
			let ticket_start = ticket.initial_time_description ? ticket.initial_time_description[0] : ticket.time_description[0];
			register = {
				time: parseInt(day_start) + parseInt(ticket_start * 1000)
			};
		}

		if (!call) {
			let offset = moment.parseZone(register.local_time).utcOffset();
			let now = moment().utcOffset(offset);
			let day = now.format('YYYY-MM-DD');

			call = ticket.dedicated_date == day ? {
				time: now.format('x')
			} : false;
		}

		if (!call) {
			ticket.waitingTime = -1;
			return;
		}
		let dif = call.time - register.time;
		ticket.waitingTime = (dif > 0) ? dif : 0;
	},
	answers(ticket) {
		var answers = ticket.qa_answers;
		if (!answers) return;
		if (ticket.question0) return;

		for (var key in answers) {
			var index = key - 9;
			var answer = (answers[key] % 5) || 5;
			ticket['question' + index] = answer;
		}


		if (ticket.operator) return;
		let history = ticket.history;
		let oper = "";
		for (var i = 0; i < history.length; i++) {
			var entry = history[i];
			if (entry.event_name == "qa-check") break;
			if (entry.subject.type == "operator") oper = entry.subject.id;
		}
		ticket.operator = oper;
	},
	concatInfoFields(ticket) {
		let user_info = ticket.user_info;
		let description = ticket.user_info_description || {};
		let str = ""
		for (var key in user_info) {
			var value = user_info[key];
			var desc = description[key] || {};
			if (!desc.private) str += value + "$$";
		}

		ticket.userInfoString = str;
	}
};


module.exports = TicketTransforms;
