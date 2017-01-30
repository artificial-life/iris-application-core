'use strict'


const Splitters = require('./Entities/Splitter.js');
const Filters = require('./Entities/Filter.js');
const Aggregators = require('./Entities/Aggregator.js');
const DataSource = require('./Entities/DataSource.js');
const Transform = require('./Entities/Transform.js');



class Reports {
	constructor(bank) {
		this.bank = bank;
	}

	//API
	actionGetTable({
		table
	}) {
		let rows = table.params;
		let entity_name = table.entity;

		let source = DataSource.discover(this.bank);

		let group = Splitters.compose(entity_name, table.group);

		let fns = _.mapValues(rows, row => ({
			filter: Filters.compose(entity_name, row.filter),
			aggregator: Aggregators.get(entity_name, row.aggregator),
			transform: Transform.compose(entity_name, row.transform)
		}));

		let accumulator = {};
		let meta = {};

		let result = new Promise(function (resolve, reject) {
			source.finally(() => {
				let result = _.mapValues(accumulator, (group, group_index) => _.mapValues(group, (d, param_index) => {
					let value = fns[param_index].aggregator(d);
					return table.params[param_index].meta ? {
						value: value,
						meta: _.get(meta, [group_index, param_index])
					} : value;
				}));

				resolve(result);
			});
			source.parse((data) => {
				_.forEach(data, (a) => {

					let data_row = source.format(a);
					if (!data_row) return true;

					let group_index = false;

					_.forEach(rows, (row, index) => {
						let key = row.key;
						let meta_key = row.meta;
						let transform = _.get(fns, [index, 'transform']);
						let filter = _.get(fns, [index, 'filter']);

						if (transform) transform(data_row);

						if (!filter(data_row)) return true;

						group_index = group_index || group(data_row);

						let exported = key ? data_row[key] : 1;
						_.updateWith(accumulator, [group_index, index], (n) => n ? (n.push(exported) && n) : [exported], Object);
						if (meta_key) {
							let fields = meta_key == 'all' ? data_row : _.pick(data_row, meta_key);
							_.updateWith(meta, [group_index, index], (n) => n ? (n.push(fields) && n) : [fields], Object);
						}
					})
				})

			})
		});

		return result;
	}

}

module.exports = Reports;
