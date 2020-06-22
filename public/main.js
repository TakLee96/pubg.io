/* This is the main client file for pubg.io
 * @author TakLee96 / jiahang_li@outlook.com
 **/

const socket = io();

socket.on('connect', function () {
  console.log('remote connected');
  socket.on('disconnect', function () {
    console.log('remote disconnected');
  });
  
  socket.on('t24b.addPlayer.response', ({ error, map, time }) => {
    if (error) return console.error(error);
    console.log('t24b.addPlayer.response', map, time);
  });
  
  socket.on('t24b.action.response', ({ error, map, time }) => {
    if (error) return console.error(error);
    console.log('t24b.action.response', map, time);
  })
});

function login() {
  const form = document.getElementById('loginForm');
  const username = form.username.value;
  const color = form.color.value;
  
  if (username === '') {
    alert('Pick a cooler username!');
    return false;
  }
  
  if (color === '#000000') {
    alert("Don't just pick default black for color!");
    return false;
  }
  
  socket.emit('t24b.addPlayer', { username, color })
  return false;
}
