'use strict';

let storage = require('./Storage.js');


class Settings {
	constructor(desc) {
		//@NOTE: later get description via url
		this.defaults = {};
		this.addDesc(desc || {});
	}
	addDesc(desc) {
		this.description = _.reduce(desc, (description, group) => {
			let items = _.reduce(group.items, (result, item, item_name) => {
				let el = item.element || 'input';
				let is_name = 'is' + _.capitalize(el);
				item[is_name] = true;
				item.name = item_name;
				result.push(item);
				//@NOTE: may be I can avoid duplication here
				this.defaults[item_name] = item.default;
				return result;
			}, []);

			description.push({
				items: items,
				name: group.name
			});
			return description;
		}, []);
	}
	setItem(name, value) {
		return storage.setItem(name, value)
	}
	getItem(name) {
		let item = storage.getItem(name);

		return item === null ? this.getDefaults(name) : item;
	}
	getDefaults(name) {
		return this.defaults[name];
	}
	setDefaults(name, value) {
		this.defaults[name] = value;
	}
}

let settings = new Settings();

module.exports = function () {
	return settings;
};
