const socket = io();

socket.on('connect', function () {
  console.log('remote connected');
  socket.on('disconnect', function () {
    console.log('remote disconnected');
  });
});
