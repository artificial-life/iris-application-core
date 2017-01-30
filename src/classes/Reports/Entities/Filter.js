'use strict'

const operations = ['===', '<=', '>=', '!=', '=', '<', '>', ' in ', ' contains ', ' OR ', ' exsists'];

let composer = function (fns) {
	this.fns = fns;
};

composer.prototype.filter = function (d) {
	return _.reduce(this.fns, (a, f) => a = a && f(d), true)
};

function getSpecificFilter(type) {
	if (type == 'Ticket')
		return require('./Ticket/Filter.js');
}

let Filter = {
	compose(type, names) {
		if (_.isEmpty(names)) return () => true;

		let filters_functions = _.map(names, desc => this.discover(type, desc));
		return (d) => _.reduce(filters_functions, (a, f) => a && f(d), true);
	},
	discover(type, name) {
		if (this.isCondition(name)) return this.parse(type, name);

		let available_filters = getSpecificFilter(type);
		return available_filters[name];
	},
	isCondition(desc) {
		let result = false;
		_.forEach(operations, op => {
			if (!~desc.indexOf(op)) return true;
			result = true;
			return false;
		});

		return result;
	},
	parse(type, condition) {
		let operation = 'nope';
		let fn;
		_.forEach(operations, op => {
			if (~condition.indexOf(op)) {
				operation = op;
				return false;
			}
		});

		let {
			field,
			value
		} = this.extractFieldAndValue(operation, condition);

		switch (operation) {
		case '=':
			fn = (x) => x[field] == value;
			break;
		case '===':
			fn = (x) => x[field] === value;
			break;
		case '>':
			fn = (x) => x[field] > value;
			break;
		case '<':
			fn = (x) => x[field] < value;
			break;
		case '<=':
			fn = (x) => x[field] <= value;
			break;
		case '>=':
			fn = (x) => x[field] >= value;
			break;
		case '!=':
			fn = (x) => x[field] != value;
			break;
		case ' in ':
			fn = (x) => !!~value.split(',').indexOf(x[field]);
			break;
		case ' exsists':
			fn = (x) => !!x[field];
			break;
		case ' contains ':
			fn = (x) => (console.log(x), !!~(x[field] || '').toLowerCase().indexOf(value));
			break;
		case ' OR ':
			let first = this.discover(type, field);
			let sec = this.discover(type, value);

			fn = (x) => first(x) || sec(x);
			break;
		default:
			throw new Error(`Unknown operation ${operation}`);
		}
		return fn;
	},
	extractFieldAndValue(operation, condition) {
		let parts = condition.split(operation);
		return {
			field: _.trim(parts[0]),
			value: _.trim(parts[1])
		};
	}
};

module.exports = Filter;
