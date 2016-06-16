'use strict'

let BaseWorkstation = require('./BaseWorkstation.js');
let SharedEntities = require('../SharedEntities.js');

class RoomdisplayWorkstation extends BaseWorkstation {
  constructor(user) {
    super();
    this.user = user;
    this.type = 'roomdisplay';
    this.queue = [];
    this.queue_to_play = [];
    this.queue_length = 40;
  }
  bootstrap(data) {
    console.log('Roomdisplay BOOT:', data);
    return true;
  }
  middleware() {
    this.default_voice_duration = this.fields.default_voice_duration || 40000;

    return this.subscribe({
      name: 'roomdisplay.command',
      owner_id: this.getId()
    }, (event) => {
      console.log('ticket called with data:', event);
      let event_data = event.data;
      let ticket = new Ticket(event_data.ticket);
      ticket.workstation = event_data.workstation;
      ticket.voice = event_data.voice;
      ticket.voice_duration = event_data.voice_duration || this.default_voice_duration;

      this.addToQueue(ticket);
      this.emit('queue.change');
    })
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
    }];

    return SharedEntities.request(request_shared);
  }
  makeTicket(data) {
    let ticket = new Ticket(data, this);
    return ticket;
  }
  onChange(cb) {
    this.on('queue.change', cb)
  }
  autoFlush() {
    if (this.flush_interval) clearInterval(this.flush_interval);
    if (!this.queue_to_play.length) return;

    console.log('Auto flush every 45 sec');
    this.flush_interval = setInterval(() => {
      console.log('Autoflush');
      this.queue_to_play.shift();
      this.emit('queue.change');
    }, 45000)
  }
  isSameID(ticket1, ticket2) {
    if (!(ticket1 instanceof Ticket) || !(ticket2 instanceof Ticket)) return false;
    return ticket1.getId() == ticket2.getId();
  }
  isSameWorkstation(ticket1, ticket2) {
    if (!(ticket1 instanceof Ticket) || !(ticket2 instanceof Ticket)) return false;
    return ticket1.workstation.id == ticket2.workstation.id;
  }
  played(ticket) {
    console.log('report played', ticket.getId());

    return connection.request('/roomdisplay/report-played', {
      ticket: ticket.getId(),
      success: true
    }).then(() => {
      _.remove(this.queue_to_play, queue_ticket => this.isSameID(queue_ticket, ticket) && this.isSameWorkstation(queue_ticket, ticket));

      this.emit('queue.change');
      this.autoFlush();
    });
  }
  failed(ticket) {
    console.log('report failed', ticket.getId());

    return connection.request('/roomdisplay/report-played', {
      ticket: ticket.getId(),
      success: false
    }).then(() => {
      _.remove(this.queue_to_play, queue_ticket => this.isSameID(queue_ticket, ticket) && this.isSameWorkstation(queue_ticket, ticket));
      this.emit('queue.change');
      this.autoFlush();
    });
  }
  addToQueue(ticket) {
    if (this.queue_to_play.length == 0) this.autoFlush();

    _.remove(this.queue_to_play, (queue_ticket, index) => index && this.isSameID(queue_ticket, ticket) && !this.isSameWorkstation(queue_ticket, ticket));

    this.queue_to_play.push(ticket);

    _.remove(this.queue, queue_ticket => this.isSameID(queue_ticket, ticket));

    this.queue.unshift(ticket);

    this.queue = _.slice(this.queue, 0, this.queue_length);
  }
}

module.exports = RoomdisplayWorkstation;