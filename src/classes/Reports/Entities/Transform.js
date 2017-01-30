'use strcit'


function getTransforms(type) {
	if (type == 'Ticket')
		return require('./Ticket/Transform.js');
}

let Transform = {
	compose(type, transforms) {
		if (_.isEmpty(transforms)) return false;

		let transform_registry = getTransforms(type);
		let transform_functions = _.map(transforms, name => transform_registry[_.camelCase(name)]);

		return (d) => _.transform(transform_functions, (a, f) => f(a), d);
	}
}

module.exports = Transform;
