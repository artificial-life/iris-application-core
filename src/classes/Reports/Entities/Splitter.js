'use strict'

const group_delimiter = '::';
const name_delimiter = '--';

function getSpecificSplitter(type) {
	if (type == 'Ticket')
		return require('./Ticket/Splitter.js');
}

let Splitter = {
	compose(type, groups) {
		let names = _.map(groups, 'method');
		let fields = _.map(groups, 'field');
		let functions = _.map(names, name => this.discover(type, name));

		return this.build(functions, fields, this.transformNames(names, fields));
	},
	transformNames(names, fields) {
		return _.map(names, (name, index) => name == 'enum' ? 'enum-' + fields[index] : name)
	},
	discover(type, name) {
		//@TODO: discover by type
		let specific = getSpecificSplitter(type);

		if (specific && specific.discover(name)) {
			return specific.discover(name);
		}

		if (_.isNaN(parseInt(name, 10))) {
			return this[name];
		}
		let interval = parseInt(name, 10);
		return (t) => this.minute(interval, t);
	},
	build(functions, fields, names) {
		let composer = _.isEmpty(functions) ? (() => 'nogroup') : ((data) => _.map(functions, (f, index) => {
			let field_name = fields[index];
			let value = field_name ? data[field_name] : data;
			let function_name = names[index];

			return `${f(value)}${name_delimiter}${function_name}`;
		}).join(group_delimiter));

		return composer;
	},
	"minute": function (interval, date) {

		let now = moment.parseZone(date);
		return _.padStart(_.floor((now.hour() * 60 + now.minute()) / interval), 4, '0');
	},
	"month-day": function (date) {
		//@NOTE: dirty Oren hack
		//@NOTE: timezone check
		if (!~date.indexOf('+')) return moment.utc(date).format('DD');
		return moment.parseZone(date).format('DD');
	},
	"month": function (date) {
		//@NOTE: dirty Oren hack
		//@NOTE: timezone check
		if (!~date.indexOf('+')) return moment.utc(date).format('MM');
		return moment.parseZone(date).format('MM');
	},
	"week-day": function (date) {
		//@NOTE: dirty Oren hack
		//@NOTE: timezone check
		if (!~date.indexOf('+')) return moment.utc(date).format('d');
		return moment.parseZone(date).format('d');
	},
	"enum": function (field) {
		return field ? field.toString() : null;
	}
};

module.exports = Splitter;
