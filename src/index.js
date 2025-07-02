const TabichanClient = require('./client');
const TabichanWebSocket = require('./websocket');

module.exports = TabichanClient;
module.exports.TabichanClient = TabichanClient;
module.exports.TabichanWebSocket = TabichanWebSocket;
module.exports.default = TabichanClient;