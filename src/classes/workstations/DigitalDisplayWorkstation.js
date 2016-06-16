'use strict'

let Base = require('./BaseWorkstation.js');

class DigitalDisplayWorkstation extends Base {
	constructor(user) {
		super(user, 'digital-display');
		this.request_shared = ['timezone', 'office', 'services', 'organization-chain'];
	}
	middleware() {
		return this.subscribe({
			name: 'digital-display.command',
			owner_id: this.getId()
		}, (event) => {
			console.log('<DD> new command:', event);
			let event_data = event.data;
			this.emit('command', new Buffer(event_data.data, 'hex'));
		})
	}
}

module.exports = DigitalDisplayWorkstation;