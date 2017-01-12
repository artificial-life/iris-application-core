'use strict'

module.exports = function secondsToFullTime(time) {
	let hours = _.floor(time / (60 * 60));
	let mins = _.floor((time % 3600) / 60);
	let secs = time % 60;
	mins = mins.toString().length == 1 ? '0' + mins : mins;
	hours = hours.toString().length == 1 ? '0' + hours : hours;
	secs = secs.toString().length == 1 ? '0' + secs : secs;

	return `${hours}:${mins}:${secs}`;
};
