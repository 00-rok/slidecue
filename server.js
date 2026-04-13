// SlideCue 서버: PC 발표자 화면과 폰 리모컨을 세션 ID로 짝지어주고
// 리모컨의 버튼 입력을 PC로 실시간 중계한다.

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public 폴더의 정적 파일 (HTML/CSS/JS) 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 폰이 QR 찍고 들어오는 주소: /r/:sessionId -> remote.html 반환
app.get('/r/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'remote.html'));
});

// 메모리상 세션 저장: { sessionId: { presenterSocketId } }
const sessions = {};

io.on('connection', (socket) => {
  // PC 발표자가 새 세션을 만들 때
  socket.on('create-session', (sessionId) => {
    sessions[sessionId] = { presenter: socket.id };
    socket.join(sessionId);
    console.log(`[세션 생성] ${sessionId}`);
  });

  // 폰 리모컨이 특정 세션에 참여할 때
  socket.on('join-session', (sessionId) => {
    if (!sessions[sessionId]) {
      socket.emit('session-error', '세션을 찾을 수 없습니다');
      return;
    }
    socket.join(sessionId);
    // PC한테 "리모컨 연결됨" 알림
    io.to(sessions[sessionId].presenter).emit('remote-connected');
    console.log(`[리모컨 연결] ${sessionId}`);
  });

  // 리모컨 버튼 입력 (next/prev/laser/...) -> PC로 전달
  socket.on('control', ({ sessionId, action, payload }) => {
    if (!sessions[sessionId]) return;
    io.to(sessions[sessionId].presenter).emit('control', { action, payload });
  });

  socket.on('disconnect', () => {
    // 발표자가 나가면 세션 정리
    for (const [sid, info] of Object.entries(sessions)) {
      if (info.presenter === socket.id) {
        delete sessions[sid];
        console.log(`[세션 종료] ${sid}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`SlideCue 서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});
