const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const formatMessagePrivate = require('./utils/mesagesPrivate');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  videoUserJoin,
  getAllUser,
  getReceiderUser
} = require('./utils/users');


const app = express();
const server = http.createServer(app);
const io = socketio(server);

const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));
app.use("/peerjs", peerServer);

const botName = 'BOT';
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)

// Set some defaults (required if your JSON file is empty)
db.defaults({ chats: [] })
  .write()

// Run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    socket.join(user.username);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to room!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );


    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });


  socket.on("video-join-room", (room, userId) => {
    const videoUser = videoUserJoin(userId, room);
    socket.join(videoUser.room);
    socket.to(videoUser.room).broadcast.emit("user-connected", userId);

    socket.on('disconnect', () => {
      socket.to(videoUser.room).broadcast.emit('user-disconnected', userId);
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);
    const users = getAllUser();
    

   // Add a post
    db.get('chats')
    .push({ user: formatMessage(user.username, msg)})
    .write()

    if(msg.substr(0,3) === '/w '){
      msg = msg.substr(3)
      var ind = msg.indexOf(' ')
      if(ind !== -1){
        var name=msg.substring(0,ind)
        var msg = msg.substring(ind + 1)
        if(users.includes(name)){
          var rUser = getReceiderUser(name);
          console.log(rUser.username, msg)
          
          io.to(rUser.username).emit('whisper', formatMessagePrivate(user.username, rUser.username, msg))
          io.to(user.username).emit('whisper', formatMessagePrivate(user.username, rUser.username, msg))
          // console.log('Whisper!' + name + msg)
        }
        else{
          console.log("Not valid user")
        }
      }
      else{
        console.log("error")
      }
    }
else{
  console.log(user.room)
  io.to(user.room).emit('message', formatMessage(user.username, msg));
}
    
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
