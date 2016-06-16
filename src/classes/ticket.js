'use strict';

let _ = require('lodash');
let Promise = require('bluebird');
let moment = require('moment');

let secondsToTime = require('./seconds-to-time.js');

class Ticket {
  constructor(data, queue) {
    this.queue = queue;
    _.defaults(this, data);
    this.utc_booking_date = data.booking_date;
  }
  get booking_date() {
    return moment.utc(this.utc_booking_date).valueOf();
  }
  get is_prebook() {
    return !!_.find(this.history, (record) => record.event_name == 'book')
  }
  get is_postopned() {
    return !!_.find(this.history, (record) => record.event_name == 'postpone')
  }
  get prebook_time() {
    if (!_.isArray(this.time_description)) return false;

    return {
      start: secondsToTime(this.time_description[0]),
      end: secondsToTime(this.time_description[1])
    };
  }
  getId() {
    return this.id;
  }
  getLabel() {
    return this.label;
  }
  getHistory() {
    return this.history;
  }
  returnToQueue() {
    let action = 'open';
    return this.queue.changeState(action, this);
  }
  arrived() {
    let action = 'process';
    return this.queue.changeState(action, this);
  }
  close() {
    let action = 'close';
    return this.queue.changeState(action, this);
  }
  postpone() {
    let action = 'postpone';
    return this.queue.changeState(action, this).then((r) => {
      if (r.success) {
        this.state = r.ticket.state;
      }
      return r;
    });
  }
  callAgain() {
    return this.queue.callAgain(this);
  }
  byId() {
    return this.queue.getTicketById(this)
  }
  register() {
    return this.queue.registerTicket(this);
  }
}



module.exports = Ticket;