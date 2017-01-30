'use strict'

const event_names = ['register', 'call', 'activate', 'close', 'processing', 'book', 'postpone', 'expire', 'qa-check', 'remove'];

let inHistory = (ticket, event) => ~_.findIndex(ticket.history, ['event_name', event]);

let TicketFilter = {};


_.forEach(event_names, event => TicketFilter[_.camelCase('hasEvent-' + event)] = (ticket) => inHistory(ticket, event));
//@NOTE: "not" functions
_.forEach(event_names, event => TicketFilter['!' + _.camelCase('hasEvent-' + event)] = (ticket) => !(inHistory(ticket, event)));


module.exports = TicketFilter;
