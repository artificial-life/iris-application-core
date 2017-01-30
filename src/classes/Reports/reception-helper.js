'use strict'

let TABLE_TEMPLATE = require('./info.js');
let ACTIVE_TICKETS_TEMPLATE = require('./active.js');

class Reception {
	constructor(reporter) {
		this.reporter = reporter;
		//@FIXIT: make solid concept
	}
	getNow() {
		return 'now';
	}
	getTodayStats(params, template) {

		return this.reporter.actionGetTable({
			table: template
		});
	}
	actionServiceDetails(params) {
		if (!params.tag) return {
			entity: 'Ticket',
			params: {
				tickets: {
					meta: "all",
					aggregator: "count",
					filter: []
				}
			}
		};

		let first_name = _.head(params.tag);

		let picked = _.cloneDeep(TABLE_TEMPLATE.params[first_name]);

		picked.meta = 'all';

		let template = {
			entity: 'Ticket',
			params: {
				tickets: picked
			}
		};

		return template;
	}
	actionServiceInfo(params) {
			//@FIXIT: event model here

			let stats = this.getTodayStats(params, TABLE_TEMPLATE);
			// let available = this.emitter.addTask('prebook', {
			// 	_action: 'service-stats',
			// 	organization: params.department
			// });

			return stats;

		}
		//@WARNING: rework it
	_getWorkstationInfo(params) {
		let requests = {
			active_tickets: this.getTodayStats(params, ACTIVE_TICKETS_TEMPLATE),
			workstations: patchwerk.get('Workstation', {
				department: params.department,
				counter: '*'
			})
		};

		return Promise.props(requests)
			.then(data => {
				let workstations = _.transform(data.workstations, (acc, ws) => {
					acc.push(_.pick(ws, ['id', 'label', 'occupied_by', 'provides', 'state']));
				}, []) || [];
				// let workstations = data.workstations || [];

				_.forEach(data.active_tickets, ticket => {
					let meta = _.head(ticket.active.meta);
					let dest = meta.destination;

					let owner = _.find(workstations, ['id', dest]);
					if (owner) owner.current_ticket = meta;
				});

				return workstations;
			});
	}

	actionQueryTickets(query) {

		let params = {
			department: query.department
		};

		if (_.isString(query.date)) {
			params.date = query.date;
		}

		let template = this.actionServiceDetails(query);

		template.params.tickets.filter = _.concat(template.params.tickets.filter, this.computeFilter(query));
		template.params.tickets.transform = this.computeTransform(query);

		let path = ['nogroup', 'tickets', 'meta'];

		return this.getTodayStats(params, template).then(q => _.get(q, path))
	}
	computeFilter(query) {
		let filter = [];

		if (query.field != 'service' && query.text) filter = [`${query.field} contains ${query.text}`];
		if (query.field == 'service' && query.text) filter = [`${query.field} in ${query.text}`];

		if (query.field == 'session') filter.push('pack_member = 1');
		if (query.field == 'allInfoFields' && query.text) filter = [`userInfoString contains ${query.text}`];

		if (query.state) filter.unshift(`state = ${query.state}`);

		return filter;
	}
	computeTransform(query) {
		let transform = [];

		if (query.field == 'allInfoFields' && query.text) transform.push('concatInfoFields');

		return transform;
	}
	getSingleTicket(id) {
		return this.emitter.addTask('ticket', {
			_action: 'by-id',
			ticket: id
		});
	}

	//@WARNING: rework it
	actionWorkstationInfo(params) {
		let now = Date.now();
		let department = params.department;
		let timestamp = _.get(this.cached_workstation_info, [department, 'timestamp']) || 0;

		if (now - timestamp < this.cache_ttl) {
			return _.get(this.cached_workstation_info, [department, 'workstations']);
		}

		return this._getWorkstationInfo(params).then(workstations => {
			_.set(this.cached_workstation_info, [department, 'workstations'], workstations);

			return workstations;
		});
	}

}

module.exports = Reception;
