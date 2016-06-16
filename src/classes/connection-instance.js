'use strict'

let Connection = require('./Connection.js');

let connection = new Connection();

let socket = require('./SocketConnection.js');
let http = require('./HTTPConnection.js');

connection.addConnectionProvider(http);
connection.addConnectionProvider(socket);

module.exports = connection;