/* This is the main client file for pubg.io
 * @author TakLee96 / jiahang_li@outlook.com
 **/

/* global window, document, io, DISPLAY_WIDTH, DISPLAY_HEIGHT */

// socket.io message handling
const socket = io();

socket.on('connect', function () {
  console.log('remote connected');
  socket.on('disconnect', function () {
    console.log('remote disconnected');
  });
  
  socket.on('t24b.addPlayer.response', ({ error, id, map, time }) => {
    if (error) return console.error(error);
    console.log('t24b.addPlayer.response', id, map, time);
    state.id = id;
    state.map = map;
    state.time = time;
    render();
  });
  
  socket.on('t24b.action.response', ({ error, map, time }) => {
    if (error) return console.error(error);
    
    if (time > state.time) {
      console.log('t24b.action.response', map, time);
      state.map = map;
      state.time = time;
      render();
    } else {
      console.error('stale t24b.action.response', map, time);
    }
  })
});

// login handling
document.getElementById('goButton').addEventListener('click', function login(evt) {
  evt.preventDefault();
  const form = document.getElementById('loginForm');
  const username = form.username.value;
  const color = form.color.value;
  
  if (username === '') {
    return alert('Pick a cooler username!');
  }
  
  if (color === '#000000') {
    return alert("Don't just pick default black for color!");
  }
  
  socket.emit('t24b.addPlayer', { username, color })
});

// control state handling and rendering
const playground = document.getElementById('playground');
playground.width  = DISPLAY_WIDTH;
playground.height = DISPLAY_HEIGHT;
const pgContext = playground.getContext('2d');

const mouse = { x: 0, y: 0, down: false };
function updateMouseLocation(evt) {
  let rect = playground.getBoundingClientRect();
  mouse.x = evt.clientX - rect.left;
  mouse.y = evt.clientY - rect.top;
}

playground.addEventListener("mousemove", updateMouseLocation);
playground.addEventListener("mousedown", function (evt) {
  updateMouseLocation(evt);
  mouse.down = true;
});
playground.addEventListener("mouseup", function (evt) {
  updateMouseLocation(evt);
  mouse.down = false;
});

const keys = { w: false, s: false, a: false, d: false };
document.addEventListener('keydown', function (evt) {
  switch (evt.keyCode) {
    case 87: keys['w'] = true; break;
    case 83: keys['s'] = true; break;
    case 65: keys['a'] = true; break;
    case 68: keys['d'] = true; break;
    default: break;
  }
});

document.addEventListener('keyup', function (evt) {
  switch (evt.keyCode) {
    case 87: keys['w'] = false; break;
    case 83: keys['s'] = false; break;
    case 65: keys['a'] = false; break;
    case 68: keys['d'] = false; break;
    default: break;
  }
});

// game state handling and rendering
const state = {
  id: null,
  map: null,
  time: null,
};

function clip(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function getCameraPosition() {
  let myself = state.map.players[state.id];
  let cameraX = clip(myself.x, playground.width  / 2, state.map.size.width  - playground.width  / 2);
  let cameraY = clip(myself.y, playground.height / 2, state.map.size.height - playground.height / 2);
  
  return {
    top    : cameraY - playground.height / 2,
    left   : cameraX - playground.width  / 2,
    bottom : cameraY + playground.height / 2,
    right  : cameraX + playground.width  / 2,
  };
}

function computeMouseDirection() {
  let myself = state.map.players[state.id];
  let { top, left } = getCameraPosition();
  return {
    x: mouse.x - (myself.x - left),
    y: mouse.y - (myself.y - top),
  };
}

function render() {
  if (!state.map) return;
  pgContext.clearRect(0, 0, playground.width, playground.height);
  
  let { top, left, bottom, right } = getCameraPosition();
  
  function inRange(x, y) {
    return (
      left <= x && x <= right &&
      top <= y && y <= bottom
    );
  }
  
  function render2d(mapObject) {
    let x = mapObject.x - left;
    let y = mapObject.y - top;
    switch (mapObject.geometry.shape) {
      case 'square':
        let w = mapObject.geometry.size.width;
        let h = mapObject.geometry.size.height;
        x = x - w/2;
        y = y - h/2;
        pgContext.fillStyle = mapObject.geometry.color;
        pgContext.fillRect(x, y, w, h);
        break;
      case 'circle':
        let r = mapObject.geometry.size.radius;
        pgContext.beginPath();
        pgContext.fillStyle = mapObject.geometry.color;
        pgContext.arc(x, y, r, 0, 2 * Math.PI);
        pgContext.fill();
        break;
      default:
        console.error(`unknown geometry shape ${mapObject.geometry.shape}`);
    }
    
    if (mapObject.geometry.username) {
      pgContext.font = '12px monospace';
      pgContext.fillText(mapObject.geometry.username, x - 20, y - 40);
    }
    if (mapObject.geometry.hp) {
      pgContext.fillStyle = 'red';
      pgContext.fillRect(x - 20, y - 32.5, mapObject.geometry.hp * 0.4, 10);
    }
  }
  
  for (let player of Object.values(state.map.players)) {
    if (inRange(player.x, player.y)) {
      render2d(player);
    }    
  }
  for (let pickable of state.map.pickable) {
    // TODO: implement
  }
  for (let structure of state.map.structures) {
    if (inRange(structure.x, structure.y)) {
      render2d(structure);
    }
  }
}

// main loop
function main() {
  let x = 0, y = 0;
  if (keys['w']) y = y - 1;
  if (keys['s']) y = y + 1;
  if (keys['a']) x = x - 1;
  if (keys['d']) x = x + 1;
  if (state.id) {
    if (x !== 0 || y !== 0) {
      socket.emit('t24b.action', { type: 'MOVE', direction: { x, y } });
    }
    if (mouse.down) {
      socket.emit('t24b.action', {
        type: 'SHOOT',
        direction: computeMouseDirection(),
      });
    }
  }
}

setInterval(main, 50);
