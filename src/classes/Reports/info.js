'use strict'

module.exports = {
	entity: 'Ticket',
	group: [{
		field: 'service',
		method: 'enum'
	}],
	params: {
		"issued-tickets": {
			aggregator: "count",
			filter: ['hasEventRegister OR hasEventActivate']
		},
		"issued-tickets-services": {
			key: "service_count",
			aggregator: "sum",
			filter: ['hasEventRegister OR hasEventActivate']
		},
		"in-room": {
			aggregator: "count",
			filter: ['state != closed', 'state != expired', 'state != removed', 'state != booked']
		},
		"in-room-services": {
			key: "service_count",
			aggregator: "sum",
			filter: ['state != closed', 'state != expired', 'state != removed', 'state != booked']
		},
		"waiting": {
			aggregator: "count",
			filter: ['state = registered']
		},
		"waiting-services": {
			key: "service_count",
			aggregator: "sum",
			filter: ['state = registered']
		},
		"processing": {
			aggregator: "count",
			filter: ['state = processing']
		},
		"processing-services": {
			key: "service_count",
			aggregator: "sum",
			filter: ['state = processing']
		},
		"postponed": {
			aggregator: "count",
			filter: ['state = postponed']
		},
		"postponed-services": {
			key: "service_count",
			aggregator: "sum",
			filter: ['state = postponed']
		},
		"processed": {
			aggregator: "count",
			filter: ['state = closed']
		},
		"processed-services": {
			key: "service_count",
			aggregator: "sum",
			filter: ['state = closed']
		},
		"total-live": {
			aggregator: "count",
			filter: ['hasEventRegister']
		},
		"total-prebook": {
			aggregator: "count",
			filter: ['hasEventActivate']
		}
	}
};
