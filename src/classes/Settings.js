'use strict'

let storage = {};

class Settings {
	static getItem(name) {
		return storage[name];
	}
	static setItem(name, value) {
		storage[name] = value;
	}
}

module.exports = Settings;