/* This is the main server file for pubg.io
 * @author TakLee96 / jiahang_li@outlook.com
 **/

const path = require('path');
const http = require('http');
const express = require('express');
const io = require('socket.io');

const app = express();
const server = http.createServer(app);
const socket = io(server);

// helper functions
function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// static routes
app.get('/', (req, res) => {
  res.sendFile('public/index.html', { root: __dirname });
});

app.get('/socket.io.dev.js', (req, res) => {
  res.sendFile('node_modules/socket.io-client/dist/socket.io.dev.js', { root: __dirname });
});

app.get('/socket.io.dev.js.map', (req, res) => {
  res.sendFile('node_modules/socket.io-client/dist/socket.io.dev.js.map', { root: __dirname });
});

app.use(express.static('public'));

// socket.io messages
socket.on('connection', (client) => {
  const conn = client.conn;
  log(`client ${conn.id}@${conn.remoteAddress} connected`);
  
  client.on('disconnect', () => {
    log(`client ${conn.id}@${conn.remoteAddress} disconnected`);
  });
});

// launch
server.listen(443, () => {
  const addr = server.address();
  console.log(`listening on ${addr.address}:${addr.port}`);
});
