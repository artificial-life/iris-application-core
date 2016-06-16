'use strict'

let connection = require('../connection-instance.js');
let BaseWorkstation = require('./BaseWorkstation.js');
let Ticket = require('../ticket.js');
let SharedEntities = require('../SharedEntities.js');

class PandoraBoxWorkstation extends BaseWorkstation {
  constructor(user) {
    super(user, 'pandora-box');
  }
  bootstrap(data) {
    console.log('<Pandora Model> BOOT:', data);
    return true;
  }
  getShared() {
    let ws_params = {
      workstation: this.getId()
    };
    let request_shared = [{
      name: 'timezone',
      params: ws_params
    }, {
      name: 'office',
      params: ws_params
    }, {
      name: 'organization-chain',
      params: ws_params
    }, {
      name: 'services',
      params: ws_params
    }];

    return SharedEntities.request(request_shared);
  }
  getPlacementSnapshot(dedicated_date) {
    return connection.request('/pandora-box/placement-snapshot', {
      workstation: this.getId(),
      dedicated_date: dedicated_date
    }).then((tickets) => {
      return _.map(tickets, t => this.makeTicket(t))
    });
  }
  makeTicket(data) {
    let ticket = new Ticket(data, this);
    return ticket;
  }

}

module.exports = PandoraBoxWorkstation;