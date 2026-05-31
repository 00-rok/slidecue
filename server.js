// SlideCue 서버: 리모컨 중계 + 실시간 Q&A
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/r/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'remote.html'));
});

app.get('/q/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qna.html'));
});

// 세션: { sessionId: { presenter, questions:[], remoteConnected:false } }
const sessions = {};

io.on('connection', (socket) => {
  socket.on('create-session', (sessionId) => {
    sessions[sessionId] = { presenter: socket.id, questions: [], remoteConnected: false };
    socket.join(sessionId);
    console.log(`[세션 생성] ${sessionId}`);
  });

  socket.on('join-session', (sessionId) => {
    const s = sessions[sessionId];
    if (!s) { socket.emit('session-error', '세션을 찾을 수 없습니다'); return; }
    // 이미 리모컨이 연결돼 있으면 거부
    if (s.remoteConnected) {
      socket.emit('remote-busy', '이미 다른 기기가 리모컨으로 연결되어 있습니다');
      return;
    }
    s.remoteConnected = true;
    s.remoteSocket = socket.id;
    socket.join(sessionId);
    io.to(s.presenter).emit('remote-connected');
    socket.emit('questions-update', s.questions);
    console.log(`[리모컨 연결] ${sessionId}`);
  });

  socket.on('join-qna', (sessionId) => {
    const s = sessions[sessionId];
    if (!s) { socket.emit('session-error', '세션을 찾을 수 없습니다'); return; }
    socket.join(sessionId);
    socket.emit('questions-update', s.questions);
    console.log(`[청중 연결] ${sessionId}`);
  });

  socket.on('control', ({ sessionId, action, payload }) => {
    if (!sessions[sessionId]) return;
    io.to(sessions[sessionId].presenter).emit('control', { action, payload });
  });

  socket.on('submit-question', ({ sessionId, text }) => {
    const s = sessions[sessionId];
    if (!s || !text || !text.trim()) return;
    const question = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      text: text.trim().substring(0, 300),
      likes: 0,
      time: Date.now()
    };
    s.questions.push(question);
    io.to(sessionId).emit('questions-update', s.questions);
    console.log(`[질문 등록] ${sessionId}: ${question.text}`);
  });

  socket.on('like-question', ({ sessionId, questionId }) => {
    const s = sessions[sessionId];
    if (!s) return;
    const q = s.questions.find(q => q.id === questionId);
    if (q) { q.likes++; io.to(sessionId).emit('questions-update', s.questions); }
  });

  socket.on('disconnect', () => {
    for (const [sid, info] of Object.entries(sessions)) {
      // 발표자가 나가면 세션 삭제
      if (info.presenter === socket.id) {
        delete sessions[sid];
        console.log(`[세션 종료] ${sid}`);
      }
      // 리모컨이 나가면 다시 연결 가능하게
      else if (info.remoteSocket === socket.id) {
        info.remoteConnected = false;
        info.remoteSocket = null;
        io.to(info.presenter).emit('remote-disconnected');
        console.log(`[리모컨 해제] ${sid}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`SlideCue 서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});