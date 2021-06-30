const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const roomName = document.getElementById("room-name");
const userName = document.getElementById("user-name");
const userList = document.getElementById("users");
const selectUser = document.getElementById("select-user");
const participants = document.getElementById("participants");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");


myVideo.muted = true;
const peers = {};

// Get username and room from URL
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();

var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "443",
});

let myVideoStream;
var currentPeer;
// var PCs;

var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

//Video call
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
}).then((stream) => {
  myVideoStream = stream;
  addVideoStream(myVideo, stream);

  peer.on("call", (call) => {
    call.answer(stream);
    const video = document.createElement("video");

    call.on("stream", (userVideoStream) => {
      addVideoStream(video, userVideoStream);
      currentPeer = call.peerConnection;
    });
  });

  socket.on("user-connected", (userId) => {
    // console.log(userId);
    connectToNewUser(userId, stream);
  });

  socket.on("share", (listUserConnected) => {
    // console.log(listUserConnected);
    shareScreenAll(listUserConnected, stream)
  });
});

socket.on('user-disconnected', userId => {
  if(peers[userId]) peers[userId].close();
});

peer.on("call", function (call) {
  getUserMedia(
    { video: true, audio: true },
    function (stream) {
      call.answer(stream); // Answer the call with an A/V stream.
      const video = document.createElement("video");
      call.on("stream", function (remoteStream) {
        addVideoStream(video, remoteStream);
      });
    },
    function (err) {
      console.log("Failed to get local stream", err);
    }
  );
});

peer.on("open", (id) => {
  // console.log(room);
  socket.emit("video-join-room", room, id);
});

const connectToNewUser = (userId, streams) => {
  var call = peer.call(userId, streams);
  var video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    // console.log(userVideoStream);
    addVideoStream(video, userVideoStream);
    currentPeer = call.peerConnection;
  });
  call.on('close', () => {
    video.remove();
  });

  peers[userId] = call;
};

// const shareScreenAll = (listUserConnected, streams) => {
//   // console.log(listUserConnected)
//   var call = peer.call(listUserConnected, streams);
//   call.on("stream", () => {
//     PCs = call.peerConnection;
//   });
//   console.log(PCs, call)
// };

//Add video stream
const addVideoStream = (videoEl, stream) => {
  videoEl.srcObject = stream;
  videoEl.addEventListener("loadedmetadata", () => {
    videoEl.play();
  });

  videoGrid.append(videoEl);
  let totalUsers = document.getElementsByTagName("video").length;
  if (totalUsers > 1) {
    for (let index = 0; index < totalUsers; index++) {
      document.getElementsByTagName("video")[index].style.width =
        100 / totalUsers + "%";
    }
  }
};

const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  } else {
    setStopVideo();
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
};

const muteUnmute = () => {
  var enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    setMuteButton();
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
};

const setPlayVideo = () => {
  const html = `<i class="unmute fa fa-pause-circle"></i>
  <span class="unmute">Play Video</span>`;
  document.getElementById("playPauseVideo").innerHTML = html;
};

const setStopVideo = () => {
  const html = `<i class=" fa fa-video-camera"></i>
  <span class="">Pause Video</span>`;
  document.getElementById("playPauseVideo").innerHTML = html;
};

const setUnmuteButton = () => {
  const html = `<i class="unmute fa fa-microphone-slash"></i>
  <span class="unmute">Unmute</span>`;
  document.getElementById("muteButton").innerHTML = html;
};
const setMuteButton = () => {
  const html = `<i class="fa fa-microphone"></i>
  <span>Mute</span>`;
  document.getElementById("muteButton").innerHTML = html;
};

const playShare = () => {
  navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: "always"
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true
    }
  }).then((stream) => {
    let videoTrack = stream.getVideoTracks()[0];
    videoTrack.onended= function(){
      stopScreenShare()
    }
    let sender = currentPeer.getSenders().find(function(s){
      
      return s.track.kind == videoTrack.kind;
    });
    sender.replaceTrack(videoTrack);
  
  }).catch((error) => {
    console.log("unable to get display " + error);
  });
};

function stopScreenShare(){
  let videoTrack = myVideoStream.getVideoTracks()[0]
  var sender = currentPeer.getSenders().find(function(s){
    return s.track.kind == videoTrack.kind
  })
  sender.replaceTrack(videoTrack)
}

// Join chatroom
socket.emit("joinRoom", { username, room });

// Get room and users
socket.on("roomUsers", ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

outputUserName(username);

// Message from server
socket.on("message", (message) => {
  console.log(message);

  outputMessage(message);
  

  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on("whisper", (messagepv) => {
  console.log('yeah');

  outputMessagePrivate(messagepv);
  

  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Message submit
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Get message text
  let msg = e.target.elements.msg.value;

  // console.log("r:" + receider + " s:" + senderMess + " m:" + msg)
  msg = msg.trim();

  if (!msg) {
    return false;
  }

  // Emit message to server
  socket.emit("chatMessage", msg);

  // Clear input
  e.target.elements.msg.value = "";
  e.target.elements.msg.focus();
});

// Output message to DOM
function outputMessage(message) {
  const div = document.createElement("div");
  div.classList.add("message");
  const p = document.createElement("p");
  p.classList.add("meta");
  p.innerText = message.username;
  p.innerHTML += `<span>${message.time}</span>`;
  div.appendChild(p);
  const para = document.createElement("p");
  para.classList.add("text");
  para.innerText = message.text;
  div.appendChild(para);
  document.querySelector(".chat-messages").appendChild(div);
  
}

function outputMessagePrivate(message) {
  const div = document.createElement("div");
  div.classList.add("message");
  const p = document.createElement("p");
  p.classList.add("meta");
  p.innerHTML = `<span>${message.nameS} to ${message.nameR}</span>`;
  p.innerHTML += `<span>${message.time}</span>`;
  div.appendChild(p);
  const para = document.createElement("p");
  para.classList.add("text-private");
  para.innerText = message.text;
  div.appendChild(para);
  document.querySelector(".chat-messages").appendChild(div);
  
}

// Add room name to DOM
function outputRoomName(room) {
  roomName.innerText = room;
}

function outputUserName(username) {
 userName.innerText = username;
}

// Add users to DOM
function outputUsers(users) {
  userList.innerHTML = "";
  var number = 0;
  users.forEach((user) => {
    const li = document.createElement("li");
    li.innerHTML = user.username;
    userList.appendChild(li);
    number = number + 1;
  });
  participants.innerHTML = number;
}

//Prompt the user before leave chat room
document.getElementById("leave-btn").addEventListener("click", () => {
  const leaveRoom = confirm("Are you sure you want to leave the chatroom?");
  if (leaveRoom) {
    window.location = "../index.html";
  } else {
  }
});

const showChat = () => {
const mainRight = document.getElementById("mainRight");
if(mainRight.style.display == "flex"){
  mainRight.style.display = "none";
}
else{
  mainRight.style.display = "flex";
}
}





