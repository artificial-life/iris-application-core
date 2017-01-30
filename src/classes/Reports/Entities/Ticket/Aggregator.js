'use strict'


function secondsToTime(secs) {
	secs = Math.round(secs);
	var hours = _.padStart(Math.floor(secs / (60 * 60)), 2, '0');

	var divisor_for_minutes = secs % (60 * 60);
	var minutes = _.padStart(Math.floor(divisor_for_minutes / 60), 2, '0');

	var divisor_for_seconds = divisor_for_minutes % 60;
	var seconds = _.padStart(Math.ceil(divisor_for_seconds), 2, '0');

	// var obj = {
	// 	"h": hours,
	// 	"m": minutes,
	// 	"s": seconds
	// };
	return `${hours}:${minutes}:${seconds}`;
}

let TicketAggregator = {
	'averageTime': function (data_array) {
		let sec = _.reduce(data_array, (s, d) => s + d, 0) / data_array.length / 1000;
		return secondsToTime(sec);
	},
	'averageTimeInSeconds': function (data_array) {
		return _.reduce(data_array, (s, d) => s + d, 0) / data_array.length / 1000;
	},
	'maxTimeInSeconds': function (data_array) {
		return _.max(data_array) / 1000;
	},
	'maxTime': function (data_array) {
		return secondsToTime(_.max(data_array) / 1000);
	}
};

module.exports = TicketAggregator;
