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
  console.log(`[${new Date().toISOString()}] ${[client.id]} ${msg}`);
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
    if (t24b.players[client.id]) {
      t24b.removePlayer(client);
    }
  });
  
  client.on('t24b.addPlayer', (player) => {
    log(client, `t24b.addPlayer ${JSON.stringify(player)}`);
    t24b.addPlayer(client, player);
    let updatedState = { id: client.id, map: t24b.map, time: Date.now(), shots: [] };
    client.emit('t24b.addPlayer.response', updatedState);
    client.broadcast.emit('t24b.action.response', updatedState);
  });
  
  client.on('t24b.action', (action) => {
    if (t24b.players[client.id]) {
      let alreadyEnded = t24b.gameover();
      let { affectedNeighbors, shots } = t24b.action(client, action);
      let ending = !alreadyEnded && t24b.gameover();
      if (ending || affectedNeighbors.length > 0) {
        log(client, `t24b.action ${JSON.stringify(action)} ${affectedNeighbors}`);
        let updatedState = { map: t24b.map, shots, time: Date.now() };
        if (ending) {
          socket.sockets.emit('t24b.action.response', updatedState);
        } else {
          for (let neighbor of affectedNeighbors) {
            let target = client;
            if (neighbor != client.id) {
              target = client.broadcast.to(neighbor);
            }
            target.emit('t24b.action.response', updatedState);
          }
        }
      } else {
        log(client, `FAILED t24b.action ${JSON.stringify(action)}`);
      }
    } else {
      log(client, `STALE t24b.action ${JSON.stringify(action)}`);
      client.emit('relogin', { error: 'Server restarted; please relogin!' });
    }
  });
});

// launch
server.listen(443, () => {
  const addr = server.address();
  console.log(`listening on ${addr.address}:${addr.port}`);
});
