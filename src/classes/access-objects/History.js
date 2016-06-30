'use strict';

let store = [];

class History {
	constructor() {
		this.on = true;
	}
	warn(args) {
		let message = args.join(' ');
		let type = 'warn';
		return this.addHistoryRecord(type, message);
	}
	error(args) {
		let message = args.join(' ');
		let type = 'error';
		return this.addHistoryRecord(type, message);
	}
	log(args) {
		let message = args.join(' ');
		let type = 'log';
		return this.addHistoryRecord(type, message);
	}
	addHistoryRecord(type, message, details) {
		if (!this.on) return;
		store.push({
			type,
			message,
			details
		});
	}
	getHistoryPage(type, limit, offset) {
		//@TODO: some transforms here
		return store;
	}
	flush() {

	}
	flushByTime() {

	}
}

module.exports = History;
