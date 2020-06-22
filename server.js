/* This is the main server file for pubg.io
 * @author TakLee96 / jiahang_li@outlook.com
 **/

const path = require('path');
const http = require('http');
const express = require('express');
const io = require('socket.io');
const state = require('./lib/state');

const app = express();
const server = http.createServer(app);
const socket = io(server);

// helper functions
function log(client, msg) {
  console.log(`[${new Date().toISOString()}] ${[client.conn.id]} ${msg}`);
}

// static routes
app.get('/', (req, res) => {
  res.sendFile('public/index.html', { root: __dirname });
});

app.use(express.static('public'));
app.use(express.static('node_modules/socket.io-client/dist'));
app.use(express.static('lib'));

// socket.io messages
const t24b = new state();
socket.on('connection', (client) => {
  const conn = client.conn;
  log(client, `${conn.remoteAddress} connected`);
  
  client.on('disconnect', () => {
    log(client, `${conn.remoteAddress} disconnected`);
    t24b.removePlayer(client);
  });
  
  client.on('t24b.addPlayer', (player) => {
    log(client, `t24b.addPlayer ${JSON.stringify(player)}`);
    t24b.addPlayer(client, player);
    client.emit('t24b.addPlayer.response', { map: t24b.map, time: new Date() });
  });
  client.on('t24b.action', (action) => {
    log(client, `t24b.action ${JSON.stringify(action)}`);
    t24b.action(client, action);
    client.emit('t24b.action.response', { map: t24b.map, time: new Date() });
  });
});

// launch
server.listen(443, () => {
  const addr = server.address();
  console.log(`listening on ${addr.address}:${addr.port}`);
});
