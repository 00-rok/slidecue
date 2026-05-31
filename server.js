// SlideCue 서버: 리모컨 중계 + 실시간 Q&A
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// 폰 리모컨: /r/:sessionId
app.get('/r/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'remote.html'));
});

// 청중 Q&A: /q/:sessionId
app.get('/q/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qna.html'));
});

// 세션 저장: { sessionId: { presenter, questions: [] } }
const sessions = {};

io.on('connection', (socket) => {
  // PC 발표자가 세션 생성
  socket.on('create-session', (sessionId) => {
    sessions[sessionId] = { presenter: socket.id, questions: [] };
    socket.join(sessionId);
    console.log(`[세션 생성] ${sessionId}`);
  });

  // 폰 리모컨이 참여
  socket.on('join-session', (sessionId) => {
    if (!sessions[sessionId]) {
      socket.emit('session-error', '세션을 찾을 수 없습니다');
      return;
    }
    socket.join(sessionId);
    io.to(sessions[sessionId].presenter).emit('remote-connected');
    // 리모컨에게 현재까지 쌓인 질문 목록 전달
    socket.emit('questions-update', sessions[sessionId].questions);
    console.log(`[리모컨 연결] ${sessionId}`);
  });

  // 청중이 Q&A 화면에 참여
  socket.on('join-qna', (sessionId) => {
    if (!sessions[sessionId]) {
      socket.emit('session-error', '세션을 찾을 수 없습니다');
      return;
    }
    socket.join(sessionId);
    // 참여 즉시 현재 질문 목록 전달
    socket.emit('questions-update', sessions[sessionId].questions);
    console.log(`[청중 연결] ${sessionId}`);
  });

  // 리모컨 컨트롤 (슬라이드/레이저)
  socket.on('control', ({ sessionId, action, payload }) => {
    if (!sessions[sessionId]) return;
    io.to(sessions[sessionId].presenter).emit('control', { action, payload });
  });

  // 청중이 질문 제출
  socket.on('submit-question', ({ sessionId, text }) => {
    const s = sessions[sessionId];
    if (!s || !text || !text.trim()) return;
    const question = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      text: text.trim().substring(0, 300), // 최대 300자
      likes: 0,
      time: Date.now()
    };
    s.questions.push(question);
    // 세션 안 모두에게 갱신된 목록 전파
    io.to(sessionId).emit('questions-update', s.questions);
    console.log(`[질문 등록] ${sessionId}: ${question.text}`);
  });

  // 질문 좋아요
  socket.on('like-question', ({ sessionId, questionId }) => {
    const s = sessions[sessionId];
    if (!s) return;
    const q = s.questions.find(q => q.id === questionId);
    if (q) {
      q.likes++;
      io.to(sessionId).emit('questions-update', s.questions);
    }
  });

  socket.on('disconnect', () => {
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