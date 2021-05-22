const users = [];
const videoUsers = [];

// Join user to chat
function userJoin(id, username, room) {
  const user = { id, username, room };

  users.push(user);

  return user;
}

// Get current user
function getCurrentUser(id) {
  return users.find(user => user.id === id);
}

function getReceiderUser(name) {
  return users.find(user => user.username === name);
}

//Get all users
function getAllUser(){
  var username = []
  users.forEach(user => {
    username.push(user.username)
  });

  return username
}

// User leaves chat
function userLeave(id) {
  const index = users.findIndex(user => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

// Get room users
function getRoomUsers(room) {
  return users.filter(user => user.room === room);
}

// Join user to chat
function videoUserJoin(userId, room) {
  const videoUser = { userId, room };

  videoUsers.push(videoUser);

  return videoUser;
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  videoUserJoin,
  getAllUser,
  getReceiderUser
};