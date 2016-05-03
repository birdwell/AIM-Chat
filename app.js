// Setup basic express server
const express = require('express');
const router = express.Router();

const app = express();
const server = require('http').createServer(app);
const path = require('path');
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.set('views', path.join(__dirname, '/public/views'));
app.set('view engine', 'pug');

app.use(router);
app.use(express.static(path.join(__dirname, '/public')));

// Provide all routes here
router.get('/', function (req, res) {
  res.render('index');
});

router.get('/friendList', function (req, res) {
  res.render('friendList');
});

// Chatroom
var numUsers = 0;
var users = [];
var usernames = [];

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'p', this listens and executes
  socket.on('new message', function (msg) {
    // we tell the client to execute 'new message'
    console.log(socket.username + " is sending message in room: " + socket.room);
    io.sockets.in(socket.room).emit('new message', {
      username: socket.username,
      message: msg
    });
  });

  socket.on('serv new message', function (g, u, m) {
    io.sockets.in(g).emit('new message', {
      username: u,
      message: m
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) { return; }

    for(var i = 0; i < socket.rooms.length; i++) {
      socket.leave(socket.rooms[i]);
      socket.rooms.splice(socket.rooms.indexOf(i), 1);
    }

    var joinRoom = 'main';

    // we store the username in the socket session for this client
    socket.username = username;
    socket.join(joinRoom);
    socket.room = joinRoom;


    if(!socket.rooms) {
      socket.rooms = [];
    }
    socket.rooms.push(joinRoom);

    // user updating
    numUsers = numUsers + 1;
    addedUser = true;
    usernames.push(username);

    console.log(socket.username + " just joined " + socket.room + " and is in " + socket.rooms);

    socket.emit('login', {
      numUsers: numUsers,
      room: socket.room
    });

    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  socket.on('check username', function(username){
    if(usernames.indexOf(username) <= -1){
      socket.emit('checked username', true);
    } else {
      socket.emit('checked username', false);
    }
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    io.sockets.to(socket.room).emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    io.sockets.to(socket.room).emit('stop typing', {
      username: socket.username
    });
  });

  socket.on('change username', function(oldUsername){
    usernames.splice(usernames.indexOf(oldUsername), 1);
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      numUsers = numUsers - 1;

      usernames.splice(usernames.indexOf(socket.username), 1);

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });

  socket.on('serv disconnect', function(uname) {
    socket.broadcast.emit('user left', {
      username: uname,
      numUsers: numUsers
    });
  });

  /* GROUP LOGIC */
  socket.on('join room', function(roomId){
    socket.join(roomId);
    socket.room = roomId;
    if(!socket.rooms) {
      socket.rooms = [];
    }
    socket.rooms.push(roomId);
    console.log(socket.username + " joined " + socket.room + " and is in " + socket.rooms);
  });

  socket.on('leave room', function(roomId){
    socket.leave(roomId);
    socket.rooms.splice(socket.rooms.indexOf(roomId), 1);
    socket.room = null;
    console.log(socket.username + " left " + socket.room + " and is in " + socket.rooms);
  });

  socket.on('switch room', function(newRoom) {
    var oldRoom = socket.room;
    for(var i = 0; i < socket.rooms.length; i++){
      socket.leave(socket.rooms[i]);
    }
    socket.rooms.splice(socket.rooms.indexOf(oldRoom), 1);
    socket.room = newRoom;

    socket.join(newRoom);
    if(!socket.rooms) {
      socket.rooms = [];
    }
    socket.rooms.push(newRoom);
    console.log(socket.username + " joined " + socket.room + " and is in " + socket.rooms);
  });
});
