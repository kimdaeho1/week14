// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  // 새로운 사용자가 들어오면 다른 사용자에게 알림
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.emit("joined", socket.id);
    socket.broadcast.to(roomId).emit("user-joined", { userId: socket.id });
  });

  socket.on("signal", (data) => {
    io.to(data.target).emit("signal", {
      signal: data.signal,
      callerId: data.callerId,
    });
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("user-disconnected", socket.id);
  });
});

server.listen(5000, () => console.log("Server is running on port 5000"));


// 서로의 정보를 주고받을 수 있는 중개역할.
// 시그널링 서버를 실행하려면 다음 명령어를 사용하세요 : node server.js