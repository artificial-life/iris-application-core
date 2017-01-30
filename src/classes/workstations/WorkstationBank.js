"use strict"

"use strict"

const EventEmitter2 = require('eventemitter2').EventEmitter2;

class Bank extends EventEmitter2 {
	constructor(connection) {
		super({
			maxListeners: 100
		});
		this.connection = connection;
		this.list = [];
	}
	update(ws) {
		let id = ws.id;
		let index = _.findIndex(this.list, list_ws => list_ws.id == id);

		(~index) ? (this.list[index] = ws) : this.add(ws);

		this.emit('bank-changed', ws);
	}
	add(ws) {
		this.list.push(ws);
	}
	flush() {
		this.list = [];
	}
	getAll(department) {
		return this.connection.request('/reception/workstation-info', {
			department
		}).then(x => {
			this.list = x;
			this.emit('bank-changed', x);
		});
	}
}

module.exports = Bank;
