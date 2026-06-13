const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 存储聊天记录（最多100条）
let messageHistory = [];
const MAX_HISTORY = 100;

// 存储在线用户 { socketId: username }
let onlineUsers = {};

// 提供静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 所有路由都返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 新用户加入
  socket.on('user join', (username) => {
    // 处理用户名
    if (!username || username.trim() === '') {
      username = '匿名用户';
    }
    username = username.trim().substring(0, 20);
    
    // 如果用户名已被占用，加上随机后缀
    let finalUsername = username;
    let suffix = 1;
    while (Object.values(onlineUsers).includes(finalUsername)) {
      finalUsername = `${username}_${suffix}`;
      suffix++;
    }
    
    socket.username = finalUsername;
    onlineUsers[socket.id] = finalUsername;
    
    // 发送历史消息给新用户
    socket.emit('chat history', messageHistory);
    
    // 广播用户加入消息
    io.emit('system message', {
      type: 'system',
      username: '系统',
      content: `${finalUsername} 加入了聊天室`,
      time: getCurrentTime()
    });
    
    // 更新在线人数和列表
    broadcastUserList();
  });
  
  // 处理聊天消息
  socket.on('chat message', (data) => {
    const content = data.content.trim();
    if (content === '') return;
    
    const message = {
      type: 'user',
      username: socket.username,
      content: escapeHtml(content),
      time: getCurrentTime(),
      userId: socket.id
    };
    
    // 存储到历史记录
    messageHistory.push(message);
    if (messageHistory.length > MAX_HISTORY) {
      messageHistory.shift();
    }
    
    // 广播消息给所有人
    io.emit('chat message', message);
  });
  
  // 用户正在输入
  socket.on('typing', (isTyping) => {
    socket.broadcast.emit('user typing', {
      username: socket.username,
      isTyping: isTyping
    });
  });
  
  // 用户断开连接
  socket.on('disconnect', () => {
    if (socket.username) {
      io.emit('system message', {
        type: 'system',
        username: '系统',
        content: `${socket.username} 离开了聊天室`,
        time: getCurrentTime()
      });
      
      delete onlineUsers[socket.id];
      broadcastUserList();
    }
    console.log('用户断开:', socket.id);
  });
});

// 广播在线用户列表和人数
function broadcastUserList() {
  const userList = Object.values(onlineUsers);
  io.emit('user count', userList.length);
  io.emit('user list', userList);
}

// 获取当前时间（时:分）
function getCurrentTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
}

// 防XSS攻击
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`聊天室服务器运行在 http://localhost:${PORT}`);
});