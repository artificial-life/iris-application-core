'use strict'

let settings = require('../Settings.js');
let BaseWorkstation = require('./BaseWorkstation.js');
let Ticket = require('../ticket.js');
let SharedEntities = require('../SharedEntities.js');

class QaWorkstation extends BaseWorkstation {
  constructor(user) {
    super(user, 'qa');
  }
  bootstrap(data) {
    console.log('<QA> BOOT:', data);
    //@TODO: Rework this ugly sh*t
    let ws = this.user.getAvailableWorkstations()[this.getId()];
    let hold_screen_design = ws.hold_screen_design;
    //@TODO: Realy, rework it

    let data_server = settings.getItem('data_server');
    let data_port = settings.getItem('data_port');
    let data_host = 'http://' + (!!data_port ? data_server + ':' + data_port : data_server);
    this.hold_screen_design = data_host + hold_screen_design;
    return true;
  }
  middleware() {
    let parent_id = settings.getItem('operator_arm_id');
    let actions = ['processing', 'postpone', 'closed'];

    return _.map(actions, action => this.subscribe({
      name: 'ticket.' + action,
      owner_id: parent_id
    }, (event) => {
      this.emit('parent.action', {
        ticket: event.data,
        action: action
      });
    }));
  }
  storeQAResults(answers, code) {
    return connection.request('/qa/answers', {
      workstation: this.getId(),
      answers,
      code
    });
  }
  getQA(pin) {
    return connection.request('/qa/questions', {
      code: pin,
      device_type: this.type
    });
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
  makeTicket(data) {
    let ticket = new Ticket(data, this);
    return ticket;
  }
}

module.exports = QaWorkstation;