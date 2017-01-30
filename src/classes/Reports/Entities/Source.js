'use strict';

class Source {
	constructor(data) {
		this.data = data;
	}
	format(a) {
		return a;
	}
	parse(callback) {
		callback(this.data.list);
		this.final();

		return this;
	}
	finally(callback) {
		this.final = callback;
	}
};

module.exports = Source;
