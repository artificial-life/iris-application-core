module.exports = {
	entity: 'Ticket',
	group: [{
		field: '@id',
		method: 'enum'
	}],
	params: {
		'active': {
			aggregator: "sum",
			filter: ['state = processing'],
			meta: ["destination", "@id", "service"]
		}
	}
};
